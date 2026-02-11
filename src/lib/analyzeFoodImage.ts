/**
 * Shared food image analysis pipeline with compression, upload, analysis, and retry.
 */
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from './imageCompression';

export type AnalysisStep = 'compressing' | 'uploading' | 'analyzing' | 'done' | 'error';

export const STEP_LABELS: Record<AnalysisStep, string> = {
  compressing: 'Compressing image…',
  uploading: 'Uploading photo…',
  analyzing: 'Analyzing food with AI…',
  done: 'Done!',
  error: 'Analysis failed',
};

/** Custom error that preserves the user-facing message from the edge function. */
export class FoodAnalysisError extends Error {
  constructor(message: string, public readonly userMessage: string) {
    super(message);
    this.name = 'FoodAnalysisError';
  }
}

export interface FoodAnalysis {
  foods: { name: string; portion: string; calories: number; protein?: number; carbs?: number; fat?: number }[];
  total_calories: number;
  total_protein?: number;
  total_carbs?: number;
  total_fat?: number;
  confidence: number;
  description: string;
  food_quality?: string;
}

interface AnalyzeResult {
  analysis: FoodAnalysis;
  publicUrl: string;
}

const OVERALL_TIMEOUT_MS = 45_000; // 45s max for the entire pipeline
const SIGNED_URL_TTL_SECONDS = 5 * 60; // 5 minutes
const MAX_ANALYSIS_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function getFunctionUserMessage(error: unknown): Promise<string | null> {
  if (!error || typeof error !== 'object') return null;

  const maybeContext = (error as { context?: { json?: () => Promise<unknown> } }).context;
  if (!maybeContext?.json) return null;

  try {
    const body = await maybeContext.json();
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      return body.error;
    }
  } catch {
    // ignore parse failures and use default message
  }

  return null;
}

export async function analyzeFoodImage(
  file: File,
  userId: string,
  onStep: (step: AnalysisStep) => void,
): Promise<AnalyzeResult> {
  // Race the entire pipeline against an overall timeout
  return Promise.race([
    doAnalyze(file, userId, onStep),
    new Promise<never>((_, reject) =>
      setTimeout(() => {
        onStep('error');
        reject(new Error('Image analysis timed out. Please try again.'));
      }, OVERALL_TIMEOUT_MS)
    ),
  ]);
}

async function doAnalyze(
  file: File,
  userId: string,
  onStep: (step: AnalysisStep) => void,
): Promise<AnalyzeResult> {
  let filePath = '';
  let publicUrl = '';

  try {
    // Step 1: Compress
    onStep('compressing');
    let compressed: File;
    try {
      compressed = await compressImage(file);
    } catch (compressErr) {
      console.warn('Compression failed, using original file:', compressErr);
      compressed = file; // fallback to original
    }

    if (compressed.size > MAX_ANALYSIS_IMAGE_BYTES) {
      throw new FoodAnalysisError(
        'Image too large for analysis request',
        'Image is too large after compression. Please use a smaller or lower-resolution photo.'
      );
    }

    // Step 2: Upload + signed URL
    onStep('uploading');
    filePath = `${userId}/${Date.now()}-${compressed.name}`;

    const { error: uploadError } = await supabase.storage
      .from('meal-photos')
      .upload(filePath, compressed);

    if (uploadError) {
      throw new FoodAnalysisError(uploadError.message, 'Could not upload image. Please try again.');
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('meal-photos')
      .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new FoodAnalysisError(
        signedUrlError?.message || 'Could not create signed URL',
        'Could not prepare image for analysis. Please try again.'
      );
    }

    const signedUrl = signedUrlData.signedUrl;
    const { data: publicUrlData } = supabase.storage
      .from('meal-photos')
      .getPublicUrl(filePath);
    publicUrl = publicUrlData.publicUrl;

    // Step 3: Analyze (single retry)
    onStep('analyzing');
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('analyze-food', {
          body: { imageUrl: signedUrl },
        });

        if (error) {
          const userMessage = (await getFunctionUserMessage(error)) || 'Could not analyze image.';
          throw new FoodAnalysisError(getErrorMessage(error), userMessage);
        }

        if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
          throw new FoodAnalysisError(data.error, data.error);
        }

        onStep('done');
        return { analysis: data as FoodAnalysis, publicUrl };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Analysis attempt ${attempt + 1} failed:`, lastError.message);

        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          onStep('analyzing');
        }
      }
    }

    onStep('error');
    throw lastError || new FoodAnalysisError('Analysis failed', 'Could not analyze image. Please try again.');
  } catch (err) {
    onStep('error');
    throw err;
  } finally {
    if (filePath) {
      const { error: removeError } = await supabase.storage.from('meal-photos').remove([filePath]);
      if (removeError) {
        console.warn('Could not remove temporary meal photo:', removeError.message);
      }
    }
  }
}

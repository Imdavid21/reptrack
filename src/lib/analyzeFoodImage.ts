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
  foods: { name: string; portion: string; calories: number; protein?: number; carbs?: number; fat?: number; fiber?: number; sugar?: number; sodium?: number; potassium?: number; caffeine?: number }[];
  total_calories: number;
  total_protein?: number;
  total_carbs?: number;
  total_fat?: number;
  total_fiber?: number;
  total_sugar?: number;
  total_sodium?: number;
  total_potassium?: number;
  total_caffeine?: number;
  confidence: number;
  description: string;
  food_quality?: string;
}

interface AnalyzeResult {
  analysis: FoodAnalysis;
  /** Signed, time-limited URL for the uploaded photo (bucket is private). */
  publicUrl: string;
}

// Meal photos live in a private bucket. We mint a long-lived signed URL so the
// image stays displayable in history without exposing the whole bucket to the
// public internet (the previous behaviour, which leaked every user's photos).
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year

// The analyze-food model reasons over the image before answering (more detail =
// more accurate identification), which runs meaningfully slower than a plain
// vision call - give the pipeline enough headroom that a legitimate slow
// analysis doesn't get cut off mid-flight.
const OVERALL_TIMEOUT_MS = 75_000;

export async function analyzeFoodImage(
  file: File,
  userId: string,
  onStep: (step: AnalysisStep) => void,
  contextHint?: string,
): Promise<AnalyzeResult> {
  // Race the entire pipeline against an overall timeout
  return Promise.race([
    doAnalyze(file, userId, onStep, contextHint),
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
  contextHint?: string,
): Promise<AnalyzeResult> {
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

    // Step 2: Upload
    onStep('uploading');
    const fileName = `${userId}/${Date.now()}-${compressed.name}`;
    const { error: uploadError } = await supabase.storage
      .from('meal-photos')
      .upload(fileName, compressed);

    if (uploadError) throw uploadError;

    const { data: signed, error: signedError } = await supabase.storage
      .from('meal-photos')
      .createSignedUrl(fileName, SIGNED_URL_TTL_SECONDS);

    if (signedError || !signed?.signedUrl) {
      throw signedError || new Error('Could not generate a URL for the uploaded photo.');
    }
    const publicUrl = signed.signedUrl;

    // Step 3: Analyze (with 1 retry)
    onStep('analyzing');
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-food`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ imageUrl: publicUrl, context: contextHint }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          const userMessage = data?.error || `Analysis failed (${response.status})`;
          console.error('analyze-food HTTP error:', response.status, data);
          throw new FoodAnalysisError(userMessage, userMessage);
        }
        if (data?.error) throw new FoodAnalysisError(data.error, data.error);

        onStep('done');
        return { analysis: data as FoodAnalysis, publicUrl };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Analysis attempt ${attempt + 1} failed:`, lastError.message);
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 1500));
          onStep('analyzing');
        }
      }
    }

    onStep('error');
    throw lastError || new FoodAnalysisError('Analysis failed', 'Could not analyze image. Please try again.');
  } catch (err) {
    onStep('error');
    throw err;
  }
}

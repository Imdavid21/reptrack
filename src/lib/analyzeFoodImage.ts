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

    const { data: { publicUrl } } = supabase.storage
      .from('meal-photos')
      .getPublicUrl(fileName);

    // Step 3: Analyze (with 1 retry)
    onStep('analyzing');
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('analyze-food', {
          body: { imageUrl: publicUrl },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

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
    throw lastError || new Error('Analysis failed');
  } catch (err) {
    onStep('error');
    throw err;
  }
}

/**
 * Client-side image compression utility.
 * Resizes images to max 1024px and compresses as JPEG to reduce upload size.
 */

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.75;
const COMPRESSION_TIMEOUT_MS = 15_000;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function compressImage(file: File): Promise<File> {
  // Reject obviously oversized files early
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 20MB.`);
  }

  return Promise.race([
    doCompress(file),
    new Promise<File>((_, reject) =>
      setTimeout(() => reject(new Error('Image compression timed out')), COMPRESSION_TIMEOUT_MS)
    ),
  ]);
}

function doCompress(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Skip compression if already small enough
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.size < 200_000) {
        resolve(file);
        return;
      }

      // Scale down maintaining aspect ratio
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fallback to original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original on error
    };

    img.src = url;
  });
}

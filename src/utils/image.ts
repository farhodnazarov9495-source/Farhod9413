/**
 * Image compression and scaling helper.
 * Automatically resizes and compresses user-uploaded images before storing in state.
 * Supports center cropping to 1x1 square format for products, stores, categories, and partners,
 * and high quality resolution for banners.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  cropToSquare?: boolean;
}

export const compressImage = (
  file: File,
  maxWidthOrOptions: number | CompressImageOptions = 800,
  maxHeight = 800,
  quality = 0.90
): Promise<string> => {
  let targetWidth = 800;
  let targetHeight = 800;
  let targetQuality = 0.90;
  let cropToSquare = true;

  if (typeof maxWidthOrOptions === 'object') {
    targetWidth = maxWidthOrOptions.maxWidth || 800;
    targetHeight = maxWidthOrOptions.maxHeight || 800;
    targetQuality = maxWidthOrOptions.quality ?? 0.90;
    cropToSquare = maxWidthOrOptions.cropToSquare ?? true;
  } else {
    targetWidth = maxWidthOrOptions;
    targetHeight = maxHeight;
    targetQuality = quality;
    // If width === height (e.g., 800x800 or 300x300), default cropToSquare to true
    cropToSquare = targetWidth === targetHeight;
  }

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error("File is not an image"));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        if (cropToSquare) {
          // Center crop to 1:1 ratio and scale to targetWidth x targetHeight
          const sourceSize = Math.min(img.width, img.height);
          const sourceX = (img.width - sourceSize) / 2;
          const sourceY = (img.height - sourceSize) / 2;

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Draw cropped 1:1 image
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            targetWidth,
            targetHeight
          );
        } else {
          // Scale preserving original aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > targetWidth) {
              height = Math.round((height * targetWidth) / width);
              width = targetWidth;
            }
          } else {
            if (height > targetHeight) {
              width = Math.round((width * targetHeight) / height);
              height = targetHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', targetQuality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};


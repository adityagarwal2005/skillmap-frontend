// Shared guardrails for every image/video picker in the app (messages, jobs,
// collabs, posts, avatar). Without this, a raw phone photo/video (10-50MB+)
// could hang or fail to upload on mobile data, and burns through Cloudinary's
// free-tier bandwidth fast. Images are auto-compressed client-side (resized +
// re-encoded via canvas) before the size check; videos aren't — client-side
// video transcoding needs a much heavier library than is worth adding here —
// so oversized videos are just rejected with a clear message.

export const MAX_IMAGE_MB = 8;
export const MAX_VIDEO_MB = 50;

const isImage = (file) => file.type.startsWith('image/');
const isVideo = (file) => file.type.startsWith('video/');

// Resize + re-encode an image via canvas. Skips already-small files and
// non-photographic formats (gif/svg) where recompressing would break
// animation or throw away vector precision for no benefit.
async function compressImage(file, maxDimension, quality) {
  if (file.size < 1.5 * 1024 * 1024) return file;
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // browser couldn't decode it — fall back to the original
  }

  let { width, height } = bitmap;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob || blob.size >= file.size) return file; // compression didn't help

  const newName = file.name.replace(/\.\w+$/, '') + '.jpg';
  return new File([blob], newName, { type: 'image/jpeg' });
}

/**
 * Validate + (for images) compress a picked file. Returns the file to use,
 * or null if it was rejected (showToast is called with why).
 * opts: { maxDimension = 1600, quality = 0.82, maxImageMB, maxVideoMB }
 */
export async function prepareMediaFile(file, showToast, opts = {}) {
  if (!file) return null;
  const maxImageMB = opts.maxImageMB ?? MAX_IMAGE_MB;
  const maxVideoMB = opts.maxVideoMB ?? MAX_VIDEO_MB;
  const maxDimension = opts.maxDimension ?? 1600;
  const quality = opts.quality ?? 0.82;

  if (isVideo(file)) {
    if (file.size > maxVideoMB * 1024 * 1024) {
      showToast?.(`That video is too large (max ${maxVideoMB}MB) — try a shorter clip.`, 'error');
      return null;
    }
    return file;
  }

  if (isImage(file)) {
    const prepared = await compressImage(file, maxDimension, quality);
    if (prepared.size > maxImageMB * 1024 * 1024) {
      showToast?.(`That image is too large (max ${maxImageMB}MB) even after compression.`, 'error');
      return null;
    }
    return prepared;
  }

  showToast?.('Unsupported file type — please choose an image or video.', 'error');
  return null;
}

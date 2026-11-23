export async function createThumbnailDataUrl(
  blob: Blob,
  maxWidth = 360,
  maxHeight = 520,
): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const ratio = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
    const targetW = Math.max(1, Math.round(bitmap.width * ratio));
    const targetH = Math.max(1, Math.round(bitmap.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.84);
  } catch {
    return null;
  }
}

export async function readImageDimensions(
  blob: Blob,
): Promise<{width: number; height: number} | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const dims = {width: bitmap.width, height: bitmap.height};
    bitmap.close();
    return dims;
  } catch {
    return null;
  }
}

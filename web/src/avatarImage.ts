/**
 * Turns a picked photo into a small square JPEG for a profile picture:
 * centre-cropped and 320×320, so even a 12 MB phone photo uploads as
 * ~30 KB. Goes through an <img>, which applies the photo's rotation and
 * (in Safari) reads iPhone HEIC photos too.
 */
const SIZE = 320;

export async function squareAvatar(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode().catch(() => {
      throw new Error("That picture couldn't be opened — try a JPEG or PNG.");
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      SIZE,
      SIZE,
    );
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error("That picture couldn't be processed.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

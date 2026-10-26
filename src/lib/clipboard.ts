export async function copyText(text: string): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) throw new Error();
    await navigator.clipboard.writeText(text);
  } catch {
    throw new Error("Kopyalanamadı. Tarayıcının pano iznini kontrol edip tekrar deneyin.");
  }
}

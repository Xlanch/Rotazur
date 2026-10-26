/** The browser callback must settle the operation; async callback errors otherwise escape callers. */
export function canvasPng(canvas: Pick<HTMLCanvasElement, "toBlob">): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Görsel oluşturulamadı. Tekrar deneyin."));
    }, "image/png");
  });
}

import { createWorker, OEM, type Worker } from "tesseract.js";

/**
 * Starts a text recognition worker for German and English. All files come
 * from this site (see scripts/copy-ocr-assets.mjs); the image never leaves
 * the browser.
 */
export function createOcrWorker(): Promise<Worker> {
  const base = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.href).href;
  return createWorker(["deu", "eng"], OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}core`,
    langPath: `${base}lang`,
    workerBlobURL: false,
    gzip: true,
    cacheMethod: "none",
  });
}

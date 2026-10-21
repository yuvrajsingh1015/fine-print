// The legacy build includes polyfills; the modern one needs very recent
// browsers (it calls Map.prototype.getOrInsertComputed when rendering).
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { cleanPdfText, joinBrokenParagraphs } from "./pdftext";

GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfErrorCode = "not_pdf" | "too_large" | "no_text" | "ocr_failed" | "failed";

export class PdfError extends Error {
  code: PdfErrorCode;
  constructor(code: PdfErrorCode) {
    super(code);
    this.code = code;
  }
}

export interface PdfResult {
  text: string;
  /** true if the PDF was a scan and its text came from text recognition */
  ocr: boolean;
  /** pages left out because scans longer than MAX_OCR_PAGES are cut off */
  skippedPages: number;
}

export interface OcrProgress {
  page: number;
  pages: number;
}

const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_OCR_PAGES = 20;
// render scale for recognition: about 150 dpi for an A4 page
const OCR_SCALE = 2;

function hasText(text: string): boolean {
  return text.replace(/\s/g, "").length >= 20;
}

async function textLayer(pdf: PDFDocumentProxy): Promise<string> {
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      text += item.str + (item.hasEOL ? "\n" : "");
    }
    pages.push(text.trim());
  }
  return pages.filter(Boolean).join("\n\n");
}

async function recognise(
  pdf: PDFDocumentProxy,
  pages: number,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  const { createOcrWorker } = await import("./ocr");
  const worker = await createOcrWorker();
  try {
    const out: string[] = [];
    for (let n = 1; n <= pages; n++) {
      onProgress?.({ page: n, pages });
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: OCR_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      out.push(data.text.trim());
      page.cleanup();
    }
    return out.filter(Boolean).join("\n\n");
  } finally {
    await worker.terminate();
  }
}

/**
 * Reads the text of a PDF. If it has no text layer (a scan), the pages are
 * rendered and run through text recognition. Everything runs locally.
 */
export async function extractPdfText(
  file: File,
  onOcrProgress?: (p: OcrProgress) => void,
): Promise<PdfResult> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new PdfError("not_pdf");
  }
  if (file.size > MAX_BYTES) throw new PdfError("too_large");

  let task;
  let pdf: PDFDocumentProxy;
  try {
    task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    pdf = await task.promise;
  } catch {
    throw new PdfError("failed");
  }

  try {
    let text: string;
    try {
      text = cleanPdfText(await textLayer(pdf));
    } catch {
      throw new PdfError("failed");
    }
    if (hasText(text)) return { text, ocr: false, skippedPages: 0 };

    const pages = Math.min(pdf.numPages, MAX_OCR_PAGES);
    try {
      text = cleanPdfText(joinBrokenParagraphs(await recognise(pdf, pages, onOcrProgress)));
    } catch {
      throw new PdfError("ocr_failed");
    }
    if (!hasText(text)) throw new PdfError("no_text");
    return { text, ocr: true, skippedPages: pdf.numPages - pages };
  } finally {
    await task.destroy();
  }
}

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { cleanPdfText } from "./pdftext";

GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfErrorCode = "not_pdf" | "too_large" | "no_text" | "failed";

export class PdfError extends Error {
  code: PdfErrorCode;
  constructor(code: PdfErrorCode) {
    super(code);
    this.code = code;
  }
}

const MAX_BYTES = 20 * 1024 * 1024;

/** Extracts the text layer of every page. Runs locally, nothing is uploaded. */
export async function extractPdfText(file: File): Promise<string> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new PdfError("not_pdf");
  }
  if (file.size > MAX_BYTES) throw new PdfError("too_large");

  let pages: string[];
  try {
    const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await task.promise;
    pages = [];
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
    await task.destroy();
  } catch {
    throw new PdfError("failed");
  }

  const text = cleanPdfText(pages.filter(Boolean).join("\n\n"));
  if (text.replace(/\s/g, "").length < 20) throw new PdfError("no_text");
  return text;
}

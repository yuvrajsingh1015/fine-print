// Copies the OCR engine and language data from node_modules into public/ocr,
// so scanned PDFs are recognised with files served by this site (no CDN).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = (name) => dirname(require.resolve(`${name}/package.json`));
const out = join(import.meta.dirname, "..", "public", "ocr");

const files = [
  [join(pkg("tesseract.js"), "dist", "worker.min.js"), "worker.min.js"],
  ...["", "simd-", "relaxedsimd-"].map((v) => [
    join(pkg("tesseract.js-core"), `tesseract-core-${v}lstm.wasm.js`),
    `core/tesseract-core-${v}lstm.wasm.js`,
  ]),
  ...["eng", "deu"].map((lang) => [
    join(pkg(`@tesseract.js-data/${lang}`), "4.0.0_best_int", `${lang}.traineddata.gz`),
    `lang/${lang}.traineddata.gz`,
  ]),
];

for (const [from, to] of files) {
  mkdirSync(dirname(join(out, to)), { recursive: true });
  copyFileSync(from, join(out, to));
}
console.log(`OCR assets copied to public/ocr (${files.length} files)`);

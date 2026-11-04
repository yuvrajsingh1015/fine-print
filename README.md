# Fine Print

Understand the key terms of a contract before you agree to them.
Live at **[yuvrajsingh.de/fine-print](https://yuvrajsingh.de/fine-print/)**.

Paste a contract or terms of service, or drop in a PDF, and Fine Print
highlights the clauses that matter, sorts them by how much they can affect
you and explains each one in plain language. Works for English and German.

## What it finds

- Auto-renewal, notice periods and minimum terms
- Price, pay and terms changes; fees and penalties
- Data sharing, tracking and cookies
- Arbitration and legal waivers, liability limits
- Suspension and termination
- Employment contracts: claim deadlines (Ausschlussfristen), working hours
  and shifts, side jobs and competition

Every finding is shown in place in the text, with a severity (high, medium,
low) and a short explanation.

## How it works

- **Rule-based scan, in the browser.** A set of regular-expression rules per
  category (`src/rules.ts`) runs locally. The text never leaves your device.
- **PDF and scans.** Text PDFs are read with pdf.js; scanned pages fall back
  to OCR with Tesseract.js (English and German).
- **Optional deep check.** On request, the text is sent to a small
  Cloudflare Worker (`worker/`) that asks Gemini for a structured analysis.
  The API key stays on the server, requests are rate-limited per IP (stored
  only as an hourly hash), and nothing is logged. Every quote the model
  returns is checked against the original text; findings that aren't really
  in the contract are dropped.
- **Tested** against a corpus of 20 real-world style contracts in both
  languages (`src/corpus/`), plus unit tests for the analysis, highlighting
  and PDF text handling.

## Stack

React, TypeScript, Vite, Tailwind CSS, pdf.js, Tesseract.js, Vitest, oxlint.
Deep check: Cloudflare Workers, Gemini API. Deployed to GitHub Pages with
GitHub Actions.

## Run locally

```bash
npm install
npm run dev     # app on http://localhost:5173
npm test        # unit and corpus tests
```

The deep check needs the worker running (`cd worker && npm install && npx wrangler dev`)
with a `GEMINI_API_KEY` secret; the rest of the app works without it.

## Note

Fine Print points out clauses worth reading carefully. It is not legal advice.

## License

MIT

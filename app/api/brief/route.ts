// POST /api/brief  (multipart form, field `file`)
// Reads the text out of a company brief (PDF, .txt or .md) and returns it.
// Nothing is stored here: the dashboard keeps the text with the seller brief
// and copies it onto each new lead.

import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { BRIEF_MAX_BYTES, BRIEF_MAX_CHARS } from "@/lib/brief";

export const maxDuration = 30;

const MAX_PAGES = 60;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function tidy(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return fail("Choose a file to upload.", 400);
    }
    if (file.size === 0) {
      return fail("That file is empty.", 400);
    }
    if (file.size > BRIEF_MAX_BYTES) {
      return fail("That file is over 10 MB. Upload a smaller one.", 413);
    }

    const name = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const isText =
      file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md");
    if (!isPdf && !isText) {
      return fail("Upload a PDF or a plain text file.", 415);
    }

    let text: string;
    let pages: number | null = null;
    if (isPdf) {
      let pdf;
      try {
        pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
      } catch {
        return fail("That PDF could not be opened. Check it is not damaged or password-protected.", 422);
      }
      if (pdf.numPages > MAX_PAGES) {
        return fail(`That PDF has ${pdf.numPages} pages. Upload one with ${MAX_PAGES} or fewer.`, 413);
      }
      const result = await extractText(pdf, { mergePages: true });
      pages = result.totalPages;
      text = tidy(result.text);
      if (!text) {
        return fail(
          "No text was found in that PDF. It may be a scan; upload a text-based PDF or paste the details into your pitch.",
          422,
        );
      }
    } else {
      text = tidy(await file.text());
      if (!text) return fail("That file has no text in it.", 422);
    }

    const truncated = text.length > BRIEF_MAX_CHARS;
    return NextResponse.json({
      fileName: file.name,
      pages,
      truncated,
      text: truncated ? text.slice(0, BRIEF_MAX_CHARS) : text,
    });
  } catch (e) {
    console.error("[brief]", e);
    return fail(e instanceof Error ? e.message : String(e), 500);
  }
}

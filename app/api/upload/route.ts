import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { makeDoc, buildGraph, titleFromFiles } from "@/lib/ingest";
import { saveSession } from "@/lib/store";
import type { Doc, Session } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = /\.(csv|md|markdown|txt|json|tsv)$/i;

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const title = (form.get("title") as string) || "";

  if (!files.length) {
    return NextResponse.json({ error: "no files uploaded" }, { status: 400 });
  }

  const docs: Doc[] = [];
  for (const file of files) {
    if (!ALLOWED.test(file.name)) continue;
    const text = await file.text();
    docs.push(makeDoc(file.name, text));
  }
  if (!docs.length) {
    return NextResponse.json(
      { error: "no supported files (accepted: .csv .md .txt .json .tsv)" },
      { status: 400 }
    );
  }

  const fileNames = docs.map((d) => d.name);
  const session: Session = {
    id: nanoid(10),
    title: title.trim() || titleFromFiles(fileNames),
    createdAt: Date.now(),
    fileNames,
    docs,
    graph: buildGraph(docs),
    messages: [],
  };
  await saveSession(session);
  return NextResponse.json({ id: session.id, title: session.title, fileNames });
}

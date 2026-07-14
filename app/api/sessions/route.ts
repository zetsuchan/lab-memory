import { NextResponse } from "next/server";
import { listSessions, storageBackend } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const sessions = await listSessions();
  return NextResponse.json({ sessions, storage: storageBackend });
}

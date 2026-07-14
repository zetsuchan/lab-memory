import { promises as fs } from "node:fs";
import path from "node:path";
import type { Session, SessionMeta } from "./types";
import { toMeta } from "./types";

/**
 * Session storage with two backends chosen at runtime:
 *  - Postgres (when POSTGRES_URL is set — i.e. on Vercel with the Neon/Postgres
 *    integration): one JSONB row per session. Required in production because
 *    serverless filesystems don't persist.
 *  - Local file store (default for `npm run dev`): JSON files under .data/.
 */

const usePg = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

// ---------- file backend ----------
const DATA_DIR = path.join(process.cwd(), ".data", "sessions");
async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}
const fileStore = {
  async list(): Promise<SessionMeta[]> {
    await ensureDir();
    const files = (await fs.readdir(DATA_DIR)).filter((f) => f.endsWith(".json"));
    const metas: SessionMeta[] = [];
    for (const f of files) {
      try {
        const s = JSON.parse(await fs.readFile(path.join(DATA_DIR, f), "utf8")) as Session;
        metas.push(toMeta(s));
      } catch {
        /* skip corrupt */
      }
    }
    return metas.sort((a, b) => b.createdAt - a.createdAt);
  },
  async get(id: string): Promise<Session | null> {
    try {
      return JSON.parse(await fs.readFile(path.join(DATA_DIR, `${id}.json`), "utf8")) as Session;
    } catch {
      return null;
    }
  },
  async save(s: Session): Promise<void> {
    await ensureDir();
    await fs.writeFile(path.join(DATA_DIR, `${s.id}.json`), JSON.stringify(s), "utf8");
  },
  async remove(id: string): Promise<void> {
    await fs.rm(path.join(DATA_DIR, `${id}.json`), { force: true });
  },
};

// ---------- postgres backend ----------
let pgReady: Promise<void> | null = null;
async function pgInit() {
  const { sql } = await import("@vercel/postgres");
  await sql`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at BIGINT NOT NULL,
    data JSONB NOT NULL
  )`;
}
async function pg() {
  const mod = await import("@vercel/postgres");
  if (!pgReady) pgReady = pgInit();
  await pgReady;
  return mod.sql;
}
const pgStore = {
  async list(): Promise<SessionMeta[]> {
    const sql = await pg();
    const { rows } = await sql`SELECT data FROM sessions ORDER BY created_at DESC`;
    return rows.map((r) => toMeta(r.data as Session));
  },
  async get(id: string): Promise<Session | null> {
    const sql = await pg();
    const { rows } = await sql`SELECT data FROM sessions WHERE id = ${id}`;
    return rows.length ? (rows[0].data as Session) : null;
  },
  async save(s: Session): Promise<void> {
    const sql = await pg();
    const json = JSON.stringify(s);
    await sql`INSERT INTO sessions (id, created_at, data) VALUES (${s.id}, ${s.createdAt}, ${json}::jsonb)
      ON CONFLICT (id) DO UPDATE SET data = ${json}::jsonb`;
  },
  async remove(id: string): Promise<void> {
    const sql = await pg();
    await sql`DELETE FROM sessions WHERE id = ${id}`;
  },
};

const backend = usePg ? pgStore : fileStore;

export const listSessions = () => backend.list();
export const getSession = (id: string) => backend.get(id);
export const saveSession = (s: Session) => backend.save(s);
export const deleteSession = (id: string) => backend.remove(id);
export const storageBackend = usePg ? "postgres" : "file";

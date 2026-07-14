import { z } from "zod";

/** The structured answer Claude streams back. Shared by server (streamObject)
 *  and client (experimental_useObject) so the UI is typed end-to-end. */
export const answerSchema = z.object({
  intent: z
    .enum(["explain", "compare", "recommend", "summarize", "search"])
    .describe("The kind of question being answered."),
  summary: z.string().describe("A direct 1-2 sentence answer to the question."),
  steps: z
    .array(z.string())
    .describe("The reasoning/evidence chain — each item a full sentence grounded in the corpus."),
  recommendation: z
    .string()
    .nullable()
    .describe("A concrete recommended next step, or null if not applicable."),
  citations: z
    .array(
      z.object({
        source: z.string().describe("Exact source file name the claim came from."),
        detail: z.string().describe("What this source contributes to the answer."),
      })
    )
    .describe("Sources actually used, grounding the answer."),
  followups: z
    .array(z.string())
    .describe("3-5 sharp follow-up questions this corpus can answer."),
});

export type Answer = z.infer<typeof answerSchema>;

export type DocKind = "markdown" | "csv" | "text";

export interface Doc {
  name: string;
  kind: DocKind;
  text: string;
  columns?: string[];
  rows?: Record<string, string>[];
}

export interface GraphNode {
  id: string;
  label: string;
  kind: string;
}
export interface GraphEdge {
  src: string;
  dst: string;
  rel: string;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  question?: string;
  answer?: Answer;
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  fileNames: string[];
  docs: Doc[];
  graph: GraphData;
  messages: ChatMessage[];
}

/** Lightweight session summary for the sidebar (no heavy docs). */
export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  fileNames: string[];
  messageCount: number;
}

export function toMeta(s: Session): SessionMeta {
  return {
    id: s.id,
    title: s.title,
    createdAt: s.createdAt,
    fileNames: s.fileNames,
    messageCount: s.messages.length,
  };
}

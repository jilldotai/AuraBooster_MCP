import { Firestore } from "@google-cloud/firestore";

export type AuditEvent = {
  id?: string; at: string; actor: "agent" | "human" | "system"; type: string;
  status: "created" | "completed" | "requires_approval" | "blocked" | "failed";
  inputClass: string; summary: string; businessId?: string; artifactId?: string; metadata?: Record<string, unknown>;
};

const memory: AuditEvent[] = [];
const firestore = process.env.GOOGLE_CLOUD_PROJECT ? new Firestore() : undefined;

export async function audit(event: Omit<AuditEvent, "at">): Promise<AuditEvent> {
  const full = { ...event, at: new Date().toISOString() };
  if (firestore) await firestore.collection("auditEvents").add(full);
  else memory.unshift(full);
  return full;
}

export async function recentAudit(limit = 50): Promise<AuditEvent[]> {
  if (firestore) {
    const snap = await firestore.collection("auditEvents").orderBy("at", "desc").limit(limit).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditEvent));
  }
  return memory.slice(0, limit);
}

import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "ora-agent-data");
const LOGS_FILE = path.join(DATA_DIR, "activity_logs.json");
const CAMPAIGNS_FILE = path.join(DATA_DIR, "campaigns.json");
const HACKATHON_DOC_FILE = path.join(DATA_DIR, "XPRIZE_HACKATHON_PROGRESS.md");
const MILESTONES_FILE = path.join(DATA_DIR, "milestones.json");

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: "marketing_generated" | "milestone_recorded" | "xprize_doc_updated" | "campaign_exported";
  summary: string;
  details?: unknown;
}

export interface SavedCampaign {
  id: string;
  timestamp: string;
  brand: string;
  topic: string;
  channel: "x_twitter" | "linkedin" | "threads" | "community" | "multi_channel";
  tone: string;
  content: {
    hook?: string;
    post?: string;
    thread?: string[];
    hashtags?: string[];
    callToAction?: string;
  };
}

export interface Milestone {
  id: string;
  timestamp: string;
  category: "feature" | "experiment" | "metric" | "hackathon_submission" | "marketing_blast";
  title: string;
  description: string;
  metrics?: Record<string, string | number>;
}

async function ensureDirectory(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  // Ensure files exist
  try { await fs.access(LOGS_FILE); } catch { await fs.writeFile(LOGS_FILE, JSON.stringify([], null, 2), "utf-8"); }
  try { await fs.access(CAMPAIGNS_FILE); } catch { await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify([], null, 2), "utf-8"); }
  try { await fs.access(MILESTONES_FILE); } catch { await fs.writeFile(MILESTONES_FILE, JSON.stringify([], null, 2), "utf-8"); }
  try {
    await fs.access(HACKATHON_DOC_FILE);
  } catch {
    const initialDoc = `# Ora & Jill - Build with Gemini XPRIZE Progress Tracker\n\n` +
      `*Maintained autonomously by the Ora Marketing & XPRIZE Documentation Agent.*\n\n` +
      `## 🚀 Project Overview\n` +
      `- **Brand & Initiative**: Ora Marketing & Jill Revenue Agent\n` +
      `- **Competition**: Build with Gemini XPRIZE (Small Business Services)\n` +
      `- **Last Updated**: ${new Date().toISOString()}\n\n` +
      `## 📊 Milestones & Logged Progress\n` +
      `*No milestones recorded yet. Run the agent or add via the Ora Dashboard.*\n\n` +
      `## 📱 Marketing & Growth Signals\n` +
      `*Campaign logs and distribution tracking will appear here.*\n\n` +
      `## 📝 Submission Checklist & Evidence References\n` +
      `- [x] Independent Growth & Documentation Agent active\n` +
      `- [ ] Vertex AI / Gemini 2.5 latency benchmarks logged\n` +
      `- [ ] Live pilot and revenue metrics updated\n` +
      `- [ ] Demo video & marketing assets finalized\n`;
    await fs.writeFile(HACKATHON_DOC_FILE, initialDoc, "utf-8");
  }
}

export async function appendLog(type: ActivityLog["type"], summary: string, details?: unknown): Promise<ActivityLog> {
  await ensureDirectory();
  const raw = await fs.readFile(LOGS_FILE, "utf-8");
  const logs: ActivityLog[] = JSON.parse(raw || "[]");
  
  const newLog: ActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    type,
    summary,
    details
  };
  
  logs.unshift(newLog);
  const trimmed = logs.slice(0, 500);
  await fs.writeFile(LOGS_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
  return newLog;
}

export async function getLogs(): Promise<ActivityLog[]> {
  await ensureDirectory();
  const raw = await fs.readFile(LOGS_FILE, "utf-8");
  return JSON.parse(raw || "[]");
}

export async function saveCampaign(campaign: Omit<SavedCampaign, "id" | "timestamp">): Promise<SavedCampaign> {
  await ensureDirectory();
  const raw = await fs.readFile(CAMPAIGNS_FILE, "utf-8");
  const campaigns: SavedCampaign[] = JSON.parse(raw || "[]");
  
  const newCampaign: SavedCampaign = {
    id: `camp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...campaign
  };
  
  campaigns.unshift(newCampaign);
  await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2), "utf-8");
  await appendLog("campaign_exported", `Saved campaign "${campaign.topic}" for ${campaign.brand}`, { campaignId: newCampaign.id });
  return newCampaign;
}

export async function getCampaigns(): Promise<SavedCampaign[]> {
  await ensureDirectory();
  const raw = await fs.readFile(CAMPAIGNS_FILE, "utf-8");
  return JSON.parse(raw || "[]");
}

export async function saveMilestone(milestone: Omit<Milestone, "id" | "timestamp">): Promise<Milestone> {
  await ensureDirectory();
  const raw = await fs.readFile(MILESTONES_FILE, "utf-8");
  const milestones: Milestone[] = JSON.parse(raw || "[]");
  
  const newMilestone: Milestone = {
    id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...milestone
  };
  
  milestones.unshift(newMilestone);
  await fs.writeFile(MILESTONES_FILE, JSON.stringify(milestones, null, 2), "utf-8");
  await appendLog("milestone_recorded", `Recorded milestone: ${milestone.title}`, newMilestone);
  
  await syncHackathonDoc();
  return newMilestone;
}

export async function getMilestones(): Promise<Milestone[]> {
  await ensureDirectory();
  const raw = await fs.readFile(MILESTONES_FILE, "utf-8");
  return JSON.parse(raw || "[]");
}

export async function getHackathonDoc(): Promise<string> {
  await ensureDirectory();
  return await fs.readFile(HACKATHON_DOC_FILE, "utf-8");
}

export async function updateHackathonDoc(markdown: string): Promise<void> {
  await ensureDirectory();
  await fs.writeFile(HACKATHON_DOC_FILE, markdown, "utf-8");
  await appendLog("xprize_doc_updated", "Directly updated XPRIZE_HACKATHON_PROGRESS.md");
}

export async function syncHackathonDoc(): Promise<string> {
  await ensureDirectory();
  const milestones = await getMilestones();
  const campaigns = await getCampaigns();
  
  let md = `# Ora & Jill - Build with Gemini XPRIZE Progress Tracker\n\n`;
  md += `*Maintained autonomously by the Ora Marketing & XPRIZE Documentation Agent.*\n\n`;
  md += `**Last Synced**: ${new Date().toUTCString()}\n\n`;
  md += `## 🚀 Executive Summary\n`;
  md += `- **Primary Project**: Jill Revenue Agent (AI Lead-to-Cash Operator for Field-Service Small Businesses)\n`;
  md += `- **Marketing & Growth Engine**: Ora Marketing Agent\n`;
  md += `- **Competition**: Build with Gemini XPRIZE Hackathon\n\n`;
  
  md += `## 📊 Key Milestones Recorded (${milestones.length})\n\n`;
  if (milestones.length === 0) {
    md += `*No milestones recorded yet.*\n\n`;
  } else {
    for (const m of milestones) {
      md += `### [${m.category.toUpperCase()}] ${m.title} _(${new Date(m.timestamp).toLocaleDateString()})_\n`;
      md += `${m.description}\n\n`;
      if (m.metrics && Object.keys(m.metrics).length > 0) {
        md += `**Metrics / Signals:**\n`;
        for (const [k, v] of Object.entries(m.metrics)) {
          md += `- **${k}**: ${v}\n`;
        }
        md += `\n`;
      }
    }
  }

  md += `## 📱 Marketing Campaigns & Content Dispatched (${campaigns.length})\n\n`;
  if (campaigns.length === 0) {
    md += `*No active marketing campaigns recorded yet.*\n\n`;
  } else {
    for (const c of campaigns.slice(0, 10)) {
      md += `- **${new Date(c.timestamp).toLocaleDateString()}** [${c.channel.toUpperCase()}] **${c.topic}** (${c.brand})\n`;
    }
    md += `\n`;
  }

  md += `## 📝 XPRIZE Deliverables & Evidence Checklist\n`;
  md += `- [x] Independent Growth & Documentation Agent active\n`;
  md += `- [x] Dedicated isolated log & audit trails active (\`ora-agent-data/\`)\n`;
  md += `- [ ] Cloud Run deployment screenshot & latency metrics verified\n`;
  md += `- [ ] First paying pilot proof & consent logs linked\n`;
  md += `- [ ] Video demonstration published with Ora Marketing campaign\n`;

  await fs.writeFile(HACKATHON_DOC_FILE, md, "utf-8");
  return md;
}

export { DATA_DIR, HACKATHON_DOC_FILE };

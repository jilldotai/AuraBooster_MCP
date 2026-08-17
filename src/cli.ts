import dotenv from "dotenv";
dotenv.config();

import { generateMarketingContent, logProgressAndSync, generateXprizeNarrativeSection } from "./agent.js";
import { getLogs, getCampaigns, getMilestones, getHackathonDoc, DATA_DIR, HACKATHON_DOC_FILE } from "./storage.js";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  console.log(`\n======================================================`);
  console.log(`🚀 Ora Marketing & XPRIZE Documentarian Agent (CLI)`);
  console.log(`📂 Isolated Data Directory: ${DATA_DIR}`);
  console.log(`======================================================\n`);

  switch (command) {
    case "post":
    case "market": {
      const topic = args[1] || "Launch of Jill Revenue Agent - XPRIZE Hackathon Submission";
      const channel = (args[2] as "x_twitter" | "linkedin" | "threads") || "x_twitter";
      const brand = args[3] || "Ora";

      console.log(`⚡ Generating marketing content for [${brand}] on [${channel}]...`);
      console.log(`📝 Topic: "${topic}"\n`);

      const result = await generateMarketingContent({
        brand,
        channel,
        topic,
        tone: "build_in_public"
      });

      console.log(`✅ Campaign Generated & Saved (ID: ${result.id}):\n`);
      console.log(`🎣 Hook: ${result.content.hook}`);
      console.log(`\n📄 Post Body:\n${result.content.post}`);
      if (result.content.thread && result.content.thread.length > 0) {
        console.log(`\n🧵 Thread Breakout:`);
        result.content.thread.forEach((t, i) => console.log(`  [${i + 1}] ${t}`));
      }
      console.log(`\n🏷 Hashtags: ${result.content.hashtags?.join(" ")}`);
      console.log(`🎯 Call to Action: ${result.content.callToAction}`);
      break;
    }

    case "milestone":
    case "log": {
      const title = args[1] || "Project Milestone Achieved";
      const desc = args[2] || "Updated core architecture and verified Vertex AI endpoints.";
      const category = (args[3] as any) || "feature";

      console.log(`⚡ Logging milestone and synchronizing XPRIZE document...`);
      const { milestone } = await logProgressAndSync(title, desc, category);
      console.log(`✅ Milestone saved: [${milestone.category}] ${milestone.title}`);
      console.log(`📄 Synced to: ${HACKATHON_DOC_FILE}`);
      break;
    }

    case "status": {
      const logs = await getLogs();
      const campaigns = await getCampaigns();
      const milestones = await getMilestones();
      console.log(`📊 Agent Status:`);
      console.log(`- Total Isolated Activity Logs: ${logs.length}`);
      console.log(`- Saved Marketing Campaigns: ${campaigns.length}`);
      console.log(`- Recorded Milestones: ${milestones.length}`);
      console.log(`- XPRIZE Progress File: ${HACKATHON_DOC_FILE}\n`);

      if (logs.length > 0) {
        console.log(`Recent Activity:`);
        logs.slice(0, 5).forEach(l => {
          console.log(`  • [${new Date(l.timestamp).toLocaleTimeString()}] (${l.type}) ${l.summary}`);
        });
      }
      break;
    }

    case "doc": {
      const doc = await getHackathonDoc();
      console.log(`📄 Current XPRIZE Progress Document Content:\n`);
      console.log(doc);
      break;
    }

    case "narrative": {
      const section = args[1] || "AI and Human Safety Boundaries";
      const notes = args.slice(2);
      console.log(`⚡ Generating XPRIZE submission narrative for: "${section}"...`);
      const narrative = await generateXprizeNarrativeSection(section, notes.length > 0 ? notes : ["Deterministic approval gate", "No autonomous money spending", "Vertex AI audit trail"]);
      console.log(`\n${narrative}\n`);
      break;
    }

    default: {
      console.log(`Usage:`);
      console.log(`  npx tsx src/marketing-agent/cli.ts post "<topic>" [x_twitter|linkedin|threads] [BrandName]`);
      console.log(`  npx tsx src/marketing-agent/cli.ts milestone "<title>" "<description>" [feature|experiment|metric]`);
      console.log(`  npx tsx src/marketing-agent/cli.ts status`);
      console.log(`  npx tsx src/marketing-agent/cli.ts doc`);
      console.log(`  npx tsx src/marketing-agent/cli.ts narrative "<section>" [bullet1] [bullet2]`);
      break;
    }
  }
}

main().catch(err => {
  console.error("Agent execution error:", err);
  process.exit(1);
});

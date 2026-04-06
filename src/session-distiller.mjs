/**
 * Session Distiller — Extractive filtering for Claude Code sessions.
 *
 * 1. Backs up the original session (CC compact will destroy it)
 * 2. Distills a clean resumable session (conversation text verbatim)
 * 3. Writes an index MD pointing back to the backup for full tool results
 *
 * Zero information loss. Clean context for resume.
 */

import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { randomUUID } from "node:crypto";

const PASSTHROUGH = new Set(["queue-operation", "last-prompt"]);
const DROP = new Set(["file-history-snapshot", "attachment", "progress", "pr-link", "custom-title"]);
const ENVELOPE_ONCE = new Set(["userType", "entrypoint", "version", "gitBranch", "slug", "permissionMode"]);

const toolIdMap = new Map();

// Index entries — point back to backup
const LARGE_THRESHOLD = 1500;
let indexEntries = [];
let currentOrigLine = 0;

function addIndexEntry(toolName, label, chars) {
  const id = indexEntries.length + 1;
  indexEntries.push({ id, toolName, label, origLine: currentOrigLine, chars });
  return id;
}

function distillBlocks(blocks) {
  if (typeof blocks === "string") return blocks;
  if (!Array.isArray(blocks)) return [];

  const out = [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    switch (b.type) {
      case "text":
        if (b.text?.trim()) out.push(b);
        break;

      case "thinking":
        if (b.thinking?.trim()) {
          out.push({ type: "text", text: `[thinking: ${b.thinking.trim().slice(0, 200)}]` });
        }
        break;

      case "tool_use": {
        const name = b.name || "tool";
        if (b.id) toolIdMap.set(b.id, name);
        const inp = b.input || {};
        let hint = "";

        if (name === "Edit") {
          const old = inp.old_string?.slice(0, 200) || "";
          const nw = inp.new_string?.slice(0, 200) || "";
          hint = `${inp.file_path || ""}\n  old: ${old}\n  new: ${nw}`;
        } else if (name === "Write") {
          const content = inp.content || "";
          const lines = content.split("\n");
          const preview = lines.length <= 10 ? content.slice(0, 400)
            : [...lines.slice(0, 5), `... (${lines.length} lines)`, ...lines.slice(-3)].join("\n");
          hint = `${inp.file_path || ""}\n${preview.slice(0, 500)}`;
        } else if (name === "Read") {
          hint = inp.file_path || inp.path || "";
          if (inp.offset) hint += `:${inp.offset}`;
          if (inp.limit) hint += `+${inp.limit}`;
        } else if (name === "Bash") {
          hint = inp.command?.slice(0, 250) || "";
        } else if (name === "Grep") {
          hint = `"${inp.pattern || ""}" ${inp.path || ""}`;
        } else if (name === "Glob") {
          hint = inp.pattern || "";
        } else if (name === "Agent") {
          hint = inp.description || inp.prompt?.slice(0, 250) || "";
        } else {
          hint = inp.file_path || inp.path || inp.command?.slice(0, 150)
            || inp.query?.slice(0, 120) || inp.prompt?.slice(0, 120)
            || inp.url?.slice(0, 120) || inp.skill
            || inp.selector?.slice(0, 100) || inp.text?.slice(0, 100)
            || inp.key || inp.description?.slice(0, 120)
            || (inp.todos ? `${inp.todos.length} items` : "")
            || "";
        }
        out.push({ type: "text", text: hint ? `[${name}: ${hint}]` : `[${name}]` });
        break;
      }

      case "tool_result": {
        const toolName = toolIdMap.get(b.tool_use_id) || "unknown";
        const raw = typeof b.content === "string" ? b.content
          : Array.isArray(b.content) ? b.content.filter(c => c?.type === "text").map(c => c.text).join(" ")
          : "";

        if (b.is_error) {
          if (raw) out.push({ type: "text", text: `[error: ${raw.slice(0, 500)}]` });
          break;
        }

        const t = raw.trim();
        if (!t) break;

        // Large results → index reference to backup, keep preview
        if (t.length > LARGE_THRESHOLD) {
          const firstLine = t.split("\n").find(l => l.trim())?.trim().slice(0, 80) || toolName;
          const id = addIndexEntry(toolName, firstLine, t.length);
          const preview = toolName === "Bash"
            ? [...t.split("\n").slice(0, 3), "...", ...t.split("\n").slice(-3)].join("\n")
            : t.slice(0, 400);
          out.push({ type: "text", text: `[${toolName} (${t.length} chars) → backup line ${currentOrigLine}, index #${id}:\n${preview}]` });
          break;
        }

        // Small results — inline
        if (toolName === "Read") {
          out.push({ type: "text", text: `[read: ${t.split("\n").length} lines]` });
        } else if (toolName === "Bash") {
          const lines = t.split("\n");
          if (lines.length <= 15) {
            out.push({ type: "text", text: `[output: ${t.slice(0, 800)}]` });
          } else {
            const head = lines.slice(0, 5).join("\n");
            const tail = lines.slice(-5).join("\n");
            out.push({ type: "text", text: `[output (${lines.length} lines):\n${head}\n...\n${tail}]` });
          }
        } else if (toolName === "Grep") {
          out.push({ type: "text", text: `[matches:\n${t.split("\n").slice(0, 25).join("\n")}]` });
        } else if (toolName === "Glob") {
          out.push({ type: "text", text: `[files:\n${t.split("\n").slice(0, 25).join("\n")}]` });
        } else if (toolName === "Edit") {
          out.push({ type: "text", text: `[edited ok]` });
        } else if (toolName === "Write") {
          out.push({ type: "text", text: `[written ok]` });
        } else {
          out.push({ type: "text", text: `[result: ${t.slice(0, 500)}]` });
        }
        break;
      }

      case "image":
        out.push({ type: "text", text: "[image]" });
        break;
    }
  }

  const merged = [];
  for (const b of out) {
    const prev = merged[merged.length - 1];
    if (b.type === "text" && prev?.type === "text") prev.text += "\n" + b.text;
    else merged.push({ ...b });
  }
  return merged;
}

function stripEnvelope(entry, seenEnvelope) {
  const cleaned = { ...entry };
  for (const field of ENVELOPE_ONCE) {
    if (field in cleaned) {
      if (seenEnvelope.has(field)) delete cleaned[field];
      else seenEnvelope.add(field);
    }
  }
  return cleaned;
}

// ── Main ────────────────────────────────────────────────────────────────

export async function distillSession(inputPath, opts = {}) {
  const { outputDir, sessionId, dryRun = false } = opts;
  const raw = await readFile(inputPath, "utf-8");
  const rawLines = raw.split("\n");
  const lines = rawLines.filter(l => l.trim());
  const newId = sessionId || randomUUID();
  const dir = outputDir || dirname(inputPath);
  const outputPath = join(dir, `${newId}.jsonl`);
  const distillDir = join(dir, `${newId}`);    // folder for related files
  const backupPath = join(distillDir, `backup-${basename(inputPath)}`);
  const indexPath = join(distillDir, `index.md`);

  let kept = 0, dropped = 0;
  const byType = {};
  const out = [];
  let titleRaw = "";
  const seenEnvelope = new Set();

  toolIdMap.clear();
  indexEntries = [];

  // Pre-scan for title
  for (const line of lines) {
    try {
      const e = JSON.parse(line);
      if (e.type === "ai-title") { titleRaw = e.aiTitle || ""; break; }
      if (!titleRaw && e.type === "user" && e.message?.content) {
        const c = e.message.content;
        let t = typeof c === "string" ? c : Array.isArray(c)
          ? c.filter(b => b?.type === "text").map(b => b.text).join(" ") : "";
        // Strip XML tags (ide_opened_file, system-reminder, etc.) before using as title
        t = t.replace(/<[^>]+>[^<]*<\/[^>]+>/g, "").replace(/<[^>]+>/g, "").trim();
        if (t && !t.startsWith("[") && t.length > 5) titleRaw = t.slice(0, 80);
      }
    } catch {}
  }

  // Main loop
  let origLineIdx = 0;
  for (const line of lines) {
    while (origLineIdx < rawLines.length && rawLines[origLineIdx].trim() !== line.trim()) origLineIdx++;
    currentOrigLine = origLineIdx + 1;

    let e;
    try { e = JSON.parse(line); } catch { origLineIdx++; continue; }

    const type = e.type || "unknown";
    byType[type] = (byType[type] || 0) + 1;

    if (DROP.has(type)) { dropped++; origLineIdx++; continue; }
    if (type === "ai-title") { dropped++; origLineIdx++; continue; }

    e = stripEnvelope(e, seenEnvelope);

    if (PASSTHROUGH.has(type)) {
      out.push(JSON.stringify({ ...e, sessionId: newId }));
      kept++; origLineIdx++; continue;
    }

    if (type === "system") {
      if (e.subtype === "compact_boundary") {
        out.push(JSON.stringify({ ...e, sessionId: newId }));
        kept++;
      } else { dropped++; }
      origLineIdx++; continue;
    }

    if ((type === "user" || type === "assistant") && e.message?.content) {
      const content = distillBlocks(e.message.content);
      if (Array.isArray(content) && content.length === 0) { dropped++; origLineIdx++; continue; }
      const msg = { ...e.message, content };
      delete msg.usage;
      out.push(JSON.stringify({ ...e, sessionId: newId, message: msg }));
      kept++; origLineIdx++; continue;
    }

    dropped++;
    origLineIdx++;
  }

  // Title with index info
  const inBytes = Buffer.byteLength(raw, "utf-8");
  const tempStr = out.join("\n");
  const pct = Math.round((1 - Buffer.byteLength(tempStr, "utf-8") / inBytes) * 100);
  const hasIndex = indexEntries.length > 0;
  const titleLine = JSON.stringify({
    type: "ai-title", sessionId: newId,
    aiTitle: `[distilled -${pct}%] ${titleRaw || "Untitled session"}`,
  });
  kept++;

  let insertIdx = 0;
  for (let i = 0; i < out.length; i++) {
    try {
      const o = JSON.parse(out[i]);
      if (o.type === "queue-operation") { insertIdx = i + 1; continue; }
    } catch {}
    break;
  }
  out.splice(insertIdx, 0, titleLine);

  // Inject context message right after title — tells Claude about the backup + index
  if (hasIndex) {
    const contextMsg = JSON.stringify({
      type: "user", sessionId: newId,
      message: {
        role: "user",
        content: [{
          type: "text",
          text: [
            `[DISTILLED SESSION]`,
            `This session has been distilled. Large tool results were stripped but backed up.`,
            `When you see "→ backup line N, index #X", the full content is at:`,
            `  ${backupPath}`,
            `Use: Read ${backupPath} offset=<line> limit=50`,
            `Full index: ${indexPath}`,
          ].join("\n"),
        }],
      },
    });
    out.splice(insertIdx + 1, 0, contextMsg);
    kept++;
  }

  const outputStr = out.join("\n") + "\n";
  const outBytes = Buffer.byteLength(outputStr, "utf-8");

  if (!dryRun) {
    // 1. Backup original into distill folder (before CC compact can destroy it)
    await mkdir(distillDir, { recursive: true });
    await copyFile(inputPath, backupPath);

    // 2. Write distilled session
    await writeFile(outputPath, outputStr, "utf-8");

    // 3. Write index pointing to backup
    if (hasIndex) {
      const idx = [];
      idx.push(`# Distilled Session Index`);
      idx.push(``);
      idx.push(`Backup: ${backupPath}`);
      idx.push(`Distilled: ${outputPath}`);
      idx.push(`Original: ${inputPath}`);
      idx.push(`Large results: ${indexEntries.length}`);
      idx.push(``);
      idx.push(`To read any full result:`);
      idx.push("```");
      idx.push(`Read ${backupPath} offset=<line> limit=50`);
      idx.push("```");
      idx.push(``);
      idx.push(`| # | Tool | Description | Line | Size |`);
      idx.push(`|---|------|-------------|------|------|`);
      for (const e of indexEntries) {
        idx.push(`| ${e.id} | ${e.toolName} | ${e.label} | ${e.origLine} | ${(e.chars / 1024).toFixed(1)}K |`);
      }
      idx.push(``);
      await writeFile(indexPath, idx.join("\n") + "\n", "utf-8");
    }
  }

  return {
    inputPath,
    outputPath: dryRun ? "(dry run)" : outputPath,
    backupPath: dryRun ? "(dry run)" : backupPath,
    sessionId: newId,
    stats: {
      inputLines: lines.length, keptLines: kept, droppedLines: dropped,
      inputBytes: inBytes, outputBytes: outBytes,
      backupBytes: inBytes,
      reduction: Math.round((1 - outBytes / inBytes) * 100) + "%",
      indexEntries: indexEntries.length,
      indexPath: hasIndex ? indexPath : null,
      byType,
    },
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith("session-distiller.mjs")) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const inputPath = args.find(a => !a.startsWith("--"));

  if (!inputPath) {
    console.error("Usage: node session-distiller.mjs <session.jsonl> [--dry-run]");
    process.exit(1);
  }

  const fmt = b => b < 1024 ? b + "B" : b < 1048576 ? (b / 1024).toFixed(1) + "K" : (b / 1048576).toFixed(1) + "M";

  try {
    const r = await distillSession(inputPath, { dryRun });
    const s = r.stats;
    console.log(`\nSession Distiller\n─────────────────`);
    console.log(`Backup:    ${r.backupPath} (${fmt(s.backupBytes)})`);
    console.log(`Distilled: ${r.outputPath} (${fmt(s.outputBytes)}, ${s.reduction} reduction)`);
    if (s.indexEntries > 0) {
      console.log(`Index:     ${s.indexPath} (${s.indexEntries} refs)`);
    }
    console.log(`Lines:     ${s.inputLines} → ${s.keptLines}`);
    console.log("\nTypes:", Object.entries(s.byType).sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t}:${c}`).join("  "));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

#!/usr/bin/env node
/**
 * trim-images — Strip image blocks from a live CC session JSONL.
 * Replaces image content blocks with [image redacted] text placeholders.
 * Everything else untouched.
 *
 * Usage: node trim-images.mjs <session.jsonl>
 */

import { readFile, writeFile } from "node:fs/promises";

const inputPath = process.argv[2];
if (!inputPath?.endsWith(".jsonl")) {
  console.error("Usage: node trim-images.mjs <session.jsonl>");
  process.exit(1);
}

const raw = await readFile(inputPath, "utf-8");
const lines = raw.split("\n");
let redacted = 0;

const out = lines.map(line => {
  if (!line.trim()) return line;
  let obj;
  try { obj = JSON.parse(line); } catch { return line; }

  const content = obj?.message?.content;
  if (!Array.isArray(content)) return line;

  let changed = false;
  const newContent = content.map(block => {
    if (block?.type === "image" || block?.source?.type === "base64") {
      changed = true;
      redacted++;
      return { type: "text", text: "[image redacted]" };
    }
    // Also catch tool_result with image content
    if (block?.type === "tool_result" && Array.isArray(block.content)) {
      const hasImage = block.content.some(c => c?.type === "image" || c?.source?.type === "base64");
      if (hasImage) {
        changed = true;
        redacted++;
        return {
          ...block,
          content: block.content.map(c =>
            (c?.type === "image" || c?.source?.type === "base64")
              ? { type: "text", text: "[image redacted]" }
              : c
          ),
        };
      }
    }
    return block;
  });

  if (!changed) return line;
  return JSON.stringify({ ...obj, message: { ...obj.message, content: newContent } });
});

const result = out.join("\n");
const savedBytes = Buffer.byteLength(raw) - Buffer.byteLength(result);

await writeFile(inputPath, result, "utf-8");
console.log(`Redacted ${redacted} image(s), saved ${(savedBytes / 1024).toFixed(0)}K`);

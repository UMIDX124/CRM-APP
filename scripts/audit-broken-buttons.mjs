// Find every <button> without an onClick or form submission handler.
// Run: node scripts/audit-broken-buttons.mjs

import fs from "fs";
import path from "path";

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") yield* walk(full);
    } else if (entry.name.endsWith(".tsx")) {
      yield full;
    }
  }
}

const issues = [];

for (const file of walk("src")) {
  const content = fs.readFileSync(file, "utf-8");
  // Match <button ...> tag (multi-line)
  const regex = /<button\b([^>]*?)>/gms;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const tag = match[0];
    // Skip valid buttons
    if (tag.includes("onClick")) continue;
    if (tag.includes('type="submit"')) continue;
    if (tag.includes("type={")) continue;
    // Calculate line number
    const lineNum = content.slice(0, match.index).split("\n").length;
    // Read context (3 lines)
    const lines = content.split("\n");
    const start = Math.max(0, lineNum - 1);
    const end = Math.min(lines.length, lineNum + 2);
    const snippet = lines.slice(start, end).join("\n").slice(0, 250);
    issues.push({
      file: file.replace(/\\/g, "/"),
      line: lineNum,
      snippet,
    });
  }
}

console.log(`Found ${issues.length} <button> tags without onClick handlers:\n`);
const byFile = {};
for (const i of issues) {
  if (!byFile[i.file]) byFile[i.file] = [];
  byFile[i.file].push(i);
}

for (const [file, items] of Object.entries(byFile)) {
  console.log(`\n📄 ${file} (${items.length})`);
  items.forEach((i) => {
    console.log(`   line ${i.line}:`);
    console.log(`   ${i.snippet.split("\n").map((l) => "     " + l.trim()).join("\n")}`);
  });
}

import fs from "fs";
import path from "path";

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") yield* walk(full);
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      yield full;
    }
  }
}

const issues = {
  hardcodedFU: [],
  mockData: [],
  emptyCatch: [],
  noSubmit: [],
  staticData: [],
};

for (const file of walk("src")) {
  const c = fs.readFileSync(file, "utf-8");
  const f = file.replace(/\\/g, "/");

  if (c.includes("FU Corp") || c.includes("fu-corp.com")) issues.hardcodedFU.push(f);
  if (c.includes('@/data/mock-data')) issues.mockData.push(f);
  if (/catch\s*\{\s*\}/.test(c)) issues.emptyCatch.push(f);
  // Forms with no submit handler
  const formMatches = c.match(/<form[^>]*>/g) || [];
  if (formMatches.some((m) => !m.includes("onSubmit"))) issues.noSubmit.push(f);
}

console.log("=== AUDIT RESULTS ===\n");
for (const [cat, files] of Object.entries(issues)) {
  console.log(`${cat.toUpperCase()}: ${files.length} files`);
  files.forEach((f) => console.log(`  - ${f}`));
  console.log();
}

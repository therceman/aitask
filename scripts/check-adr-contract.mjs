import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const adrRoot = path.join(root, "docs", "adr");

const REQUIRED_HEADINGS = [
  "## Status",
  "## Owner",
  "## Date",
  "## Related",
  "## Pack Summary",
  "## Decision Contract",
  "## Scope",
  "### In Scope",
  "### Out of Scope",
  "## Engine Core Rules",
  "## Forbidden",
  "## Data / Type Contract",
  "## Validation Contract",
  "## Implementation Process",
  "## Task Coverage",
  "## Final Lock",
];

const VALID_STATUS = new Set(["Proposed", "Accepted", "Superseded", "Deprecated"]);
const FORBIDDEN_PLACEHOLDER_LINES = [
  "Standardized contract section.",
  "- Canonical decisions deferred to ADR body.",
];

function rel(p) {
  return path.relative(root, p).replaceAll("\\", "/");
}

async function listMdRecursive(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listMdRecursive(full)));
    else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function readHeadingValue(markdown, heading) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const idx = lines.findIndex((line) => line.trim() === heading);
  if (idx < 0) return "";
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("#")) break;
    return line.replace(/^\*\*(.+)\*\*$/u, "$1").trim();
  }
  return "";
}

async function main() {
  const showProblems =
    process.argv.includes("--problems") ||
    process.env.npm_config_problems === "1" ||
    process.env.npm_config_problems === "true";
  const files = await listMdRecursive(adrRoot);
  const errors = [];
  const idMap = new Map();

  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    const normalized = text.replace(/\r\n/g, "\n");
    const r = rel(file);
    const fileBase = path.basename(file);
    const idMatch = fileBase.match(/^ADR-(\d{3}(?:-\d+)?)-/u);
    const adrId = idMatch ? `ADR-${idMatch[1]}` : null;

    if (!adrId) {
      errors.push(`${r}: filename must start with ADR-XXX-`);
    } else if (idMap.has(adrId)) {
      errors.push(`${r}: duplicate ADR id ${adrId} (also ${idMap.get(adrId)})`);
    } else {
      idMap.set(adrId, r);
    }

    const titleMatch = normalized.match(/^#\s+(ADR-\d{3}(?:-\d+)?):/m);
    if (!titleMatch) {
      errors.push(`${r}: missing title heading format "# ADR-XXX: ..."`);
    } else if (adrId && titleMatch[1] !== adrId) {
      errors.push(`${r}: title ADR id ${titleMatch[1]} does not match filename ${adrId}`);
    }

    for (const heading of REQUIRED_HEADINGS) {
      if (!normalized.includes(`\n${heading}\n`) && !normalized.startsWith(`${heading}\n`)) {
        errors.push(`${r}: missing required heading "${heading}"`);
      }
    }

    const statusValue = readHeadingValue(normalized, "## Status");
    if (!VALID_STATUS.has(statusValue)) {
      errors.push(
        `${r}: invalid status "${statusValue || "(empty)"}" (allowed: ${[...VALID_STATUS].join(", ")})`,
      );
    }

    for (const bad of FORBIDDEN_PLACEHOLDER_LINES) {
      if (normalized.includes(bad)) {
        errors.push(`${r}: forbidden placeholder content detected: "${bad}"`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`FAIL adr_contract_check files=${files.length} errors=${errors.length}`);
    if (showProblems) {
      for (const err of errors) console.error(`- ${err}`);
    } else {
      console.error(`> last problem: ${errors[errors.length - 1]}`);
      console.error("! run `npm run -s adr_contract:check --problems` for full list");
    }
    process.exitCode = 1;
    return;
  }

  console.log(`OK adr_contract_check files=${files.length} errors=0`);
}

await main();

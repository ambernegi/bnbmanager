import { readFile } from "node:fs/promises";
import path from "node:path";
import { HelpClient, type HelpBlock, type HelpSection } from "@/app/help/HelpClient";

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "code"; text: string };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "")
    .slice(0, 64);
}

function parseMarkdown(md: string): Block[] {
  const lines = md.replaceAll("\r\n", "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const line = raw.trimEnd();

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        buf.push(lines[i] ?? "");
        i += 1;
      }
      // skip closing fence
      i += 1;
      blocks.push({ kind: "code", text: buf.join("\n") });
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ kind: "h3", text: line.slice(4).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ kind: "h1", text: line.slice(2).trim() });
      i += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = (lines[i] ?? "").trimEnd();
        if (!l.trim()) break;
        if (!l.startsWith("- ")) break;
        items.push(l.slice(2).trim());
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // paragraph (merge until blank)
    const buf: string[] = [line.trim()];
    i += 1;
    while (i < lines.length) {
      const l = (lines[i] ?? "").trimEnd();
      if (!l.trim()) break;
      if (l.startsWith("#") || l.startsWith("- ") || l.startsWith("```")) break;
      buf.push(l.trim());
      i += 1;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }
  return blocks;
}

function toSections(blocks: Block[]): { title: string; subtitle?: string; sections: HelpSection[] } {
  let title = "Help";
  let subtitle: string | undefined = undefined;

  const sections: HelpSection[] = [];
  let current: HelpSection | null = null;

  const push = () => {
    if (current) sections.push(current);
    current = null;
  };

  for (const b of blocks) {
    if (b.kind === "h1") {
      title = b.text;
      continue;
    }
    if (b.kind === "p" && !sections.length && !current && !subtitle) {
      // First paragraph becomes subtitle (nice for the page header).
      subtitle = b.text;
      continue;
    }
    if (b.kind === "h2") {
      push();
      current = { id: slugify(b.text) || "section", title: b.text, blocks: [] };
      continue;
    }
    const helpBlock: HelpBlock | null =
      b.kind === "h3"
        ? { kind: "h3", text: b.text }
        : b.kind === "p"
          ? { kind: "p", text: b.text }
          : b.kind === "ul"
            ? { kind: "ul", items: b.items }
            : b.kind === "code"
              ? { kind: "code", text: b.text }
              : null;

    if (!helpBlock) continue;
    if (!current) {
      current = { id: "overview", title: "Overview", blocks: [] };
    }
    current.blocks.push(helpBlock);
  }
  push();

  // Ensure stable ordering and unique IDs.
  const used = new Set<string>();
  const deduped = sections.map((s) => {
    let id = s.id;
    let n = 2;
    while (used.has(id)) {
      id = `${s.id}-${n}`;
      n += 1;
    }
    used.add(id);
    return { ...s, id };
  });

  return { title, subtitle, sections: deduped };
}

export default async function HelpPage() {
  // Constant path: not derived from user input.
  const mdPath = path.join(process.cwd(), "HELP.md");
  const md = await readFile(mdPath, "utf8");
  const parsed = toSections(parseMarkdown(md));

  return <HelpClient title={parsed.title} subtitle={parsed.subtitle} sections={parsed.sections} />;
}


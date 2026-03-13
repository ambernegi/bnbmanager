import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "code"; text: string };

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

function renderInline(text: string): string {
  // Minimal inline formatting for `code` spans.
  const escaped = escapeHtml(text);
  return escaped.replaceAll(/`([^`]+)`/g, (_m, p1: string) => `<code>${escapeHtml(p1)}</code>`);
}

export default async function HelpPage() {
  // Constant path: not derived from user input.
  const mdPath = path.join(process.cwd(), "HELP.md");
  const md = await readFile(mdPath, "utf8");
  const blocks = parseMarkdown(md);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-4 py-10 dark:from-black dark:to-zinc-950">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Help</div>
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Back to app
            </Link>
          </div>

          <div
            className="prose prose-zinc mt-4 max-w-none dark:prose-invert prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5 dark:prose-code:bg-zinc-900"
            dangerouslySetInnerHTML={{
              __html: blocks
                .map((b) => {
                  if (b.kind === "h1") return `<h1>${renderInline(b.text)}</h1>`;
                  if (b.kind === "h2") return `<h2>${renderInline(b.text)}</h2>`;
                  if (b.kind === "h3") return `<h3>${renderInline(b.text)}</h3>`;
                  if (b.kind === "p") return `<p>${renderInline(b.text)}</p>`;
                  if (b.kind === "ul")
                    return `<ul>${b.items.map((it) => `<li>${renderInline(it)}</li>`).join("")}</ul>`;
                  if (b.kind === "code") return `<pre><code>${escapeHtml(b.text)}</code></pre>`;
                  return "";
                })
                .join("\n"),
            }}
          />
        </div>
      </div>
    </main>
  );
}


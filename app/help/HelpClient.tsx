"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type HelpBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "code"; text: string }
  | { kind: "h3"; text: string };

export type HelpSection = {
  id: string;
  title: string;
  blocks: HelpBlock[];
};

function InlineText({ text }: { text: string }) {
  // Minimal inline markdown renderer (safe React elements; no HTML injection).
  // Supports: `code`, **bold**, *italic*, [label](url)
  const nodes = useMemo(() => {
    type Tok =
      | { kind: "text"; value: string }
      | { kind: "code"; value: string }
      | { kind: "bold"; value: string }
      | { kind: "italic"; value: string }
      | { kind: "link"; label: string; href: string };

    const out: Tok[] = [];
    const s = text;
    let i = 0;

    const pushText = (v: string) => {
      if (!v) return;
      const last = out[out.length - 1];
      if (last && last.kind === "text") last.value += v;
      else out.push({ kind: "text", value: v });
    };

    while (i < s.length) {
      // code: `...`
      if (s[i] === "`") {
        const j = s.indexOf("`", i + 1);
        if (j > i + 1) {
          out.push({ kind: "code", value: s.slice(i + 1, j) });
          i = j + 1;
          continue;
        }
      }

      // bold: **...**
      if (s.startsWith("**", i)) {
        const j = s.indexOf("**", i + 2);
        if (j > i + 2) {
          out.push({ kind: "bold", value: s.slice(i + 2, j) });
          i = j + 2;
          continue;
        }
      }

      // link: [label](href)
      if (s[i] === "[") {
        const close = s.indexOf("]", i + 1);
        const openParen = close >= 0 ? s[close + 1] === "(" : false;
        if (close >= 0 && openParen) {
          const closeParen = s.indexOf(")", close + 2);
          if (closeParen > close + 2) {
            const label = s.slice(i + 1, close);
            const href = s.slice(close + 2, closeParen);
            out.push({ kind: "link", label, href });
            i = closeParen + 1;
            continue;
          }
        }
      }

      // italic: *...* (avoid treating ** as italic)
      if (s[i] === "*" && !s.startsWith("**", i)) {
        const j = s.indexOf("*", i + 1);
        if (j > i + 1) {
          out.push({ kind: "italic", value: s.slice(i + 1, j) });
          i = j + 1;
          continue;
        }
      }

      pushText(s[i] ?? "");
      i += 1;
    }

    return out;
  }, [text]);

  const isSafeHref = (href: string) =>
    href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://");

  return (
    <>
      {nodes.map((n, idx) => {
        if (n.kind === "text") return <span key={idx}>{n.value}</span>;
        if (n.kind === "code") {
          return (
            <code
              key={idx}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.85em] text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {n.value}
            </code>
          );
        }
        if (n.kind === "bold") return <strong key={idx}>{n.value}</strong>;
        if (n.kind === "italic") return <em key={idx}>{n.value}</em>;
        if (n.kind === "link") {
          return isSafeHref(n.href) ? (
            <a
              key={idx}
              href={n.href}
              target={n.href.startsWith("http") ? "_blank" : undefined}
              rel={n.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="underline underline-offset-2"
            >
              {n.label}
            </a>
          ) : (
            <span key={idx}>{n.label}</span>
          );
        }
        return null;
      })}
    </>
  );
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(getText());
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          // ignore
        }
      }}
      className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function BlockView({ block }: { block: HelpBlock }) {
  if (block.kind === "h3") {
    return (
      <h3 className="mt-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
        <InlineText text={block.text} />
      </h3>
    );
  }
  if (block.kind === "p") {
    return (
      <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        <InlineText text={block.text} />
      </p>
    );
  }
  if (block.kind === "ul") {
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        {block.items.map((it, i) => (
          <li key={i}>
            <InlineText text={it} />
          </li>
        ))}
      </ul>
    );
  }
  if (block.kind === "code") {
    return (
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800">
        <div className="flex items-center justify-between gap-2 bg-zinc-50 px-3 py-2 dark:bg-zinc-900/60">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Snippet</div>
          <CopyButton getText={() => block.text} />
        </div>
        <pre className="overflow-x-auto bg-white p-3 text-xs text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          <code>{block.text}</code>
        </pre>
      </div>
    );
  }
  return null;
}

export function HelpClient({
  title,
  subtitle,
  sections,
}: {
  title: string;
  subtitle?: string;
  sections: HelpSection[];
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return sections;
    return sections
      .map((s) => {
        const hitTitle = s.title.toLowerCase().includes(q);
        const blocks = s.blocks.filter((b) => {
          if (b.kind === "p" || b.kind === "h3") return b.text.toLowerCase().includes(q);
          if (b.kind === "ul") return b.items.some((it) => it.toLowerCase().includes(q));
          if (b.kind === "code") return b.text.toLowerCase().includes(q);
          return false;
        });
        return hitTitle ? s : { ...s, blocks };
      })
      .filter((s) => s.blocks.length > 0 || s.title.toLowerCase().includes(q));
  }, [sections, q]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-4 py-8 dark:from-black dark:to-zinc-950">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          {/* sidebar */}
          <aside className="md:sticky md:top-6 md:w-[280px]">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Help
                </div>
                <Link
                  href="/"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Back
                </Link>
              </div>

              <div className="mt-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search help…"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-100/20"
                />
              </div>

              <div className="mt-3 space-y-1">
                {(q ? filtered : sections).map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block rounded-lg px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          {/* content */}
          <section className="flex-1">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {title}
                </h1>
                {subtitle ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-8">
                {filtered.map((s) => (
                  <div key={s.id} id={s.id} className="scroll-mt-24">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                        {s.title}
                      </h2>
                      <a
                        href={`#${s.id}`}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        title="Link to section"
                      >
                        #{s.id}
                      </a>
                    </div>
                    <div className="mt-3 border-t border-zinc-200/70 pt-3 dark:border-zinc-800">
                      {s.blocks.map((b, idx) => (
                        <BlockView key={idx} block={b} />
                      ))}
                    </div>
                  </div>
                ))}

                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                    No matches. Try a different search.
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}


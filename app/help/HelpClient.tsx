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
  // Render inline `code` spans without using dangerouslySetInnerHTML.
  const parts = useMemo(() => text.split(/(`[^`]+`)/g), [text]);
  return (
    <>
      {parts.map((p, idx) => {
        if (p.startsWith("`") && p.endsWith("`") && p.length >= 2) {
          return (
            <code
              key={idx}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.85em] text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {p.slice(1, -1)}
            </code>
          );
        }
        return <span key={idx}>{p}</span>;
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
                {sections.map((s) => (
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

              <div className="mt-5 grid gap-3">
                {filtered.map((s) => (
                  <div key={s.id} id={s.id} className="scroll-mt-24">
                    <details className="group rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 open:bg-white dark:border-zinc-800 dark:bg-zinc-900/20 dark:open:bg-zinc-950">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {s.title}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`#${s.id}`}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            title="Copy link"
                            onClick={(e) => {
                              // let hash update, but avoid summary toggle weirdness
                              e.stopPropagation();
                            }}
                          >
                            #{s.id}
                          </a>
                          <span className="text-zinc-500 transition group-open:rotate-180">▾</span>
                        </div>
                      </summary>

                      <div className="mt-3">
                        {s.blocks.map((b, idx) => (
                          <BlockView key={idx} block={b} />
                        ))}
                      </div>
                    </details>
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


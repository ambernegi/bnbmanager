"use client";

import type { ListingProvider } from "@/lib/bnb/types";

function IconWrap({
  children,
  active,
  title,
  href,
}: {
  children: React.ReactNode;
  active: boolean;
  title: string;
  href?: string;
}) {
  const cls = active
    ? "text-zinc-950 dark:text-zinc-50"
    : "text-zinc-400 dark:text-zinc-600";

  const inner = (
    <div
      title={title}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset ring-zinc-200 bg-white",
        "transition hover:bg-zinc-50 dark:ring-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900",
        cls,
      ].join(" ")}
    >
      {children}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return inner;
}

export function ListingIcon({
  provider,
  active,
  href,
}: {
  provider: ListingProvider;
  active: boolean;
  href?: string;
}) {
  if (provider === "airbnb") {
    return (
      <IconWrap title="Airbnb" active={active} href={href}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.2c2.3 0 4.2 1.9 4.2 4.2 0 1-.3 2-.9 2.8l-2.6 4.1-2.6-4.1c-.6-.8-.9-1.8-.9-2.8C7.8 4.1 9.7 2.2 12 2.2Zm0 2c-1.2 0-2.2 1-2.2 2.2 0 .6.2 1.1.5 1.5L12 10.5l1.7-2.6c.3-.4.5-1 .5-1.5 0-1.2-1-2.2-2.2-2.2Z" />
          <path d="M6.6 10.3c1.4 0 2.5 1.1 2.5 2.5 0 .4-.1.9-.3 1.2L6.9 17c-.4.6-1.1 1-1.9 1-1.4 0-2.5-1.1-2.5-2.5 0-.4.1-.9.3-1.2l1.9-2.9c.4-.6 1.1-1 1.9-1Zm0 2c-.1 0-.3.1-.4.2l-1.9 2.9c0 .1-.1.3-.1.4 0 .3.2.5.5.5.1 0 .3-.1.4-.2l1.9-2.9c0-.1.1-.3.1-.4 0-.3-.2-.5-.5-.5Z" />
          <path d="M17.4 10.3c.8 0 1.5.4 1.9 1l1.9 2.9c.2.3.3.8.3 1.2 0 1.4-1.1 2.5-2.5 2.5-.8 0-1.5-.4-1.9-1l-1.9-2.9c-.2-.3-.3-.8-.3-1.2 0-1.4 1.1-2.5 2.5-2.5Zm0 2c-.3 0-.5.2-.5.5 0 .1 0 .3.1.4l1.9 2.9c.1.2.2.2.4.2.3 0 .5-.2.5-.5 0-.1 0-.3-.1-.4l-1.9-2.9c-.1-.2-.2-.2-.4-.2Z" />
          <path d="M12 14.5c1.5 0 2.8 1.2 2.8 2.8S13.5 20 12 20s-2.8-1.2-2.8-2.8 1.2-2.7 2.8-2.7Zm0 2c-.4 0-.8.3-.8.8s.3.8.8.8.8-.3.8-.8-.4-.8-.8-.8Z" />
        </svg>
      </IconWrap>
    );
  }

  if (provider === "booking") {
    return (
      <IconWrap title="Booking.com" active={active} href={href}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 4h8.2A4.8 4.8 0 0 1 20 8.8c0 1.9-1.1 3.5-2.8 4.2A4.9 4.9 0 0 1 12 18H7V4Zm3 3v8h2c1.6 0 2.8-1.2 2.8-2.8S13.6 9.4 12 9.4H10Zm2-1.6c.9 0 1.6.7 1.6 1.6S12.9 8.6 12 8.6h-2V5.4h2Zm0 5.8c.9 0 1.6.7 1.6 1.6S12.9 14.4 12 14.4h-2v-3.2h2Z" />
        </svg>
      </IconWrap>
    );
  }

  return (
    <IconWrap title="Other" active={active} href={href}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.2-3.2a3 3 0 1 1 4.2 4.2l-1.6 1.6a1 1 0 1 1-1.4-1.4l1.6-1.6a1 1 0 0 0-1.4-1.4l-3.2 3.2a1 1 0 0 1-1.4 0Z" />
        <path d="M13.4 10.6a1 1 0 0 1 0 1.4l-3.2 3.2a3 3 0 1 1-4.2-4.2l1.6-1.6a1 1 0 1 1 1.4 1.4l-1.6 1.6a1 1 0 0 0 1.4 1.4l3.2-3.2a1 1 0 0 1 1.4 0Z" />
      </svg>
    </IconWrap>
  );
}


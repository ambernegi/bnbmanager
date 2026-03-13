import type { Property } from "@/lib/bnb/types";

export type Reminder = {
  kind: "agreement" | "rent";
  propertyId: string;
  propertyName: string;
  severity: "info" | "warn" | "bad";
  message: string;
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetweenLocal(a: Date, b: Date): number {
  const ms = startOfLocalDay(b).getTime() - startOfLocalDay(a).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function parseLocalDate(value: string): Date | null {
  // YYYY-MM-DD
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

export function buildReminders(properties: Property[], now = new Date()): Reminder[] {
  const out: Reminder[] = [];

  for (const p of properties) {
    // Agreement expiry reminders
    if (p.agreementValidUntil) {
      const end = parseLocalDate(p.agreementValidUntil);
      if (end) {
        const daysLeft = daysBetweenLocal(now, end);
        if (daysLeft < 0) {
          out.push({
            kind: "agreement",
            propertyId: p.id,
            propertyName: p.name,
            severity: "bad",
            message: `Agreement expired ${Math.abs(daysLeft)} day(s) ago.`,
          });
        } else if (daysLeft <= 30) {
          out.push({
            kind: "agreement",
            propertyId: p.id,
            propertyName: p.name,
            severity: daysLeft <= 7 ? "warn" : "info",
            message: `Agreement expires in ${daysLeft} day(s).`,
          });
        }
      }
    }

    // Rent due reminders (next occurrence, within 5 days)
    if (p.tenure === "rented" && p.rentDueDay) {
      const dueDay = p.rentDueDay;
      const today = startOfLocalDay(now);
      const y = today.getFullYear();
      const m = today.getMonth();
      const thisMonthDue = new Date(y, m, dueDay);
      const nextDue =
        thisMonthDue >= today ? thisMonthDue : new Date(y, m + 1, dueDay);
      const daysToDue = daysBetweenLocal(today, nextDue);
      if (daysToDue >= 0 && daysToDue <= 5) {
        out.push({
          kind: "rent",
          propertyId: p.id,
          propertyName: p.name,
          severity: daysToDue <= 1 ? "warn" : "info",
          message: `Rent due in ${daysToDue} day(s) (day ${dueDay}).`,
        });
      }
    }
  }

  // Most urgent first
  const weight = (s: Reminder["severity"]) => (s === "bad" ? 3 : s === "warn" ? 2 : 1);
  out.sort((a, b) => weight(b.severity) - weight(a.severity));
  return out;
}


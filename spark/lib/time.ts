// Time-zone helpers so reminders land at the person's local time.

function safeTz(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

export function zonedParts(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz(tz),
    hourCycle: "h23",
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", weekday: "short",
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) p[part.type] = part.value;
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: +p.year, month: +p.month, day: +p.day,
    hour: +p.hour % 24, minute: +p.minute,
    weekday: weekdays.indexOf(p.weekday),
  };
}

/** The UTC instant for a wall-clock time in a time zone. */
export function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, tz: string) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const p = zonedParts(new Date(guess), tz);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return new Date(guess - (asIfUtc - guess));
}

/**
 * Next "fresh start" date: whichever comes first of next Monday or the 1st of
 * next month, at the same local time of day as `timeOf`.
 */
export function nextFreshStart(now: Date, timeOf: Date, tz: string) {
  const today = zonedParts(now, tz);
  const t = zonedParts(timeOf, tz);
  const daysToMonday = ((8 - today.weekday) % 7) || 7;
  const monday = zonedToUtc(today.year, today.month, today.day + daysToMonday, t.hour, t.minute, tz);
  const first = zonedToUtc(today.year, today.month + 1, 1, t.hour, t.minute, tz);
  return monday <= first
    ? { at: monday, label: "Monday" }
    : { at: first, label: "the 1st of the month" };
}

export function formatWhen(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz(tz), weekday: "long", hour: "numeric", minute: "2-digit",
  }).format(date);
}

export function formatDay(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz(tz), weekday: "long", month: "short", day: "numeric",
  }).format(date);
}

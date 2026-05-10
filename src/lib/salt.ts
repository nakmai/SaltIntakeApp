const TZ = "Asia/Tokyo";

/** Get the start of "today" in JST (00:00:00 JST) as a UTC Date. */
export function startOfLocalDay(d: Date = new Date()): Date {
  // Format the date in JST to get the JST calendar date
  const jst = d.toLocaleDateString("en-CA", { timeZone: TZ }); // "YYYY-MM-DD"
  return new Date(`${jst}T00:00:00+09:00`);
}

/** Get the end of "today" in JST (= start of tomorrow JST) as a UTC Date. */
export function endOfLocalDay(d: Date = new Date()): Date {
  const start = startOfLocalDay(d);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/** Get the start of "yesterday" in JST as a UTC Date. */
export function startOfYesterday(d: Date = new Date()): Date {
  const start = startOfLocalDay(d);
  return new Date(start.getTime() - 24 * 60 * 60 * 1000);
}

export function dailyTarget(): number {
  const v = Number(process.env.NEXT_PUBLIC_DAILY_SALT_TARGET_G);
  return Number.isFinite(v) && v > 0 ? v : 6;
}

export function formatGrams(g: number): string {
  return `${g.toFixed(2)} g`;
}

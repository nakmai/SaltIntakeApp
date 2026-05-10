export function startOfLocalDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfLocalDay(d: Date = new Date()): Date {
  const x = startOfLocalDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

export function dailyTarget(): number {
  const v = Number(process.env.NEXT_PUBLIC_DAILY_SALT_TARGET_G);
  return Number.isFinite(v) && v > 0 ? v : 6;
}

export function formatGrams(g: number): string {
  return `${g.toFixed(2)} g`;
}

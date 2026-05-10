import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dailyTarget, formatGrams } from "@/lib/salt";

export const dynamic = "force-dynamic";

type DayBucket = { day: string; total: number; count: number };

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { startOfLocalDay } = await import("@/lib/salt");
  const today = startOfLocalDay();
  const since = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000); // last 14 days incl. today

  const items = await prisma.intake.findMany({
    where: {
      userId: session.user.id,
      consumedAt: { gte: since },
    },
    orderBy: { consumedAt: "desc" },
  });

  const buckets = bucketByDay(items);
  const target = dailyTarget();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl">履歴 (14日間)</h1>

      {buckets.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm dark:bg-gray-900">
          記録がありません
        </p>
      ) : (
        <ul className="space-y-2">
          {buckets.map((b) => {
            const over = b.total > target;
            const pct = Math.min(100, Math.round((b.total / target) * 100));
            return (
              <li
                key={b.day}
                className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{b.day}</span>
                  <span className={`text-sm tabular-nums ${over ? "text-rose-600" : ""}`}>
                    {formatGrams(b.total)} / {target.toFixed(1)} g · {b.count}件
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`h-full ${over ? "bg-rose-500" : "bg-brand-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
        全記録
      </h2>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm dark:divide-gray-800 dark:bg-gray-900">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              href={`/intake/${it.id}/edit`}
              className="flex items-center justify-between px-4 py-3 active:bg-gray-50 dark:active:bg-gray-800"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{it.name}</p>
                <p className="text-xs text-gray-500">
                  {new Date(it.consumedAt).toLocaleString("ja-JP", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Tokyo",
                  })}
                  {it.source === "OCR" ? " · OCR" : " · 手入力"}
                </p>
              </div>
              <span className="ml-3 shrink-0 tabular-nums text-sm">
                {formatGrams(it.saltGrams)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function bucketByDay(
  items: { saltGrams: number; consumedAt: Date }[]
): DayBucket[] {
  const map = new Map<string, DayBucket>();
  for (const it of items) {
    const key = new Date(it.consumedAt).toLocaleDateString("en-CA", {
      timeZone: "Asia/Tokyo",
    }); // "YYYY-MM-DD" in JST
    const cur = map.get(key) ?? { day: key, total: 0, count: 0 };
    cur.total += it.saltGrams;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.day.localeCompare(a.day));
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  dailyTarget,
  endOfLocalDay,
  formatGrams,
  startOfLocalDay,
  startOfYesterday,
} from "@/lib/salt";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const start = startOfLocalDay();
  const end = endOfLocalDay();

  const yesterdayStart = startOfYesterday();

  const [todays, yesterdays] = await Promise.all([
    prisma.intake.findMany({
      where: {
        userId: session.user.id,
        consumedAt: { gte: start, lt: end },
      },
      orderBy: { consumedAt: "desc" },
    }),
    prisma.intake.findMany({
      where: {
        userId: session.user.id,
        consumedAt: { gte: yesterdayStart, lt: start },
        isDraft: false,
      },
      select: { saltGrams: true },
    }),
  ]);

  const total = todays
    .filter((x) => !x.isDraft)
    .reduce((acc, x) => acc + x.saltGrams, 0);
  const draftCount = todays.filter((x) => x.isDraft).length;
  const yesterdayTotal = yesterdays.reduce((acc, x) => acc + x.saltGrams, 0);
  const target = dailyTarget();
  const pct = Math.min(100, Math.round((total / target) * 100));
  const over = total > target;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-gray-500">こんにちは, {session.user.name ?? session.user.email}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">今日の塩分</h1>
      </header>

      <section
        className={`rounded-2xl p-5 shadow-sm ${
          over
            ? "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            : "bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100"
        }`}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-500">合計</span>
          <span className="text-sm text-gray-500">目標 {target.toFixed(1)} g/日</span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-5xl font-bold tabular-nums">{total.toFixed(2)}</span>
          <span className="pb-1 text-base text-gray-500">g</span>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full ${over ? "bg-rose-500" : "bg-brand-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {over ? `目標を ${(total - target).toFixed(2)} g 超過しています` : `目標まであと ${(target - total).toFixed(2)} g`}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          昨日: {yesterdayTotal.toFixed(2)} g
          {draftCount > 0 ? ` ・ 下書き ${draftCount}件（合計に未反映）` : ""}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/capture"
          className="flex items-center justify-center rounded-xl bg-brand-600 px-4 py-4 text-base font-semibold text-white shadow-sm active:bg-brand-700"
        >
          写真から登録
        </Link>
        <Link
          href="/intake/new"
          className="flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-4 text-base font-semibold text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          手入力で追加
        </Link>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
          今日の記録 ({todays.length})
        </h2>
        {todays.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm dark:bg-gray-900">
            まだ記録がありません
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm dark:divide-gray-800 dark:bg-gray-900">
            {todays.map((it) => (
              <li key={it.id}>
                <Link
                  href={`/intake/${it.id}/edit`}
                  className="flex items-center justify-between px-4 py-3 active:bg-gray-50 dark:active:bg-gray-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {it.name}
                      {it.isDraft ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                          下書き
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(it.consumedAt).toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Tokyo",
                      })}
                      {it.source === "OCR" ? " · OCR" : " · 手入力"}
                    </p>
                  </div>
                  <span className={`ml-3 shrink-0 tabular-nums text-sm ${it.isDraft ? "text-gray-400" : ""}`}>
                    {formatGrams(it.saltGrams)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

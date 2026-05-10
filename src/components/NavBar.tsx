import Link from "next/link";
import { signOut, auth } from "@/lib/auth";

export async function NavBar() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-base font-bold text-brand-700 dark:text-brand-100">
          塩分管理
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <NavLink href="/" label="ホーム" />
          <NavLink href="/capture" label="撮影" />
          <NavLink href="/intake/new" label="手入力" />
          <NavLink href="/history" label="履歴" />
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-gray-500 sm:inline">
            {session?.user?.name ?? session?.user?.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/auth/signin" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-gray-800"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-2 py-1.5 text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800 sm:px-3"
    >
      {label}
    </Link>
  );
}

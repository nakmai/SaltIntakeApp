import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">塩分管理アプリ</h1>
        <p className="mt-2 text-sm text-gray-500">
          ログインして塩分摂取量を記録しましょう
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
        className="w-full max-w-sm"
      >
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base font-medium shadow-sm hover:bg-gray-50"
        >
          Googleでログイン
        </button>
      </form>
    </main>
  );
}

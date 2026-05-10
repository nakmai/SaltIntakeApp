import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "塩分管理アプリ",
  description: "1日の塩分摂取量を写真撮影と手入力で記録",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0ea5e9",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="ja">
      <body className="min-h-dvh">
        {session?.user ? <NavBar /> : null}
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}

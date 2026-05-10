import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { IntakeForm } from "@/components/IntakeForm";
import { toLocalDatetimeInput } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function NewIntakePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const sp = await searchParams;
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold sm:text-3xl">記録を追加</h1>
      <IntakeForm
        initial={{
          name: get("name") ?? "",
          saltGrams: get("salt") ?? "",
          note: get("note") ?? "",
          consumedAt: toLocalDatetimeInput(),
          source: get("source") === "OCR" ? "OCR" : "MANUAL",
          ocrRawText: get("raw") ?? null,
        }}
      />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IntakeForm } from "@/components/IntakeForm";
import { toLocalDatetimeInput } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function EditIntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { id } = await params;

  const item = await prisma.intake.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold sm:text-3xl">
        記録を編集{item.isDraft ? "（下書き）" : ""}
      </h1>
      <IntakeForm
        intakeId={item.id}
        initial={{
          name: item.name,
          saltGrams: String(item.saltGrams),
          note: item.note ?? "",
          consumedAt: toLocalDatetimeInput(item.consumedAt),
          source: item.source,
          ocrRawText: item.ocrRawText,
          isDraft: item.isDraft,
        }}
      />
    </div>
  );
}

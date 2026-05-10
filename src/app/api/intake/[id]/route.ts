import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IntakeUpdateSchema } from "@/lib/intake-schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const item = await prisma.intake.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = IntakeUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await prisma.intake.updateMany({
    where: { id, userId: session.user.id },
    data: parsed.data,
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const updated = await prisma.intake.findUnique({ where: { id } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const result = await prisma.intake.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

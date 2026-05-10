import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IntakeCreateSchema } from "@/lib/intake-schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  const where = {
    userId: session.user.id,
    ...(from || to
      ? {
          consumedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lt: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const items = await prisma.intake.findMany({
    where,
    orderBy: { consumedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = IntakeCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const created = await prisma.intake.create({
    data: {
      userId: session.user.id,
      name: data.name,
      saltGrams: data.saltGrams,
      note: data.note ?? null,
      source: data.source,
      ocrRawText: data.ocrRawText ?? null,
      consumedAt: data.consumedAt ?? new Date(),
    },
  });

  return NextResponse.json(created, { status: 201 });
}

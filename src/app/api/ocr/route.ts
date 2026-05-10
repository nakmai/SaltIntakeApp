import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractSaltFromImage } from "@/lib/azure-openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { image?: string };
  try {
    body = (await req.json()) as { image?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const image = body.image;
  if (!image || !image.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "image must be a base64 data URL" },
      { status: 400 }
    );
  }

  try {
    const result = await extractSaltFromImage(image);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

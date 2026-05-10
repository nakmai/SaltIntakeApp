"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type OcrResponse = {
  name: string | null;
  saltGrams: number | null;
  basis: string | null;
  sodiumMg: number | null;
  rawText: string;
  confidence: "high" | "medium" | "low";
};

const MAX_DIM = 1600;

export default function CapturePage() {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResponse | null>(null);

  function pickCamera() {
    cameraRef.current?.click();
  }

  function pickFile() {
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setResult(null);

    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPreview(dataUrl);
      setLoading(true);
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `OCR failed (${res.status})`);
      }
      const data = (await res.json()) as OcrResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown");
    } finally {
      setLoading(false);
    }
  }

  function continueToForm() {
    if (!result) return;
    const params = new URLSearchParams({
      source: "OCR",
      name: result.name ?? "",
      salt: result.saltGrams != null ? String(result.saltGrams) : "",
      note: [
        result.basis ? `単位: ${result.basis}` : null,
        result.sodiumMg != null ? `Na: ${result.sodiumMg} mg` : null,
        `信頼度: ${result.confidence}`,
      ]
        .filter(Boolean)
        .join(" / "),
      raw: result.rawText ?? "",
    });
    router.push(`/intake/new?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold sm:text-3xl">栄養成分表示を撮影</h1>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
      />

      {!preview ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={pickCamera}
            className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-500 bg-brand-50 text-base font-semibold text-brand-700 active:bg-brand-100 dark:bg-brand-500/10"
          >
            <span className="text-3xl" aria-hidden>📷</span>
            カメラで撮影
          </button>
          <button
            onClick={pickFile}
            className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-base font-semibold text-gray-700 active:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
          >
            <span className="text-3xl" aria-hidden>📁</span>
            ファイルから選択
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="撮影画像"
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-800"
          />
          <div className="flex gap-2">
            <button
              onClick={pickCamera}
              className="text-sm text-brand-600 underline"
            >
              撮り直す
            </button>
            <span className="text-sm text-gray-300">|</span>
            <button
              onClick={pickFile}
              className="text-sm text-brand-600 underline"
            >
              ファイルから選択
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">読み取り中...</p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="mt-5 space-y-2 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <Row label="商品名" value={result.name ?? "(未検出)"} />
          <Row
            label="食塩相当量"
            value={
              result.saltGrams != null
                ? `${result.saltGrams.toFixed(2)} g`
                : "(未検出)"
            }
          />
          <Row label="単位" value={result.basis ?? "-"} />
          <Row
            label="ナトリウム"
            value={result.sodiumMg != null ? `${result.sodiumMg} mg` : "-"}
          />
          <Row label="信頼度" value={result.confidence} />

          <button
            onClick={continueToForm}
            className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white"
          >
            この内容で登録画面へ
          </button>
          <p className="text-center text-xs text-gray-500">
            次の画面で量や数量を編集できます
          </p>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-gray-100 py-1.5 last:border-b-0 dark:border-gray-800">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="ml-2 text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { width, height } = scaleDown(img.naturalWidth, img.naturalHeight, MAX_DIM);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas not supported");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = src;
  });
}

function scaleDown(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const r = w > h ? max / w : max / h;
  return { width: Math.round(w * r), height: Math.round(h * r) };
}

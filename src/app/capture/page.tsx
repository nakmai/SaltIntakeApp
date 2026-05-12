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

type Mode = "label" | "food";

const MAX_DIM = 1600;

export default function CapturePage() {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const foodCameraRef = useRef<HTMLInputElement>(null);
  const foodFileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("label");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResponse | null>(null);

  function pickCamera() {
    setMode("label");
    cameraRef.current?.click();
  }

  function pickFile() {
    setMode("label");
    fileRef.current?.click();
  }

  function pickFoodCamera() {
    setMode("food");
    foodCameraRef.current?.click();
  }

  function pickFoodFile() {
    setMode("food");
    foodFileRef.current?.click();
  }

  async function processFile(file: File, m: Mode) {
    setError(null);
    setResult(null);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPreview(dataUrl);
      setLoading(true);
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: dataUrl, mode: m }),
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

  function onLabelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    processFile(file, "label");
  }

  function onFoodFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    processFile(file, "food");
  }

  function continueToForm() {
    if (!result) return;
    const params = new URLSearchParams({
      source: "OCR",
      name: result.name ?? "",
      salt: result.saltGrams != null ? String(result.saltGrams) : "",
      note: [
        result.basis ? `${mode === "food" ? "推定根拠" : "単位"}: ${result.basis}` : null,
        result.sodiumMg != null ? `Na: ${result.sodiumMg} mg` : null,
        `信頼度: ${result.confidence}`,
      ]
        .filter(Boolean)
        .join(" / "),
      raw: result.rawText ?? "",
    });
    if (mode === "food") params.set("draft", "1");
    router.push(`/intake/new?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold sm:text-3xl">写真から登録</h1>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onLabelFile} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" onChange={onLabelFile} className="hidden" />
      <input ref={foodCameraRef} type="file" accept="image/*" capture="environment" onChange={onFoodFile} className="hidden" />
      <input ref={foodFileRef} type="file" accept="image/*" onChange={onFoodFile} className="hidden" />

      {!preview ? (
        <div className="space-y-4">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">栄養成分表示から読み取り</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={pickCamera}
                className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-500 bg-brand-50 text-sm font-semibold text-brand-700 active:bg-brand-100 dark:bg-brand-500/10"
              >
                <span className="text-2xl" aria-hidden>📷</span>
                カメラで撮影
              </button>
              <button
                onClick={pickFile}
                className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-sm font-semibold text-gray-700 active:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
              >
                <span className="text-2xl" aria-hidden>📁</span>
                ファイルから選択
              </button>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              料理の写真からAI推定 <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">下書き保存</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={pickFoodCamera}
                className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50 text-sm font-semibold text-amber-800 active:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-200"
              >
                <span className="text-2xl" aria-hidden>🍱</span>
                料理を撮影
              </button>
              <button
                onClick={pickFoodFile}
                className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 text-sm font-semibold text-amber-700 active:bg-amber-100 dark:bg-amber-900/10 dark:text-amber-200"
              >
                <span className="text-2xl" aria-hidden>📁</span>
                ファイルから選択
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              AIが料理を判定して食塩相当量を推定します。推定値なので下書きとして保存され、合計には含まれません。
            </p>
          </section>
        </div>
      ) : (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="撮影画像"
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-800"
          />
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              onClick={() => {
                setPreview(null);
                setResult(null);
              }}
              className="text-brand-600 underline"
            >
              最初から選び直す
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">
          {mode === "food" ? "AIが料理を判定中..." : "読み取り中..."}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="mt-5 space-y-2 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <Row label={mode === "food" ? "料理名" : "商品名"} value={result.name ?? "(未検出)"} />
          <Row
            label="食塩相当量"
            value={
              result.saltGrams != null
                ? `${result.saltGrams.toFixed(2)} g${mode === "food" ? "（推定）" : ""}`
                : "(未検出)"
            }
          />
          <Row label={mode === "food" ? "推定根拠" : "単位"} value={result.basis ?? "-"} />
          {mode === "label" && (
            <Row
              label="ナトリウム"
              value={result.sodiumMg != null ? `${result.sodiumMg} mg` : "-"}
            />
          )}
          <Row label="信頼度" value={result.confidence} />

          <button
            onClick={continueToForm}
            className={`mt-3 w-full rounded-xl px-4 py-3 text-base font-semibold text-white ${
              mode === "food" ? "bg-amber-600" : "bg-brand-600"
            }`}
          >
            {mode === "food" ? "下書きとして編集画面へ" : "この内容で登録画面へ"}
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

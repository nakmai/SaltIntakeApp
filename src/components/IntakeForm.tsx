"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toLocalDatetimeInput } from "@/lib/date";

export type IntakeFormValues = {
  name: string;
  saltGrams: string;
  note: string;
  consumedAt: string;
  source: "MANUAL" | "OCR";
  ocrRawText?: string | null;
};

type Props = {
  initial: IntakeFormValues;
  intakeId?: string;
  submitLabel?: string;
};

export function IntakeForm({ initial, intakeId, submitLabel }: Props) {
  const router = useRouter();
  const [v, setV] = useState<IntakeFormValues>(initial);
  const [operator, setOperator] = useState<"" | "×" | "÷" | "+" | "-">("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isEdit = !!intakeId;

  function update<K extends keyof IntakeFormValues>(k: K, val: IntakeFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const base = Number(v.saltGrams);
    if (!v.name.trim()) return setError("食品名を入力してください");
    if (!Number.isFinite(base) || base < 0) return setError("塩分(g)を正しく入力してください");

    let salt = base;
    if (operator && quantity) {
      const qty = Number(quantity);
      if (!Number.isFinite(qty)) return setError("数量を正しく入力してください");
      if ((operator === "×" || operator === "÷") && qty <= 0) return setError("数量を正しく入力してください");
      if (operator === "÷" && qty === 0) return setError("0で割ることはできません");
      switch (operator) {
        case "×": salt = base * qty; break;
        case "÷": salt = base / qty; break;
        case "+": salt = base + qty; break;
        case "-": salt = base - qty; break;
      }
    }
    if (!Number.isFinite(salt) || salt < 0) return setError("計算結果が不正です");

    const body = {
      name: v.name.trim(),
      saltGrams: salt,
      note: v.note.trim() || null,
      consumedAt: v.consumedAt ? new Date(v.consumedAt).toISOString() : undefined,
      source: v.source,
      ocrRawText: v.ocrRawText ?? null,
    };

    start(async () => {
      const res = await fetch(
        isEdit ? `/api/intake/${intakeId}` : "/api/intake",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        setError(`保存に失敗しました (${res.status})`);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  async function onDelete() {
    if (!intakeId) return;
    if (!confirm("この記録を削除しますか?")) return;
    start(async () => {
      const res = await fetch(`/api/intake/${intakeId}`, { method: "DELETE" });
      if (!res.ok) {
        setError(`削除に失敗しました (${res.status})`);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="食品名">
        <input
          type="text"
          inputMode="text"
          value={v.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="例: カップヌードル, 醤油 大さじ1"
          className="input"
          autoFocus={!isEdit}
        />
      </Field>

      <Field label="塩分相当量 (g)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={v.saltGrams}
            onChange={(e) => update("saltGrams", e.target.value)}
            placeholder="例: 2.5"
            className="input tabular-nums flex-1"
          />
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as "" | "×" | "÷" | "+" | "-")}
            className="input w-16 text-center"
          >
            <option value=""></option>
            <option value="×">×</option>
            <option value="÷">÷</option>
            <option value="+">+</option>
            <option value="-">−</option>
          </select>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="数量"
            className="input tabular-nums w-24"
            disabled={!operator}
          />
        </div>
        {operator && quantity && (() => {
          const base = Number(v.saltGrams);
          const qty = Number(quantity);
          if (!Number.isFinite(base) || !Number.isFinite(qty)) return null;
          let result: number;
          switch (operator) {
            case "×": result = base * qty; break;
            case "÷": result = qty !== 0 ? base / qty : NaN; break;
            case "+": result = base + qty; break;
            case "-": result = base - qty; break;
            default: return null;
          }
          return Number.isFinite(result) && result >= 0 ? (
            <p className="mt-1 text-xs text-gray-500 tabular-nums">
              = {(Math.round(result * 100) / 100).toFixed(2)} g
            </p>
          ) : null;
        })()}
      </Field>

      <Field label="日時">
        <input
          type="datetime-local"
          value={v.consumedAt}
          onChange={(e) => update("consumedAt", e.target.value)}
          className="input"
        />
        <button
          type="button"
          onClick={() => update("consumedAt", toLocalDatetimeInput())}
          className="mt-1 text-xs text-brand-600 underline"
        >
          現在時刻を登録
        </button>
      </Field>

      <Field label="メモ (任意)">
        <textarea
          value={v.note}
          onChange={(e) => update("note", e.target.value)}
          rows={3}
          placeholder="例: 醤油は1食あたり約2.6gの食塩相当量"
          className="input"
        />
      </Field>

      {v.ocrRawText ? (
        <details className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-900/50 dark:text-gray-400">
          <summary>OCRの読み取り結果</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words">{v.ocrRawText}</pre>
        </details>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {pending ? "保存中..." : submitLabel ?? (isEdit ? "更新する" : "登録する")}
        </button>
        {isEdit ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-600 disabled:opacity-50"
          >
            削除
          </button>
        ) : null}
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(209 213 219);
          background: white;
          padding: 0.75rem 0.875rem;
          font-size: 1rem;
          outline: none;
        }
        .input:focus {
          border-color: rgb(2 132 199);
          box-shadow: 0 0 0 3px rgb(14 165 233 / 0.2);
        }
        @media (prefers-color-scheme: dark) {
          .input {
            background: rgb(17 24 39);
            border-color: rgb(55 65 81);
            color: rgb(226 232 240);
          }
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      {children}
    </label>
  );
}


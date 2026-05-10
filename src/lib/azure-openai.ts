// Lightweight Azure OpenAI client.
// Uses chat completions with a vision-capable deployment to extract salt
// content from a nutrition-label photo.

const SYSTEM_PROMPT = `あなたは食品の栄養成分表示を読み取るOCRアシスタントです。
ユーザーから渡された画像（食品パッケージの栄養成分表示）から、
「食塩相当量」または「食塩」または「ナトリウム」を抽出してください。

ルール:
- 食塩相当量(g) を最優先で抽出する。
- 食塩相当量がなく、ナトリウム(mg)のみの場合は、食塩相当量(g) = ナトリウム(mg) × 2.54 / 1000 で換算する。
- 「100gあたり」「1食(○g)あたり」「1袋あたり」など単位の表記をそのまま basis に入れる。
- 商品名が画像から読み取れる場合は name に入れる(なければ null)。
- 必ず以下のJSONのみを返す。前後の説明文・コードフェンスは禁止。

{
  "name": string | null,
  "saltGrams": number | null,
  "basis": string | null,
  "sodiumMg": number | null,
  "rawText": string,
  "confidence": "high" | "medium" | "low"
}`;

export type OcrResult = {
  name: string | null;
  saltGrams: number | null;
  basis: string | null;
  sodiumMg: number | null;
  rawText: string;
  confidence: "high" | "medium" | "low";
};

function getConfig() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";

  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      "Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY / AZURE_OPENAI_DEPLOYMENT."
    );
  }

  return { endpoint, apiKey, deployment, apiVersion };
}

export async function extractSaltFromImage(
  imageDataUrl: string
): Promise<OcrResult> {
  const { endpoint, apiKey, deployment, apiVersion } = getConfig();

  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(
    deployment
  )}/chat/completions?api-version=${apiVersion}`;

  const body = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "この栄養成分表示の食塩相当量を抽出してください。",
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 600,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure OpenAI error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Azure OpenAI returned empty content");

  let parsed: Partial<OcrResult>;
  try {
    parsed = JSON.parse(content) as Partial<OcrResult>;
  } catch {
    throw new Error(`Azure OpenAI returned non-JSON content: ${content}`);
  }

  // Fallback: if model only filled sodiumMg, derive saltGrams.
  let saltGrams = parsed.saltGrams ?? null;
  if (saltGrams == null && typeof parsed.sodiumMg === "number") {
    saltGrams = +(parsed.sodiumMg * 2.54 / 1000).toFixed(3);
  }

  return {
    name: parsed.name ?? null,
    saltGrams,
    basis: parsed.basis ?? null,
    sodiumMg: parsed.sodiumMg ?? null,
    rawText: parsed.rawText ?? "",
    confidence: parsed.confidence ?? "low",
  };
}

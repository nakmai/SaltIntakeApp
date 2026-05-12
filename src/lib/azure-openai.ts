// Lightweight Azure OpenAI client.
// Uses chat completions with a vision-capable deployment to extract salt
// content from a nutrition-label photo.

const LABEL_PROMPT = `あなたは食品の栄養成分表示を読み取るOCRアシスタントです。
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

const FOOD_PROMPT = `あなたは料理の写真から食塩相当量を推定する栄養アシスタントです。
ユーザーから渡された画像（料理・食事の写真）について、
料理名と一般的なレシピ・市販品のデータから食塩相当量(g)を推定してください。

ルール:
- 料理を特定し、name に料理名を入れる(例: 「ラーメン」「カレーライス」「親子丼」)。
- saltGrams は一般的な1食分あたりの食塩相当量(g)の推定値を入れる。スープを全部飲むラーメンなら6g前後、カレーライス1人前なら3g前後など、現実的な値。
- basis には推定根拠を簡潔に書く(例: 「1人前(約500g)」「スープ込み」)。
- rawText には推定の説明を簡潔に書く(例: 「ラーメン1杯。スープは塩分が高い傾向。」)。
- 推定は不確かなため、confidence は基本「low」または「medium」。料理が明確に特定でき、典型的な調理法と推定できる場合のみ「medium」。
- 料理が判別できない場合は name は null、saltGrams は null、confidence は「low」。
- sodiumMg は基本 null。
- 必ず以下のJSONのみを返す。前後の説明文・コードフェンスは禁止。

{
  "name": string | null,
  "saltGrams": number | null,
  "basis": string | null,
  "sodiumMg": number | null,
  "rawText": string,
  "confidence": "high" | "medium" | "low"
}`;

export type OcrMode = "label" | "food";

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
  imageDataUrl: string,
  mode: OcrMode = "label"
): Promise<OcrResult> {
  const { endpoint, apiKey, deployment, apiVersion } = getConfig();

  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(
    deployment
  )}/chat/completions?api-version=${apiVersion}`;

  const systemPrompt = mode === "food" ? FOOD_PROMPT : LABEL_PROMPT;
  const userText = mode === "food"
    ? "この料理の食塩相当量を一般的なレシピから推定してください。"
    : "この栄養成分表示の食塩相当量を抽出してください。";

  const body = {
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
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

// src/lib/ai/gemini.ts
// Gemini（Google AI）に「材料→レシピJSON」を生成させる。
//
// 重要:
// - ここは **サーバー側（Route Handler）からのみ** 呼ぶ想定。
// - APIキーは必ずサーバー環境変数（GEMINI_API_KEY）に置く。

import { GoogleGenAI } from "@google/genai";

export type AiIngredient = { name: string; amount?: string };

export type AiGeneratedRecipe = {
  title: string;
  description?: string | null;
  timeMinutes?: number | null;
  servings?: number | null;
  mainCategory: string;
  tags?: string[];
  ingredients: { name: string; amount: string }[];
  steps: string[];
  notes?: string | null;
};

// GeminiのJSON Schema（OpenAPI互換のサブセット）
// ※Routeの後段で zod でも検証するので、ここでは「期待する形」を強めに縛る。
const recipeSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string", nullable: true },
    timeMinutes: { type: "number", nullable: true },
    servings: { type: "number", nullable: true },
    mainCategory: {
      type: "string",
      // アプリ側の固定リストに寄せる
      enum: [
        "主菜",
        "副菜",
        "主食",
        "汁物",
        "麺",
        "サラダ",
        "おやつ",
        "作り置き",
        "その他",
      ],
    },
    tags: { type: "array", items: { type: "string" }, nullable: true },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          amount: { type: "string" },
        },
        required: ["name", "amount"],
      },
    },
    steps: { type: "array", items: { type: "string" } },
    notes: { type: "string", nullable: true },
  },
  required: ["title", "mainCategory", "ingredients", "steps"],
} as const;

function mustGetGeminiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local (server-side env)."
    );
  }
  return key;
}

/**
 * 材料からレシピ（JSON）を生成
 */
export async function generateRecipeFromIngredients(args: {
  ingredients: AiIngredient[];
  preference?: string;
  model?: string;
}): Promise<AiGeneratedRecipe> {
  const apiKey = mustGetGeminiKey();
  const ai = new GoogleGenAI({ apiKey });

  const model = args.model ?? "gemini-2.0-flash";
  const ingredientsText = args.ingredients
    .filter((i) => i.name.trim())
    .map((i) => (i.amount?.trim() ? `${i.name.trim()}（${i.amount.trim()}）` : i.name.trim()))
    .join("\n");

  const pref = (args.preference ?? "").trim();

  // ここは「日本の家庭向け」をデフォルトに寄せる。
  // ユーザーが好みを入れたらそれを優先。
  const prompt = `あなたは家庭料理のレシピ作成アシスタントです。\n\n` +
    `次の材料から、**1つ**レシピを提案してください。\n` +
    `- できるだけ材料を無駄なく使う\n` +
    `- 調味料（塩・こしょう・醤油・みりん・酒・砂糖・油など）の追加はOK\n` +
    `- 手順はスマホで見やすいように短めに\n` +
    `- 出力は必ずJSON（スキーマ準拠）\n\n` +
    `【材料】\n${ingredientsText || "（空）"}\n\n` +
    (pref ? `【好み・条件】\n${pref}\n\n` : "") +
    `JSON以外は一切出力しないでください。`;

  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: recipeSchema,
      // 料理レシピはブレが少ない方が良いので少し低め
      temperature: 0.6,
    },
  });

  // SDKは text に「JSON文字列」を返す
  const text = (res as any)?.text;
  if (!text || typeof text !== "string") {
    throw new Error("Gemini returned no text");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    // たまに ```json ... ``` になるケースの保険（基本はJSON modeなのでほぼ起きない）
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  }

  return parsed as AiGeneratedRecipe;
}

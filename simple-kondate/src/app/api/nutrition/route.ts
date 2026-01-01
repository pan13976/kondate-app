// src/app/api/nutrition/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * 受け取る材料（分量）
 * - name: 食材名（例：鶏もも）
 * - amount: 分量（例：200g / 1/2丁 / 大さじ1）
 */
type Ingredient = { name: string; amount: string };

/**
 * こちらが返す栄養（page.tsx が使いやすい形）
 * ※ GPTの時と同じ構造に合わせる
 */
type Nutrition = {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;

  // どれくらい推定・当て推量が混ざったかをメモ
  note: string | null;

  // デバッグ用（どの食材が何にマッチしたか）
  matched: Array<{
    input: string;
    usedFoodDescription: string | null;
    gramsUsed: number;
    per100g: { energy_kcal: number; protein_g: number; fat_g: number; carbs_g: number } | null;
  }>;
};

/**
 * 分量文字列を「だいたい何gか」に変換する（最小限）
 * - "200g" -> 200
 * - "1kg" -> 1000
 * - "大さじ1" -> 15g（※水換算の超ざっくり）
 * - "小さじ1" -> 5g
 * - "1カップ" -> 200g（※水換算のざっくり）
 * - 解析できない場合は null を返す（→後で 100g などにフォールバック）
 */
function parseGrams(amountRaw: string): { grams: number | null; warning: string | null } {
  const a = (amountRaw ?? "").trim();

  if (!a) return { grams: null, warning: "分量が空なので100g扱い（暫定）" };

  // 200g, 200 g
  const g = a.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (g) return { grams: Number(g[1]), warning: null };

  // 1kg, 0.5kg
  const kg = a.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  if (kg) return { grams: Number(kg[1]) * 1000, warning: null };

  // ml / L（本当は密度が必要なので水換算のざっくり）
  const ml = a.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
  if (ml) return { grams: Number(ml[1]), warning: "ml→gを水換算で推定（精度低）" };

  const l = a.match(/(\d+(?:\.\d+)?)\s*l\b/i);
  if (l) return { grams: Number(l[1]) * 1000, warning: "L→gを水換算で推定（精度低）" };

  // 日本語のざっくり換算
  if (a.includes("大さじ")) {
    const n = a.match(/大さじ\s*(\d+(?:\.\d+)?)/);
    const count = n ? Number(n[1]) : 1;
    return { grams: 15 * count, warning: "大さじ→gを水換算で推定（精度低）" };
  }

  if (a.includes("小さじ")) {
    const n = a.match(/小さじ\s*(\d+(?:\.\d+)?)/);
    const count = n ? Number(n[1]) : 1;
    return { grams: 5 * count, warning: "小さじ→gを水換算で推定（精度低）" };
  }

  if (a.includes("カップ")) {
    const n = a.match(/(\d+(?:\.\d+)?)\s*カップ/);
    const count = n ? Number(n[1]) : 1;
    return { grams: 200 * count, warning: "カップ→gを水換算で推定（精度低）" };
  }

  // 解析できない
  return { grams: null, warning: `分量「${a}」をg換算できず100g扱い（暫定）` };
}

/**
 * FoodData Central の foods/search（POST）を叩いて
 * 1件だけ（最有力）を返す。
 *
 * API Guide: /foods/search GET|POST :contentReference[oaicite:5]{index=5}
 */
async function fdcSearchTopFood(query: string, apiKey: string) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // pageSize=1 で1件だけもらう（レート節約）
    body: JSON.stringify({
      query,
      pageSize: 1,
      // まずは一般的な食品データに寄せる（必要なら調整）
      // dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`FDC search failed: ${res.status} ${t}`);
  }

  const json = await res.json();
  const food = json?.foods?.[0] ?? null;
  return food;
}

/**
 * foods/search の結果に含まれる foodNutrients から
 * 必要な栄養（kcal/protein/fat/carb）を抜き出す。
 *
 * ここは「名称マッチ」で拾う（ID固定より壊れにくい）。
 * - Energy / kcal
 * - Protein
 * - Total lipid (fat)
 * - Carbohydrate, by difference
 */
function pickPer100gNutrients(food: any): Nutrition["matched"][number]["per100g"] {
  const list = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];

  const find = (pred: (n: any) => boolean) => {
    const x = list.find(pred);
    const v = x?.value;
    return typeof v === "number" ? v : null;
  };

  // 代表的な表記ゆれに対応（できるだけ広め）
  const energy =
    find((n) => /energy/i.test(n?.nutrientName) && /kcal/i.test(n?.unitName ?? "")) ??
    find((n) => /^energy$/i.test(n?.nutrientName) && (n?.unitName ?? "").toLowerCase() === "kcal");

  const protein = find((n) => /^protein$/i.test(n?.nutrientName));
  const fat = find((n) => /total lipid/i.test(n?.nutrientName) || /\bfat\b/i.test(n?.nutrientName));
  const carbs = find((n) => /carbohydrate/i.test(n?.nutrientName));

  // 取得できなかった場合もあり得る（foodNutrientsが省略されるケース等）
  if (energy === null && protein === null && fat === null && carbs === null) return null;

  return {
    energy_kcal: energy ?? 0,
    protein_g: protein ?? 0,
    fat_g: fat ?? 0,
    carbs_g: carbs ?? 0,
  };
}

export async function POST(request: NextRequest) {
  try {
    // APIキーはサーバ側だけに置く（公開しない）
    const apiKey = process.env.FDC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: "FDC_API_KEY が設定されていません" }, { status: 500 });
    }

    // 入力を受け取る
    const body = (await request.json().catch(() => null)) as
      | { title?: string; ingredients?: Ingredient[] }
      | null;

    const title = (body?.title ?? "").trim();
    const ingredients = Array.isArray(body?.ingredients) ? body!.ingredients : [];

    if (!title && ingredients.length === 0) {
      return NextResponse.json({ message: "title または ingredients が必要です" }, { status: 400 });
    }

    // 空行を掃除
    const cleaned = ingredients
      .map((x) => ({ name: (x.name ?? "").trim(), amount: (x.amount ?? "").trim() }))
      .filter((x) => x.name !== "" || x.amount !== "");

    // 合計値（kcal / P / F / C）
    let totalEnergy = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

    const notes: string[] = [];
    const matched: Nutrition["matched"] = [];

    /**
     * 重要：
     * FDCは基本英語データが多いので、日本語食材名だとマッチしにくいことがあります。
     * まずはそのまま投げ、結果が弱ければ後で
     * - 日本語→英語変換（辞書/手動/翻訳）
     * - 食材候補をユーザーに選ばせる
     * などを追加するのが王道です。
     */
    for (const ing of cleaned) {
      // 1) 分量→gの推定
      const { grams, warning } = parseGrams(ing.amount);
      const gramsUsed = grams ?? 100; // 変換できない時は 100g 扱い（暫定）
      if (warning) notes.push(`${ing.name}: ${warning}`);

      // 2) FDCで食材検索（最有力1件）
      //    query は「食材名」中心でOK（分量は混ぜない方が安定）
      const query = ing.name || title || "food";
      const food = await fdcSearchTopFood(query, apiKey);

      if (!food) {
        notes.push(`${ing.name}: FDC検索で見つからず（0扱い）`);
        matched.push({
          input: `${ing.name} ${ing.amount}`.trim(),
          usedFoodDescription: null,
          gramsUsed,
          per100g: null,
        });
        continue;
      }

      // 3) 100gあたり栄養を抜き出す
      const per100g = pickPer100gNutrients(food);

      if (!per100g) {
        notes.push(`${ing.name}: 栄養データが取れず（0扱い）`);
        matched.push({
          input: `${ing.name} ${ing.amount}`.trim(),
          usedFoodDescription: food?.description ?? null,
          gramsUsed,
          per100g: null,
        });
        continue;
      }

      // 4) g換算して合計に加える
      const factor = gramsUsed / 100;
      totalEnergy += per100g.energy_kcal * factor;
      totalProtein += per100g.protein_g * factor;
      totalFat += per100g.fat_g * factor;
      totalCarbs += per100g.carbs_g * factor;

      matched.push({
        input: `${ing.name} ${ing.amount}`.trim(),
        usedFoodDescription: food?.description ?? null,
        gramsUsed,
        per100g,
      });
    }

    const nutrition: Nutrition = {
      // 小数が出るので、UI用に軽く丸める（好みで調整OK）
      energy_kcal: Math.round(totalEnergy),
      protein_g: Math.round(totalProtein * 10) / 10,
      fat_g: Math.round(totalFat * 10) / 10,
      carbs_g: Math.round(totalCarbs * 10) / 10,

      note: notes.length ? notes.join(" / ") : null,
      matched,
    };

    return NextResponse.json({ nutrition });
  } catch (e) {
    const message = e instanceof Error ? e.message : "栄養計算に失敗しました";
    return NextResponse.json({ message }, { status: 500 });
  }
}

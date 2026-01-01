// src/app/api/kondates/[id]/route.ts
import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

/**
 * DELETE /api/kondates/:id
 *
 * Next.js 15 以降では params が Promise なので
 * await してから使う必要がある
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  // ★ ここが今回のポイント
  const { id: rawId } = await ctx.params;

  // id は数値前提（bigserial）なので変換＆チェック
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json(
      { message: "invalid id" },
      { status: 400 }
    );
  }

  // Supabaseで削除
  const { error } = await supabase
    .from("kondates")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

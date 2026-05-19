/**
 * GET  /api/elena/kb?business=glass_soler  → return KB markdown
 * PUT  /api/elena/kb                       → update KB { business, content }
 */
import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { isValidBusinessId } from "@/lib/businessConfig";
import { invalidateKbCache } from "@/lib/elena/config";

function kbPath(business: string): string {
  return join(process.cwd(), "src", "lib", "elena", "kb", `${business}.md`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const business = searchParams.get("business");
  if (!business || !isValidBusinessId(business)) {
    return NextResponse.json({ error: "invalid business" }, { status: 400 });
  }
  const p = kbPath(business);
  if (!existsSync(p)) {
    return NextResponse.json({ business, content: "", exists: false });
  }
  const content = readFileSync(p, "utf-8");
  return NextResponse.json({ business, content, exists: true });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { business, content } = body;
  if (!business || !isValidBusinessId(business)) {
    return NextResponse.json({ error: "invalid business" }, { status: 400 });
  }
  if (typeof content !== "string") {
    return NextResponse.json({ error: "content must be string" }, { status: 400 });
  }
  if (content.length > 100_000) {
    return NextResponse.json({ error: "content too large (max 100kb)" }, { status: 400 });
  }
  writeFileSync(kbPath(business), content, "utf-8");
  invalidateKbCache(business);
  return NextResponse.json({ ok: true, business, length: content.length });
}

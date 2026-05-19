import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { metaAssets } from "@/db/schema";
import { eq, desc, and, sql, SQL } from "drizzle-orm";
import { DEFAULT_BUSINESS, resolveBusinessId } from "@/lib/businessConfig";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessParam = searchParams.get("business");
  const typeParam = searchParams.get("type"); // video|photo|album|post|ig_media
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

  const cookieStore = await cookies();
  const businessRaw =
    businessParam || cookieStore.get("business")?.value || DEFAULT_BUSINESS;
  const business = businessRaw === "all" ? "all" : resolveBusinessId(businessRaw);

  const filters: SQL[] = [];
  if (business !== "all") {
    filters.push(eq(metaAssets.business, business));
  }
  if (typeParam) {
    filters.push(eq(metaAssets.assetType, typeParam));
  }

  let q = db
    .select({
      id: metaAssets.id,
      externalId: metaAssets.externalId,
      business: metaAssets.business,
      assetType: metaAssets.assetType,
      platform: metaAssets.platform,
      title: metaAssets.title,
      description: metaAssets.description,
      permalink: metaAssets.permalink,
      thumbnail: metaAssets.thumbnail,
      externalCreatedAt: metaAssets.externalCreatedAt,
      createdAt: metaAssets.createdAt,
    })
    .from(metaAssets);

  if (filters.length > 0) {
    q = q.where(and(...filters)!) as typeof q;
  }
  const rows = q.orderBy(desc(metaAssets.externalCreatedAt)).limit(limit).all();

  // Conteo por tipo
  const countsQuery = db
    .select({
      assetType: metaAssets.assetType,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(metaAssets);

  const countsRows =
    business !== "all"
      ? countsQuery
          .where(eq(metaAssets.business, business))
          .groupBy(metaAssets.assetType)
          .all()
      : countsQuery.groupBy(metaAssets.assetType).all();

  return NextResponse.json({
    items: rows,
    total: rows.length,
    counts: countsRows,
  });
}

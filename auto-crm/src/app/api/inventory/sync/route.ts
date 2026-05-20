import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Agent 8: Inventory Manager - receives catalog + mention analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const products = body.inventory || [];
    const mentionCount = body.mentionCount || {};
    const alerts = body.alerts || [];

    const stats = { created: 0, updated: 0 };

    for (const product of products) {
      const retailerId = product.retailerId || product.retailer_id;
      if (!retailerId) continue;

      const existing = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.retailerId, retailerId))
        .all();

      const mentions = mentionCount[retailerId] || 0;

      if (existing.length > 0) {
        await db.update(inventoryItems)
          .set({
            name: product.name || existing[0].name,
            price: product.price || existing[0].price,
            availability: product.availability || existing[0].availability,
            imageUrl: product.imageUrl || product.image_url || existing[0].imageUrl,
            description: product.description || existing[0].description,
            mentionCount: mentions > 0 ? mentions : existing[0].mentionCount,
            lastSyncAt: new Date(),
          })
          .where(eq(inventoryItems.id, existing[0].id))
          .run();
        stats.updated++;
      } else {
        await db.insert(inventoryItems)
          .values({
            metaProductId: product.id || null,
            retailerId,
            name: product.name || "Sin nombre",
            category: product.category || "otros",
            price: product.price || null,
            availability: product.availability || "in stock",
            imageUrl: product.imageUrl || product.image_url || null,
            description: product.description || null,
            mentionCount: mentions,
            lastSyncAt: new Date(),
          })
          .run();
        stats.created++;
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      totalProducts: products.length,
      categories: body.categories || {},
      alerts,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error sync inventario", details: String(error) },
      { status: 500 }
    );
  }
}

// GET: Returns current inventory state
export async function GET() {
  const items = await db
    .select()
    .from(inventoryItems)
    .orderBy(desc(inventoryItems.mentionCount))
    .all();

  const categories: Record<string, number> = {};
  let inStock = 0;
  let outOfStock = 0;

  for (const item of items) {
    categories[item.category] = (categories[item.category] || 0) + 1;
    if (item.availability === "in stock") inStock++;
    else outOfStock++;
  }

  return NextResponse.json({
    totalProducts: items.length,
    inStock,
    outOfStock,
    categories,
    items,
    topMentioned: items.slice(0, 5),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { activities, contacts } from "@/db/schema";
import { eq, isNull, asc, and, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessParam = searchParams.get("business");
  const cookieStore = await cookies();
  const business = businessParam || cookieStore.get("business")?.value || "glass_soler";

  const filters: any[] = [isNull(activities.completedAt)];

  if (business && business !== "all") {
    filters.push(
      or(
        eq(activities.business, business),
        and(isNull(activities.business), eq(contacts.business, business))
      )!
    );
  }

  const pendingFollowups = await db
    .select({
      id: activities.id,
      type: activities.type,
      description: activities.description,
      contactId: activities.contactId,
      dealId: activities.dealId,
      scheduledAt: activities.scheduledAt,
      completedAt: activities.completedAt,
      createdAt: activities.createdAt,
      contactName: contacts.name,
      contactCompany: contacts.company,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .where(and(...filters))
    .orderBy(asc(activities.scheduledAt))
    .all();

  const now = Date.now() / 1000;

  const categorized = {
    overdue: pendingFollowups.filter((f) => {
      if (!f.scheduledAt) return false;
      const ts =
        typeof f.scheduledAt === "number"
          ? f.scheduledAt
          : f.scheduledAt.getTime() / 1000;
      return ts < now;
    }),
    today: pendingFollowups.filter((f) => {
      if (!f.scheduledAt) return false;
      const ts =
        typeof f.scheduledAt === "number"
          ? f.scheduledAt
          : f.scheduledAt.getTime() / 1000;
      const startOfDay = Math.floor(now / 86400) * 86400;
      const endOfDay = startOfDay + 86400;
      return ts >= startOfDay && ts < endOfDay;
    }),
    upcoming: pendingFollowups.filter((f) => {
      if (!f.scheduledAt) return false;
      const ts =
        typeof f.scheduledAt === "number"
          ? f.scheduledAt
          : f.scheduledAt.getTime() / 1000;
      const endOfDay = (Math.floor(now / 86400) + 1) * 86400;
      return ts >= endOfDay;
    }),
    unscheduled: pendingFollowups.filter((f) => !f.scheduledAt),
  };

  return NextResponse.json(categorized);
}

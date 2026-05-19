import { NextRequest, NextResponse } from "next/server";

// Live Meta Ads data fetcher
// Reads from Meta Graph API on demand. Token must be refreshed every 1-2h via Graph Explorer.

const META_API = `https://graph.facebook.com/${process.env.META_API_VERSION || "v25.0"}`;
const TOKEN = process.env.META_ADS_TOKEN || "";

const ACCOUNTS: Record<string, { id: string; currency: string; label: string }> = {
  glass: {
    id: process.env.META_ADS_ACCOUNT_GLASS || "act_1101364862188478",
    currency: "USD",
    label: "Glass Soler",
  },
  glass_soler: {
    id: process.env.META_ADS_ACCOUNT_GLASS || "act_1101364862188478",
    currency: "USD",
    label: "Glass Soler",
  },
  esmeraldas: {
    id: process.env.META_ADS_ACCOUNT_ESMERALDAS || "act_1868510380157902",
    currency: "CRC",
    label: "Esmeraldas Soler",
  },
  esmeraldas_soler: {
    id: process.env.META_ADS_ACCOUNT_ESMERALDAS || "act_1868510380157902",
    currency: "CRC",
    label: "Esmeraldas Soler",
  },
  autos: {
    id: process.env.META_ADS_ACCOUNT_AUTOS || "act_2385776465260628",
    currency: "CRC",
    label: "Autos Soler",
  },
  autos_soler: {
    id: process.env.META_ADS_ACCOUNT_AUTOS || "act_2385776465260628",
    currency: "CRC",
    label: "Autos Soler",
  },
  inversiones: {
    id: process.env.META_ADS_ACCOUNT_INVERSIONES || "",
    currency: "USD",
    label: "Inversiones Soler",
  },
  inversiones_soler: {
    id: process.env.META_ADS_ACCOUNT_INVERSIONES || "",
    currency: "USD",
    label: "Inversiones Soler",
  },
};

interface Insight {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpm?: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
}

interface Campaign {
  id: string;
  name: string;
  effective_status: string;
  objective: string;
  daily_budget?: string;
  insights?: { data?: Insight[] };
}

interface NormalizedCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget: number;
  spend7d: number;
  impressions7d: number;
  reach7d: number;
  clicks7d: number;
  ctr7d: number;
  cpm7d: number;
  messages7d: number;
  costPerMessage: number;
}

async function fetchGraph<T>(path: string): Promise<T | { error: string }> {
  if (!TOKEN) {
    return { error: "META_ADS_TOKEN not configured in .env.local" };
  }
  const sep = path.includes("?") ? "&" : "?";
  const url = `${META_API}${path}${sep}access_token=${TOKEN}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text();
      let msg = body;
      try {
        const parsed = JSON.parse(body);
        msg = parsed?.error?.message || body;
      } catch {}
      return { error: `Meta API ${res.status}: ${msg.slice(0, 200)}` };
    }
    return (await res.json()) as T;
  } catch (e) {
    return { error: `Fetch failed: ${(e as Error).message}` };
  }
}

function extractMessages(insight: Insight): number {
  const actions = insight.actions || [];
  let msgs = 0;
  for (const a of actions) {
    const t = a.action_type || "";
    if (
      t.includes("messaging_conversation") ||
      t === "onsite_conversion.messaging_conversation_started_7d" ||
      t.includes("onsite_conversion.messaging")
    ) {
      msgs += parseInt(a.value || "0", 10);
    }
  }
  return msgs;
}

function normalize(c: Campaign, currency: string): NormalizedCampaign {
  const insight = c.insights?.data?.[0] || {};
  const spend = parseFloat(insight.spend || "0");
  const impressions = parseInt(insight.impressions || "0", 10);
  const reach = parseInt(insight.reach || "0", 10);
  const clicks = parseInt(insight.clicks || "0", 10);
  const ctr = parseFloat(insight.ctr || "0");
  const cpm = parseFloat(insight.cpm || "0");
  const messages = extractMessages(insight);

  // daily_budget is in cents (USD) or hundredths (CRC). Divide by 100.
  const dailyBudget = parseFloat(c.daily_budget || "0") / 100;

  return {
    id: c.id,
    name: c.name,
    status: c.effective_status,
    objective: c.objective,
    dailyBudget,
    spend7d: spend,
    impressions7d: impressions,
    reach7d: reach,
    clicks7d: clicks,
    ctr7d: ctr,
    cpm7d: cpm,
    messages7d: messages,
    costPerMessage: messages > 0 ? spend / messages : 0,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessParam = (searchParams.get("business") || "glass").toLowerCase();
  const account = ACCOUNTS[businessParam];

  if (!account) {
    return NextResponse.json(
      {
        error: `Unknown business: ${businessParam}. Use glass_soler, esmeraldas_soler, autos_soler o inversiones_soler.`,
      },
      { status: 400 }
    );
  }

  if (!account.id) {
    return NextResponse.json(
      {
        error: `Cuenta publicitaria no configurada para ${account.label}. Falta META_ADS_ACCOUNT_* en .env`,
        account: account.label,
      },
      { status: 503 }
    );
  }

  const path =
    `/${account.id}/campaigns` +
    `?fields=id,name,effective_status,objective,daily_budget,insights.date_preset(last_7d)%7B` +
    `spend,impressions,reach,clicks,ctr,cpm,frequency,actions%7D` +
    `&limit=100`;

  const raw = await fetchGraph<{ data?: Campaign[] }>(path);
  if ("error" in raw) {
    return NextResponse.json({ error: raw.error, account: account.label }, { status: 502 });
  }

  const campaigns = (raw.data || []).map((c) => normalize(c, account.currency));

  const active = campaigns.filter((c) => c.status === "ACTIVE");
  const paused = campaigns.filter((c) => c.status === "PAUSED");

  const totals = active.reduce(
    (acc, c) => {
      acc.spend += c.spend7d;
      acc.impressions += c.impressions7d;
      acc.reach += c.reach7d;
      acc.clicks += c.clicks7d;
      acc.messages += c.messages7d;
      return acc;
    },
    { spend: 0, impressions: 0, reach: 0, clicks: 0, messages: 0 }
  );

  const avgCtr =
    totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgCostPerMessage =
    totals.messages > 0 ? totals.spend / totals.messages : 0;

  return NextResponse.json({
    account: {
      id: account.id,
      label: account.label,
      currency: account.currency,
    },
    summary: {
      activeCount: active.length,
      pausedCount: paused.length,
      totalCount: campaigns.length,
      spend7d: totals.spend,
      impressions7d: totals.impressions,
      reach7d: totals.reach,
      clicks7d: totals.clicks,
      messages7d: totals.messages,
      avgCtr7d: avgCtr,
      avgCostPerMessage7d: avgCostPerMessage,
    },
    active,
    paused: paused.slice(0, 50),
    fetchedAt: new Date().toISOString(),
  });
}

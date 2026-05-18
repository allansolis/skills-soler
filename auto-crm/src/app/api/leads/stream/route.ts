// SSE (Server-Sent Events) stream para leads en tiempo real.
// Cliente: const ev = new EventSource('/api/leads/stream?business=all')
// Cada 5 seg pushea snapshot de stats. Mucho menos overhead que polling HTTP.

import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BOT_PORTS: Record<string, number> = {
  esmeraldas_soler: 5000,
  glass_soler: 5001,
  autos_soler: 5002,
  inversiones_soler: 5003,
};

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

async function fetchBotStats(port: number) {
  try {
    const res = await fetch(`http://localhost:${port}/leads/stats`, {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchBotHot(port: number) {
  try {
    const res = await fetch(`http://localhost:${port}/leads/hot`, {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const business = request.nextUrl.searchParams.get("business") || "all";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          if (business === "all") {
            const results = await Promise.all(
              Object.entries(BOT_PORTS).map(async ([biz, port]) => {
                const [stats, hot] = await Promise.all([
                  fetchBotStats(port),
                  fetchBotHot(port),
                ]);
                return { business: biz, stats, hot };
              })
            );
            const payload = {
              timestamp: new Date().toISOString(),
              type: "snapshot",
              data: results,
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
            );
          } else {
            const port = BOT_PORTS[business];
            if (port) {
              const [stats, hot] = await Promise.all([
                fetchBotStats(port),
                fetchBotHot(port),
              ]);
              const payload = {
                timestamp: new Date().toISOString(),
                type: "snapshot",
                business,
                stats,
                hot,
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
              );
            }
          }
        } catch (e) {
          const errPayload = {
            timestamp: new Date().toISOString(),
            type: "error",
            error: String(e),
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errPayload)}\n\n`)
          );
        }
      };

      // Initial snapshot
      await sendUpdate();

      // Cada 5 segundos
      const interval = setInterval(sendUpdate, 5000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

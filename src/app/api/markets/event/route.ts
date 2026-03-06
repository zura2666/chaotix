import { NextRequest, NextResponse } from "next/server";
import { getMarketByCanonical } from "@/lib/markets";
import { prisma } from "@/lib/db";
import { applyNarrativeCatalystToMarket } from "@/lib/narrative-catalyst";

type Body = {
  market?: string;
  event?: string;
  title?: string;
  description?: string;
  source?: string;
  impactScore?: number;
};

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expect { market, event [, description, source, impactScore] }" },
      { status: 400 }
    );
  }

  const marketParam = (body.market ?? "").toString().trim();
  const title = (body.event ?? body.title ?? "").toString().trim();
  if (!marketParam || !title) {
    return NextResponse.json(
      { error: "Missing required fields: market (canonical id) and event (title)" },
      { status: 400 }
    );
  }

  const market = await getMarketByCanonical(marketParam);
  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  const impactScore = body.impactScore != null
    ? Math.max(-1, Math.min(1, Number(body.impactScore)))
    : 0;

  const narrativeEvent = await prisma.narrativeEvent.create({
    data: {
      marketId: market.id,
      title,
      description: (body.description ?? "").toString().trim() || null,
      source: (body.source ?? "").toString().trim() || null,
      impactScore,
    },
  });

  applyNarrativeCatalystToMarket(market.id).catch(() => {});

  return NextResponse.json({
    ok: true,
    event: {
      id: narrativeEvent.id,
      marketId: narrativeEvent.marketId,
      title: narrativeEvent.title,
      description: narrativeEvent.description,
      source: narrativeEvent.source,
      timestamp: narrativeEvent.timestamp.toISOString(),
      impactScore: narrativeEvent.impactScore,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getCache, makeKey, setCache } from "~/libs/cache";
import { etagFor } from "~/libs/hash";
import { getSupabaseServer } from "~/libs/supabase";

export const runtime = "nodejs";

type RunRow = { id: number; start_time: string | null };
type RunsPayload = { runs: RunRow[] };

function secondsUntilNext03UTC(): number {
  const now = new Date();
  const current = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    )
  );
  const target = new Date(
    Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate(),
      3,
      0,
      0
    )
  );
  if (current.getUTCHours() >= 3) target.setUTCDate(target.getUTCDate() + 1);
  const diffMs = target.getTime() - current.getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
}

function dynamicTTLSeconds(): number {
  // cache until next 03:00 UTC or 1 hour, whichever is longer
  return Math.max(3600, secondsUntilNext03UTC());
}

export const GET = async (req: NextRequest) => {
  try {
    const supabase = getSupabaseServer();
    const ifNoneMatch =
      req.headers.get("if-none-match")?.replace(/W\//, "") ?? null;

    const cacheKey = makeKey("runs:list", {});
    const cached = getCache<RunsPayload>(cacheKey);
    if (cached) {
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: cached.etag,
            "Cache-Control": `public, s-maxage=${dynamicTTLSeconds()}, stale-while-revalidate=120`,
            Vary: "If-None-Match",
          },
        });
      }
      return new NextResponse(JSON.stringify(cached.value), {
        headers: {
          ETag: cached.etag,
          "Cache-Control": `public, s-maxage=${dynamicTTLSeconds()}, stale-while-revalidate=120`,
          "Content-Type": "application/json",
          Vary: "If-None-Match",
        },
      });
    }

    const { data, error } = await supabase
      .from("benchmark_runs")
      .select("id,start_time")
      .order("id", { ascending: false });

    if (error) throw error;

    const payload: RunsPayload = { runs: (data ?? []) as RunRow[] };
    const etag = etagFor(payload);
    setCache(cacheKey, payload, dynamicTTLSeconds() * 1000, etag);

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": `public, s-maxage=${dynamicTTLSeconds()}, stale-while-revalidate=120`,
          Vary: "If-None-Match",
        },
      });
    }

    return new NextResponse(JSON.stringify(payload), {
      headers: {
        ETag: etag,
        "Cache-Control": `public, s-maxage=${dynamicTTLSeconds()}, stale-while-revalidate=120`,
        "Content-Type": "application/json",
        Vary: "If-None-Match",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
};

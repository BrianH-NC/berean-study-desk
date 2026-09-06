// Deploy path: supabase/functions/votd/index.ts
//
// No secret needed -- BibleGateway's Verse of the Day feed is free and
// unauthenticated (https://www.biblegateway.com/usage/votd/docs/). It's
// proxied server-side purely because the feed sends no CORS headers, so a
// browser can't fetch it directly from the app's own origin.
//
// Only the day's REFERENCE is taken from BibleGateway (e.g. "Matthew
// 28:18-20") -- the actual verse text shown in the app comes from the
// app's own local BSB copy (src/lib/votd.js), not BibleGateway's NIV text,
// keeping this free of their content-attribution requirements beyond
// crediting them for the daily pick itself (done in the UI, not here).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FEED_URL = "https://www.biblegateway.com/usage/votd/rss/votd.rdf";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function getAuthedUser(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (!(await getAuthedUser(req))) {
    return new Response(JSON.stringify({ error: "Sign in required." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `BibleGateway feed error (${res.status})` }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const xml = await res.text();
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
    const titleMatch = itemMatch?.[1].match(/<title>([^<]+)<\/title>/);
    const reference = titleMatch?.[1]?.trim();

    if (!reference) {
      return new Response(JSON.stringify({ error: "Could not find a reference in today's feed." }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reference }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

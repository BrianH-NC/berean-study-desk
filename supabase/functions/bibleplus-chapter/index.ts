// Deploy path: supabase/functions/bibleplus-chapter/index.ts
//
// Before it works, set the secret:
//   Edge Functions > Secrets > add API_BIBLE_KEY
// or via CLI: supabase secrets set API_BIBLE_KEY=...
//
// Backs the licensed API.Bible translations (NIV, NLT, CSB) the same way
// esv-passage backs ESV -- these are copyrighted, so the key stays
// server-side and only a signed-in user's own token can call this.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const API_BIBLE_KEY = Deno.env.get("API_BIBLE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const API_BASE = "https://rest.api.bible/v1";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  if (!API_BIBLE_KEY) {
    return new Response(
      JSON.stringify({ error: "API_BIBLE_KEY secret is not set on this function." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  if (!(await getAuthedUser(req))) {
    return new Response(JSON.stringify({ error: "Sign in required." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { bibleId, chapterId } = await req.json();
    if (!bibleId || !chapterId) {
      return new Response(JSON.stringify({ error: "bibleId and chapterId are required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      "content-type": "json",
      "include-titles": "false",
      "include-chapter-numbers": "false",
      "include-verse-numbers": "true",
      "include-notes": "false",
    });

    const apiRes = await fetch(`${API_BASE}/bibles/${bibleId}/chapters/${chapterId}?${params}`, {
      headers: { "api-key": API_BIBLE_KEY },
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return new Response(JSON.stringify({ error: `API.Bible error: ${errText}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data } = await apiRes.json();
    return new Response(
      JSON.stringify({ content: data.content, reference: data.reference, copyright: data.copyright }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

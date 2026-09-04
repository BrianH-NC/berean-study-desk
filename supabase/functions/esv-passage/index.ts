// Deploy path: supabase/functions/esv-passage/index.ts
//
// Before it works, set the secret:
//   Edge Functions > Secrets > add ESV_API_KEY
// or via CLI: supabase secrets set ESV_API_KEY=...
//
// ESV text is copyrighted (unlike the public-domain KJV/ASV bundled in
// digging-deep-notebook), so it's fetched live from Crossway's API rather
// than shipped as a static file. The API key stays server-side here for the
// same reason the Anthropic key does in theology-check: exposing it
// client-side would let anyone extract and reuse it.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ESV_API_KEY = Deno.env.get("ESV_API_KEY");
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (!ESV_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ESV_API_KEY secret is not set on this function." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  try {
    const { reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      q: reference,
      "include-headings": "false",
      "include-footnotes": "false",
      "include-verse-numbers": "true",
      "include-short-copyright": "false",
      "include-passage-references": "false",
    });

    const esvRes = await fetch(`https://api.esv.org/v3/passage/text/?${params}`, {
      headers: { Authorization: `Token ${ESV_API_KEY}` },
    });

    if (!esvRes.ok) {
      const errText = await esvRes.text();
      return new Response(JSON.stringify({ error: `ESV API error: ${errText}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await esvRes.json();
    const text = (data.passages || []).join("\n\n").trim();

    if (!text) {
      return new Response(JSON.stringify({ error: "No passage found for that reference." }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ text, canonical: data.canonical || reference }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

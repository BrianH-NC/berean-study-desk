// Deploy path: supabase/functions/theology-check/index.ts
//
// Deploy via dashboard: Edge Functions > Deploy a new function > Via Editor,
// name it "theology-check", paste this in.
//
// Before it works, set the secret:
//   Edge Functions > Secrets > add ANTHROPIC_API_KEY
// or via CLI: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
// Only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are reliably auto-injected
// into every Edge Function -- SUPABASE_ANON_KEY is not guaranteed, so the
// service role key is used here purely to construct a client capable of
// verifying the caller's JWT via auth.getUser(). This does not grant the
// caller any service-role privileges; it only validates their own token.
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// The anon key alone (verify_jwt's minimum bar) isn't enough to call this --
// it's public, embedded in the deployed site's JS bundle. This checks that
// the caller sent a real signed-in user's access token, so a stranger who
// finds the site can't run up the Claude API bill without an account.
async function getAuthedUser(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function callClaude(prompt: string, maxTokens: number) {
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    throw new Error(`Anthropic API error: ${errText}`);
  }

  const data = await anthropicRes.json();
  const textBlocks = (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text);
  return textBlocks.join("\n").trim();
}

function buildSubjectDescription(kind: string, title?: string, authors?: string, name?: string, description?: string) {
  return kind === "book"
    ? `Book title: "${title}"\nAuthor(s): ${authors}${description ? `\nPublisher description: ${String(description).slice(0, 600)}` : ""}`
    : `Person: ${name} (pastor, author, or teacher)`;
}

function assessmentPrompt(kind: string, subjectDescription: string, confessionName: string, confessionSlug: string, wideScope = true) {
  return `You are assisting a conservative Southern Baptist reader in evaluating theological soundness. Evaluate the following ${kind === "book" ? "book" : "person"} against conservative Southern Baptist doctrine, using ${confessionName} as the primary doctrinal reference point.

${subjectDescription}

Base your assessment on what is publicly known about this ${kind === "book" ? "book's content and the author's known theological positions" : "person's teaching, writing, and known theological positions"}. If you are not confident in your knowledge of this specific ${kind}, say so honestly rather than guessing.
${wideScope ? `
Use the verdict "Baptism/Polity Distinctive" specifically when the author or work is otherwise theologically sound by conservative evangelical standards, and the ONLY significant divergence from Baptist doctrine is over paedobaptism (infant baptism) versus believer's baptism, and/or church governance (presbyterian, connectional, or episcopal polity versus congregational autonomy). This applies to traditions like Presbyterian (PCA, PCUSA, OPC), Anglican, Methodist, Lutheran, and other paedobaptist Reformed traditions. Do not use "Caution" or "Concern" for this specific pair of distinctives alone — reserve those for divergence on other doctrinal areas (soteriology beyond baptism, biblical authority, gender roles, sexuality, eschatology, etc.), including when they appear alongside a baptism/polity difference. When you use "Baptism/Polity Distinctive", make sure the concerns list and denominationalNote clearly state whether the divergence is baptism, polity, or both.` : `
${confessionName} is a narrow, single-issue document, not a comprehensive confession of faith — it speaks to one doctrinal area only. Scope your strengths and concerns SPECIFICALLY to what this document actually addresses. Do not fabricate concerns about doctrinal areas the document itself is silent on. If there is genuinely nothing meaningful to say in strengths or concerns because the subject doesn't clearly engage this document's specific topic, it is fine to return an empty array for either or both, and let the summary say so plainly (e.g. "This book does not substantially engage [topic], so this comparison offers limited insight.").`}
${confessionSlug === "bfm2000" ? `
Also identify, if you can determine it from what is publicly known, this author or person's view on the age of the earth/universe and origins. Use "Young-Earth Creationist" for those holding to a young earth (roughly thousands of years old, e.g. via a literal Genesis reading or Answers in Genesis / Ken Ham style views), "Old-Earth Creationist" for those who hold the earth/universe to be billions of years old while still affirming God as creator and rejecting unguided evolution (e.g. day-age, gap theory, progressive creationism), "Theistic Evolutionist" for those who hold God used evolutionary processes over billions of years, "Intelligent Design" when the person explicitly advocates design arguments without an established age-of-earth position, "Evolution" when acceptance of evolutionary origins is known but a theistic interpretation is not established, and "Not Addressed / Unclear" if this has not been publicly stated or you cannot determine it with reasonable confidence. This is informational only and should NOT affect the verdict field — the age of the earth is not a Baptist Faith and Message distinctive, so do not treat a young-earth or old-earth position itself as a point of concern or alignment in the strengths/concerns lists unless the person has made it an explicit doctrinal test for others. Do not infer atheism from acceptance of evolution or infer an old earth from Intelligent Design. If multiple positions are explicitly supported, preserve that nuance in creationView with semicolon-separated labels. Do not guess from denomination alone.

If, and only if, your verdict is "Concern", also suggest one well-known book or author that covers similar ground (genre, topic, or purpose) but is more clearly aligned with conservative Southern Baptist doctrine, so the reader has a constructive alternative rather than just a warning. Be specific (a real title and author), and briefly say in one clause why it's a sounder choice on the relevant point. Leave this null for every other verdict.
` : ""}
If your confidence is not High, briefly say in one clause what specifically limits your confidence (e.g. thin public information on this particular title, a lesser-known author, conflicting accounts). Leave this null when confidence is High.

Respond with ONLY a JSON object, no other text, no markdown fences, in exactly this shape:
{
  "verdict": "Sound" | "Baptism/Polity Distinctive" | "Caution" | "Concern" | "Unable to Assess",
  "summary": "2-3 sentence plain-language summary of the theological orientation",
  "strengths": ["up to 3 short points of alignment with the reference standard"],
  "concerns": ["up to 4 short points of divergence or concern, citing the doctrinal area, e.g. soteriology, ecclesiology, eschatology, gender roles, biblical authority, baptism, polity"],
  "denominationalNote": "1 sentence noting the author/person's known denominational or theological tradition if known"${confessionSlug === "bfm2000" ? `,
  "creationView": "Young-Earth Creationist" | "Old-Earth Creationist" | "Intelligent Design" | "Evolution" | "Theistic Evolutionist" | "Not Addressed / Unclear",
  "alternativeSuggestion": "a specific title/author and brief reason, or null unless verdict is Concern"` : ""},
  "confidenceNote": "brief reason confidence isn't High, or null",
  "confidence": "High" | "Medium" | "Low"
}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY secret is not set on this function." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const user = await getAuthedUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Sign in required." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const action = body.action || "assess";

    // ── Primary assessment (BFM 2000) — same behavior as before, just refactored ──
    if (action === "assess") {
      const { kind, title, authors, description, name } = body;
      if (kind !== "book" && kind !== "person") {
        return new Response(JSON.stringify({ error: "kind must be 'book' or 'person'" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const subjectDescription = buildSubjectDescription(kind, title, authors, name, description);
      const prompt = assessmentPrompt(kind, subjectDescription, "the Baptist Faith and Message 2000 (BFM 2000)", "bfm2000");
      const rawText = await callClaude(prompt, 1200);
      const cleaned = rawText.replace(/^```json\s*|```$/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return new Response(JSON.stringify({ error: "Could not parse model response", raw: rawText }), {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(parsed), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    // ── Alternate confession comparison (e.g. 1689 London Baptist Confession) ──
    if (action === "compareConfession") {
      const { kind, title, authors, description, name, confessionName, wideScope } = body;
      if (kind !== "book" && kind !== "person") {
        return new Response(JSON.stringify({ error: "kind must be 'book' or 'person'" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const subjectDescription = buildSubjectDescription(kind, title, authors, name, description);
      const prompt = assessmentPrompt(kind, subjectDescription, confessionName || "the 1689 London Baptist Confession", "other", wideScope !== false);
      const rawText = await callClaude(prompt, 900);
      const cleaned = rawText.replace(/^```json\s*|```$/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return new Response(JSON.stringify({ error: "Could not parse model response", raw: rawText }), {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(parsed), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    // ── Follow-up question about an existing check ──
    if (action === "followup") {
      const { checkContext, question } = body;
      if (!checkContext || !question) {
        return new Response(JSON.stringify({ error: "checkContext and question are required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const prompt = `You previously gave this doctrinal assessment, evaluated against the Baptist Faith and Message 2000:

Subject: ${checkContext.label}
Verdict: ${checkContext.verdict}
Summary: ${checkContext.summary}
${checkContext.strengths?.length ? `Points of alignment: ${checkContext.strengths.join("; ")}` : ""}
${checkContext.concerns?.length ? `Points of concern: ${checkContext.concerns.join("; ")}` : ""}
${checkContext.denominationalNote ? `Denominational note: ${checkContext.denominationalNote}` : ""}
${checkContext.creationView ? `Recorded creation/origins position (informational): ${checkContext.creationView}` : ""}

The reader now asks a follow-up question about this specific assessment:
"${question}"

Answer directly and conversationally in 2-4 sentences, staying consistent with the assessment above. If the question asks for something you don't have enough information to answer confidently, say so plainly rather than guessing. Respond with plain text only — no JSON, no markdown formatting, no preamble like "Sure" or "Great question".`;

      const answer = await callClaude(prompt, 400);
      return new Response(JSON.stringify({ answer }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

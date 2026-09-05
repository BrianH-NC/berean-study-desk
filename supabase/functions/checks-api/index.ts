// Deploy path: supabase/functions/checks-api/index.ts
//
// Deploy via dashboard: Edge Functions > Deploy a new function > Via Editor,
// name it "checks-api", paste this in.
//
// No new secret needed — SUPABASE_URL, SUPABASE_ANON_KEY, and
// SUPABASE_SERVICE_ROLE_KEY are automatically available to every Edge
// Function on this platform. The service role key bypasses Row Level
// Security, which is exactly why this function exists: the theology_checks
// table should have NO policy granting the public anon key direct access,
// so this is the only path in.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// The anon key alone (verify_jwt's minimum bar) isn't enough to call this --
// it's public, embedded in the deployed site's JS bundle. This checks that
// the caller sent a real signed-in user's access token. theology_checks
// itself is a shared/global table by design (every signed-in user can read
// and add to it, same as before), but "listHolyShelfUnchecked" below reads
// the per-user books table and must not leak one user's shelf to another.
async function getAuthedUser(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: "Server misconfiguration: service role credentials unavailable." }, 500);
  }

  const user = await getAuthedUser(req);
  if (!user) {
    return json({ error: "Sign in required." }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "list") {
      const { data, error } = await admin
        .from("theology_checks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return json({ data, error: error ? error.message : null });
    }

    if (action === "lookupExisting") {
      const { kind, isbn, name } = body;
      let query = admin.from("theology_checks").select("id, tags, is_wishlist, cover_url").eq("kind", kind);
      if (kind === "book" && isbn) {
        query = query.eq("isbn", isbn);
      } else if (kind === "person" && name) {
        query = query.ilike("name", name);
      } else {
        return json({ data: null, error: null });
      }
      const { data, error } = await query.limit(1);
      return json({ data: (data && data[0]) || null, error: error ? error.message : null });
    }

    if (action === "insert") {
      const { row } = body;
      const { error } = await admin.from("theology_checks").insert(row);
      return json({ error: error ? error.message : null });
    }

    if (action === "update") {
      const { id, values } = body;
      if (!id || !values) return json({ error: "id and values are required" }, 400);
      const { error } = await admin.from("theology_checks").update(values).eq("id", id);
      return json({ error: error ? error.message : null });
    }

    if (action === "restoreRow") {
      const { row } = body;
      if (!row) return json({ error: "row is required" }, 400);
      // Upsert by primary key: a matching id overwrites that entry, a new id inserts fresh.
      // This makes re-importing the same backup file safe to run more than once.
      const { error } = await admin.from("theology_checks").upsert(row, { onConflict: "id" });
      return json({ error: error ? error.message : null });
    }

    if (action === "listHolyShelfUnchecked") {
      // Cross-check against the Holy Shelf "books" table in this same Supabase
      // project, scoped to the caller's own shelf -- this is the one action
      // here that touches per-user data, so it must not read other users'
      // books. Only books with an ISBN are matched, since that's the one
      // reliable key shared between the two apps.
      const { data: books, error: booksErr } = await admin
        .from("books")
        .select("id, isbn, title, author, cover_url")
        .eq("user_id", user.id)
        .not("isbn", "is", null)
        .neq("isbn", "");
      if (booksErr) return json({ error: booksErr.message });

      const { data: checked, error: checkedErr } = await admin
        .from("theology_checks")
        .select("isbn")
        .eq("kind", "book")
        .not("isbn", "is", null);
      if (checkedErr) return json({ error: checkedErr.message });

      const checkedSet = new Set((checked || []).map((c: { isbn: string }) => c.isbn));
      const unchecked = (books || []).filter((b: { isbn: string }) => b.isbn && !checkedSet.has(b.isbn));
      return json({ data: unchecked, error: null });
    }

    if (action === "bulkUpdate") {
      // Applies a tag addition and/or a wishlist flag to many rows in one request.
      // Tags are merged (not replaced) per row, same as the single-entry save behavior.
      const { ids, addTag, setWishlist } = body;
      if (!Array.isArray(ids) || !ids.length) return json({ error: "ids array required" }, 400);

      const { data: existingRows, error: fetchErr } = await admin
        .from("theology_checks")
        .select("id, tags")
        .in("id", ids);
      if (fetchErr) return json({ error: fetchErr.message });

      let updatedCount = 0;
      for (const row of existingRows || []) {
        const values: Record<string, unknown> = {};
        if (addTag) {
          values.tags = Array.from(new Set([...(row.tags || []), addTag]));
        }
        if (setWishlist === true || setWishlist === false) {
          values.is_wishlist = setWishlist;
        }
        if (Object.keys(values).length === 0) continue;
        const { error: updErr } = await admin.from("theology_checks").update(values).eq("id", row.id);
        if (!updErr) updatedCount++;
      }
      return json({ data: { updatedCount }, error: null });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

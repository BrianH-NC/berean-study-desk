import { supabase } from './supabase'

// The owner's author rules, newest first.
export async function loadVerdictRules(userId) {
  const { data, error } = await supabase.from('author_verdict_rules').select('*').eq('user_id', userId).order('author')
  if (error) throw error
  return data || []
}

// Latest Doctrine Check per ISBN.
export async function loadChecksByIsbn() {
  const { data, error } = await supabase.from('theology_checks').select('id, isbn, verdict, created_at').eq('kind', 'book').not('isbn', 'is', null).order('created_at', { ascending: false })
  if (error) throw error
  const map = {}
  for (const c of data || []) if (c.isbn && !map[c.isbn]) map[c.isbn] = c
  return map
}

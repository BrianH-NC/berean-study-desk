// Saving an excerpt (a commentary paragraph, a cross-referenced verse) into the user's notes.
// Pure document building lives in excerpts.js; this is the part that talks to Supabase.
import { supabase } from './supabase'
import { createEntry, getEntry } from './entries'
import { plainDocument } from './noteModel'
import { appendToDoc, docPlainText, mergeRefs } from './excerpts'

// A new Bible Study note holding just the excerpt.
export async function createNoteWithExcerpt(userId, { title, refs, nodes }) {
  const doc = appendToDoc(null, nodes)
  return createEntry(userId, { title, ref: mergeRefs(null, refs), body: docPlainText(doc), rich_doc: doc, note_type: 'bible_study' })
}

// Adds the excerpt to the end of an existing note. The update only applies to the version of
// the note that was just read (the same check the note editor makes), so it can never
// overwrite an edit made in between. Every update is also kept by the entries revision
// trigger, so the previous text stays available from the note's history.
export async function appendToNote(userId, id, { refs, nodes }) {
  const row = await getEntry(id)
  if (!row) throw new Error('That note is no longer available. Choose another.')
  const doc = appendToDoc(row.rich_doc, nodes, plainDocument(row.body))
  let query = supabase.from('entries')
    .update({ rich_doc: doc, body: docPlainText(doc), ref: mergeRefs(row.ref, refs) })
    .eq('id', id).eq('user_id', userId).is('deleted_at', null)
  query = row.updated_at ? query.eq('updated_at', row.updated_at) : query.is('updated_at', null)
  const { data, error } = await query.select('id, number, title').maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('That note changed while you were saving. Nothing was lost; try again.')
  return data
}

// The notes offered in the picker: most recently edited first.
export async function listNotesForPicker(userId, limit = 50) {
  const { data, error } = await supabase.from('entries')
    .select('id, number, title, ref, updated_at')
    .eq('user_id', userId).is('deleted_at', null)
    .order('updated_at', { ascending: false, nullsFirst: false }).limit(limit)
  if (error) throw new Error(error.message)
  return data || []
}

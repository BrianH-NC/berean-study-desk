import { supabase } from './supabase'
import { nextGapNumber } from './entries'
export const highlightColors = { yellow: '#f5cf54', green: '#83c89a', blue: '#81bdeb', pink: '#eda0bf' }
function checked({ data, error }) { if (error) throw error; return data }
export async function listAnnotations(fileId) {
  return checked(await supabase.from('book_annotations').select('*').eq('file_id', fileId).order('created_at')) || []
}
export async function saveAnnotation(userId, fileId, selection, color, body) {
  if (body !== undefined) {
    const rows = checked(await supabase.from('entries').select('number').eq('user_id', userId))
    return checked(await supabase.rpc('create_book_passage_note', {
      p_file_id: fileId, p_location: selection.location, p_quote: selection.quote,
      p_color: color, p_body: body, p_number: nextGapNumber((rows || []).map(row => row.number)),
    }))
  }
  const annotation = checked(await supabase.from('book_annotations').insert({
    user_id: userId, file_id: fileId, location: selection.location, quote: selection.quote, color,
  }).select().single())
  return { annotation }
}
export async function removeAnnotation(id) { checked(await supabase.from('book_annotations').delete().eq('id', id)) }

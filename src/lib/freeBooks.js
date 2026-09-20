import { authHeaders } from './functionAuth'
import { importBookFile } from './bookFiles'
import { supabase } from './supabase'

const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/free-books`
async function responseError(response) {
  const result = await response.json().catch(() => ({}))
  return new Error(result.error || 'The book source could not be reached. Please try again.')
}
export async function searchFreeBooks(params, signal) {
  const response = await fetch(`${endpoint}?${new URLSearchParams(params)}`, { headers: await authHeaders(), signal })
  if (!response.ok) throw await responseError(response)
  return response.json()
}
export async function importFreeBook(userId, book, format) {
  // Reopen a previously imported copy instead of creating another Library entry.
  const { data, error } = await supabase.from('books').select('id').eq('user_id', userId).eq('notes', `Source: ${book.url}`).limit(1)
  if (error) throw error
  if (data?.length) {
    const { data: files, error: fileError } = await supabase.from('book_files').select('id').eq('book_id', data[0].id).limit(1)
    if (fileError) throw fileError
    if (files?.length) return data[0].id
  }
  const response = await fetch(endpoint, { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ source: book.source, id: book.id, format }) })
  if (!response.ok) throw await responseError(response)
  const blob = await response.blob()
  const cleanTitle = [...book.title].filter(character => character.charCodeAt(0) >= 32).join('').replace(/[<>:"/\\|?*]/g, '')
  const filename = `${cleanTitle.slice(0, 120) || 'Book'}.${format}`
  return importBookFile(userId, new File([blob], filename, { type: blob.type }), book)
}

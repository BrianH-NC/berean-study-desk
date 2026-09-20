import { supabase } from './supabase'
import { bookFileFormat } from './readerState'

const bucket = () => supabase.storage.from('book-files')
function checked({ data, error }) { if (error) throw error; return data }

export async function listBookFiles(bookId) {
  return checked(await supabase.from('book_files').select('*').eq('book_id', bookId).order('created_at', { ascending: false }))
}

async function validateBookFile(file) {
  const format = bookFileFormat(file)
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  if (format === 'pdf' ? String.fromCharCode(...signature) !== '%PDF-' : signature[0] !== 80 || signature[1] !== 75) {
    throw new Error('The file contents do not match its PDF or EPUB extension.')
  }
  return format
}

export async function importBookFile(userId, file) {
  await validateBookFile(file)
  const title = file.name.replace(/\.(pdf|epub)$/i, '').replace(/[_]+/g, ' ').trim() || 'Untitled book'
  const book = checked(await supabase.from('books').insert({ user_id: userId, title, reading_status: 'in-progress', tags: [] }).select('id').single())
  try {
    await uploadBookFile(userId, book.id, file)
    return book.id
  } catch (error) {
    const cleanup = await supabase.from('books').delete().eq('id', book.id).eq('user_id', userId)
    if (cleanup.error) throw new Error(`${error.message} An empty Library entry remains; you can retry attaching the file there.`)
    throw error
  }
}

export async function uploadBookFile(userId, bookId, file) {
  const format = await validateBookFile(file)
  const id = crypto.randomUUID(), path = `${userId}/${id}.${format}`
  checked(await bucket().upload(path, file, { contentType: format === 'pdf' ? 'application/pdf' : 'application/epub+zip', upsert: false }))
  try {
    return checked(await supabase.from('book_files').insert({ id, book_id: bookId, user_id: userId, path, format, filename: file.name, bytes: file.size }).select().single())
  } catch (error) {
    await bucket().remove([path])
    throw error
  }
}

export async function downloadBookFile(file) {
  const blob = checked(await bucket().download(file.path))
  return blob.arrayBuffer()
}

export async function removeBookFile(file) {
  // Keep the record if Storage fails so deletion can be retried.
  checked(await bucket().remove([file.path]))
  checked(await supabase.from('book_files').delete().eq('id', file.id))
}

export async function removeBookWithFiles(bookId, userId) {
  // Delete through Storage's API, not storage.objects, to remove the bytes too.
  const files = await listBookFiles(bookId)
  for (const file of files) await removeBookFile(file)
  checked(await supabase.from('books').delete().eq('id', bookId).eq('user_id', userId))
}

export async function loadReaderState(fileId) {
  const [position, bookmarks] = await Promise.all([
    supabase.from('book_reading_positions').select('location').eq('file_id', fileId).maybeSingle(),
    supabase.from('book_bookmarks').select('*').eq('file_id', fileId).order('created_at'),
  ])
  return { location: checked(position)?.location || null, bookmarks: checked(bookmarks) || [] }
}

export async function saveReaderPosition(userId, fileId, location) {
  checked(await supabase.from('book_reading_positions').upsert({ user_id: userId, file_id: fileId, location, updated_at: new Date().toISOString() }))
}

export async function addBookmark(userId, fileId, location, label) {
  return checked(await supabase.from('book_bookmarks').insert({ user_id: userId, file_id: fileId, location, label }).select().single())
}

export async function removeBookmark(id) { checked(await supabase.from('book_bookmarks').delete().eq('id', id)) }

export async function fetchRecommendations(query, signal) {
  try {
    const params=new URLSearchParams({q:`${query} subject:religion`,maxResults:'5',printType:'books'})
    const key=import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
    if(key)params.set('key',key)
    const response=await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(8000)])})
    if(!response.ok)throw new Error('Google Books unavailable')
    const data=await response.json()
    return (data.items||[]).map(item=>({title:item.volumeInfo?.title||'Untitled',author:item.volumeInfo?.authors?.join(', '),year:item.volumeInfo?.publishedDate?.slice(0,4),url:`https://books.google.com/books?id=${encodeURIComponent(item.id)}`,cover:item.volumeInfo?.imageLinks?.thumbnail?.replace('http:','https:'),source:'Google Books'}))
  } catch(error) { if(signal.aborted)throw error }
  const params=new URLSearchParams({q:`${query} theology`,limit:'5',fields:'key,title,author_name,cover_i,first_publish_year'})
  const response=await fetch(`https://openlibrary.org/search.json?${params}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])})
  if(!response.ok)throw new Error('Book recommendations unavailable')
  const data=await response.json()
  return (data.docs||[]).filter(book=>/^\/works\/[A-Za-z0-9]+$/.test(book.key)).map(book=>({title:book.title,author:book.author_name?.join(', '),year:book.first_publish_year,url:`https://openlibrary.org${book.key}`,cover:book.cover_i?`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`:null,source:'Open Library'}))
}

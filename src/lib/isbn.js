export function normalizeISBN(value) {
  return String(value || '').replace(/[\s-]/g, '').toUpperCase()
}

export function isValidISBN(value) {
  const isbn = normalizeISBN(value)
  if (/^\d{9}[\dX]$/.test(isbn)) {
    return [...isbn].reduce((sum, digit, i) => sum + (digit === 'X' ? 10 : Number(digit)) * (10 - i), 0) % 11 === 0
  }
  if (/^97[89]\d{10}$/.test(isbn)) {
    return [...isbn].reduce((sum, digit, i) => sum + Number(digit) * (i % 2 ? 3 : 1), 0) % 10 === 0
  }
  return false
}

// Extracts a last-name sort key from an author stored in natural order
// ("John Smith", not "Smith, John") -- used so the Shelf's "Author" view
// groups/sorts by surname instead of by whatever word comes first.
//
// Two notes on deviations from a literal reading of the spec this was built
// against:
// - "Normalize to title case" vs. "return the sort key as a lowercase
//   string" conflict with each other; the explicit lowercase requirement
//   wins, since that's what's actually needed for stable comparison.
// - Compound-surname detection scans every non-final token (not just the
//   one immediately before the last), and takes the last name from the
//   *first* recognized prefix onward. That handles multi-word compounds
//   like "de la Cruz" correctly, not just the two-word examples in the
//   spec ("von Braun", "da Vinci"). The known tradeoff: a first name that
//   happens to collide with a prefix word (e.g. "Al Pacino") will get
//   swept into the compound too ("al pacino") -- the same ambiguity real
//   library cataloging rules (e.g. MARC21) don't fully resolve either
//   without a curated name authority list, which is out of scope here.

const SUFFIXES = new Set(['jr', 'junior', 'sr', 'senior', 'ii', 'iii', 'iv', 'v', 'phd', 'md', 'esq'])

// Includes "da" alongside the spec's own listed prefixes -- its worked
// example ("Leonardo da Vinci" -> "da Vinci") requires it, even though the
// enumerated prefix list itself omitted it.
const NOBLE_PREFIXES = new Set([
  'von', 'van', 'de', 'del', 'della', 'di', 'da', 'du', 'le', 'la', 'les',
  'dos', 'das', 'bin', 'bint', 'al', 'el', 'ibn',
])

function normalizeToken(token) {
  return token.toLowerCase().replace(/[.,]/g, '')
}

export function extractSortLastName(author) {
  if (!author || typeof author !== 'string') return ''

  const tokens = author.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ''

  // Strip trailing generational/professional suffixes -- possibly more
  // than one (e.g. "John Smith Jr. PhD").
  while (tokens.length > 1 && SUFFIXES.has(normalizeToken(tokens[tokens.length - 1]))) {
    tokens.pop()
  }
  if (tokens.length === 0) return ''
  if (tokens.length === 1) return normalizeToken(tokens[0]).replace(/[.,]+$/, '')

  // Compound/noble surname: the last name starts at the first recognized
  // prefix token (if any) among everything but the final token, and runs
  // through the final token.
  let prefixIndex = -1
  for (let i = 0; i < tokens.length - 1; i++) {
    if (NOBLE_PREFIXES.has(normalizeToken(tokens[i]))) {
      prefixIndex = i
      break
    }
  }

  const lastNameTokens = prefixIndex === -1 ? [tokens[tokens.length - 1]] : tokens.slice(prefixIndex)
  return lastNameTokens
    .map((t) => normalizeToken(t))
    .join(' ')
    .replace(/[.,]+$/, '')
}

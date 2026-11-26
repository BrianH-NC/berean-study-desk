import test from 'node:test'
import assert from 'node:assert/strict'
import { SHELF_TAXONOMY, canonicalISBN, keysFromCodes, parseShelfSeed, planShelfSeed, shelfLabelLines, shelfLabelValues, shelfSubcategory, sortShelfOrder, suggestFilingName } from './shelfLabels.js'

const book = (id, category, subcategory, author, title, extra = {}) => ({ id, shelf_category: category, shelf_subcategory: subcategory, shelf_author: author, title, ...extra })

test('Elliott 1 Peter prints COMM / 1 PET / ELLIOTT', () => {
  assert.deepEqual(shelfLabelLines(book('1', 'comm', '1pet', 'Elliott', '1 Peter')), ['COMM', '1 PET', 'ELLIOTT'])
})

test('one group sorts by filing name regardless of insertion order', () => {
  const sorted = sortShelfOrder([book('a', 'comm', '1pet', 'MICHAELS', '1 Peter'), book('b', 'comm', '1pet', 'ELLIOTT', '1 Peter'), book('c', 'comm', '1pet', 'DODSON', '1-2 Peter and Jude')])
  assert.deepEqual(sorted.map(b => b.shelf_author), ['DODSON', 'ELLIOTT', 'MICHAELS'])
})

test('canon order: Romans before Galatians, individual book before its group, groups at their anchors', () => {
  const comm = SHELF_TAXONOMY.find(c => c.key === 'comm').subs.map(s => s.code)
  assert.ok(comm.indexOf('ROM') < comm.indexOf('GAL'))
  assert.equal(comm[comm.indexOf('NAH') + 1], 'NAH–ZEPH')
  assert.equal(comm[comm.indexOf('MAL') + 1], 'POSTEXILIC')
  assert.equal(comm[comm.indexOf('1 COR') + 1], 'COR')
  assert.ok(comm.indexOf('COR') < comm.indexOf('2 COR'))
  assert.equal(comm[comm.indexOf('PHIL') + 1], 'PHIL–PHLM')
  assert.equal(comm.length, 66 + 4)
})

test('categories run in shelf-plan order and every key is storable', () => {
  assert.deepEqual(SHELF_TAXONOMY.map(c => c.code), ['BIBLE', 'REF', 'COMM', 'BIB', 'DOCT', 'CHURCH', 'APOL', 'SCI', 'HIST', 'LIFE', 'DEV', 'LIT'])
  for (const c of SHELF_TAXONOMY) { assert.match(c.key, /^[a-z0-9_]{1,40}$/); for (const s of c.subs) assert.match(s.key, /^[a-z0-9_]{1,40}$/) }
})

test('two Ross creation titles share a label and sort by title', () => {
  const sorted = sortShelfOrder([book('x', 'sci', 'creation', 'ROSS', 'Why the Universe is the Way it is'), book('y', 'sci', 'creation', 'ROSS', 'Improbable Planet')])
  assert.deepEqual(sorted.map(b => b.title), ['Improbable Planet', 'Why the Universe is the Way it is'])
  assert.deepEqual(shelfLabelLines(sorted[0]), ['SCI', 'CREATION', 'ROSS'])
})

test('volumes sort numerically within a set', () => {
  const sorted = sortShelfOrder([book('2', 'ref', 'geog', 'BEITZEL', 'Lexham Geographic Commentary on the Historical Books, Volume 2 1 Samuel-Esther'), book('1', 'ref', 'geog', 'BEITZEL', 'Lexham Geographic Commentary on the Historical Books, Volume 1 Joshua-Ruth')])
  assert.deepEqual(sorted.map(b => b.id), ['1', '2'])
})

test('unlabeled books sort last', () => {
  const sorted = sortShelfOrder([{ id: 'u', title: 'Aardvark' }, book('l', 'lit', 'fiction', 'LEWIS', 'Zebra')])
  assert.deepEqual(sorted.map(b => b.id), ['l', 'u'])
})

test('switching category invalidates the old subcategory', () => {
  assert.throws(() => shelfLabelValues({ category: 'sci', subcategory: '1pet', author: 'Ross' }), /subcategory under SCI/)
  assert.deepEqual(shelfLabelValues({ category: 'sci', subcategory: 'creation', author: '  ross ' }), { shelf_category: 'sci', shelf_subcategory: 'creation', shelf_author: 'ROSS' })
  assert.deepEqual(shelfLabelValues({}), { shelf_category: null, shelf_subcategory: null, shelf_author: null })
  assert.throws(() => shelfLabelValues({ category: 'sci', subcategory: 'creation', author: ' ' }), /filing name/)
})

test('filing names keep accents, apostrophes and particles', () => {
  assert.equal(suggestFilingName('Flannery O’Connor'), 'O’CONNOR')
  assert.equal(suggestFilingName('Ludwig van Beethoven'), 'VAN BEETHOVEN')
  assert.equal(suggestFilingName('Michel-Yves Bolloré | Olivier Bonnassies'), 'BOLLORÉ')
  assert.equal(suggestFilingName('Dr. David Jeremiah | C.C. Carlson'), 'JEREMIAH')
  assert.equal(suggestFilingName('Answers in Genesis'), 'AIG')
  assert.equal(suggestFilingName('Walter C. Kaiser Jr.'), 'KAISER')
  assert.equal(suggestFilingName('Owen, John'), 'OWEN')
  assert.equal(suggestFilingName(''), '')
  assert.deepEqual(shelfLabelValues({ category: 'comm', subcategory: 'rom', author: 'c k  barrett' }).shelf_author, 'C K BARRETT')
})

test('seed codes resolve to keys, including en-dash groups', () => {
  assert.deepEqual(keysFromCodes('COMM', 'NAH–ZEPH'), { category: 'comm', subcategory: 'nah_zeph' })
  assert.deepEqual(keysFromCodes('COMM', 'PHIL-PHLM'), { category: 'comm', subcategory: 'phil_phlm' })
  assert.deepEqual(keysFromCodes('DOCT', 'GOD & CHRIST'), { category: 'doct', subcategory: 'god_christ' })
  assert.equal(keysFromCodes('SCI', '1 PET'), null)
  assert.ok(shelfSubcategory('ref', 'bible_q'))
})

test('ISBN-10 and ISBN-13 compare equal', () => {
  assert.equal(canonicalISBN('0-310-24146-0'), canonicalISBN('9780310241461'))
})

const SEED = 'isbn\tcategory\tsubcategory\tfiling_author\ttitle\tcatalog_author\n' +
  '9780300139914\tCOMM\t1 PET\tELLIOTT\t1 Peter\tJohn H. Elliott\n' +
  '9781576832882\tSCI\tCREATION\tROSS\tThe Creator and the Cosmos\tHugh Ross\n' +
  '9781886653146\tSCI\tCREATION\tROSS\tThe Creator and the Cosmos\tHugh Ross\n' +
  '9780310521860\tCOMM\t1 PET\tMICHAELS\t1 Peter\tJ. Ramsey Michaels\n' +
  '9780000000000\tCOMM\t1 PET\tNOBODY\tMissing\tNobody\n' +
  '9780849932953\tSCI\t1 PET\tJEREMIAH\tBad pair\tDavid Jeremiah\n' +
  '9780310241461\tREF\tBIBLE Q\tARCHER\tEncyclopedia\tArcher\n'

test('seed dry run reports every status and never merges editions', () => {
  const { rows, error } = parseShelfSeed(SEED)
  assert.equal(error, '')
  const books = [
    { id: 'e', isbn: '9780300139914' },
    { id: 'r1', isbn: '9781576832882' }, { id: 'r2', isbn: '978-1-886653-14-6' },
    { id: 'm1', isbn: '9780310521860' }, { id: 'm2', isbn: '9780310521860' },
    { id: 'a', isbn: '0310241460', shelf_category: 'ref', shelf_subcategory: 'bible_q', shelf_author: 'ARCHER' },
  ]
  const plan = planShelfSeed(rows, books)
  assert.deepEqual(plan.map(p => p.status), ['ready', 'ready', 'ready', 'ambiguous', 'nomatch', 'invalid', 'same'])
  assert.deepEqual(plan.slice(1, 3).map(p => p.books[0].id), ['r1', 'r2'])
  assert.deepEqual(plan[0].row.label, { category: 'comm', subcategory: '1pet', author: 'ELLIOTT' })
  const differs = planShelfSeed(rows, [{ id: 'e', isbn: '9780300139914', shelf_category: 'comm', shelf_subcategory: '1pet', shelf_author: 'ELLIOT' }])
  assert.equal(differs[0].status, 'differs')
})

test('seed header is validated', () => {
  assert.match(parseShelfSeed('Author,Title,ISBN\nx,y,z').error, /missing isbn/)
})

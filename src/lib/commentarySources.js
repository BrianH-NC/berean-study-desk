// Who wrote each commentary the app offers, for citing an excerpt. A work with no single
// named author (the Geneva notes, the Treasury, Tyndale's open notes) is cited by title.
const SOURCES = {
  'matthew-henry': { author: 'Matthew Henry', work: 'Commentary on the Whole Bible' },
  'john-calvin': { author: 'John Calvin', work: 'Commentaries' },
  'john-gill': { author: 'John Gill', work: 'Exposition of the Entire Bible' },
  'adam-clarke': { author: 'Adam Clarke', work: 'Commentary and Critical Notes on the Bible' },
  'jamieson-fausset-brown': { author: 'Robert Jamieson, A. R. Fausset, and David Brown', work: 'Commentary Critical and Explanatory on the Whole Bible' },
  'keil-delitzsch': { author: 'C. F. Keil and F. Delitzsch', work: 'Commentary on the Old Testament' },
  tyndale: { author: null, work: 'Tyndale Open Study Notes' },
  tsk: { author: null, work: 'Treasury of Scripture Knowledge' },
  barnes: { author: 'Albert Barnes', work: 'Notes on the New Testament' },
  burkitt: { author: 'William Burkitt', work: 'Expository Notes, with Practical Observations, on the New Testament' },
  geneva: { author: null, work: 'Geneva Bible Notes' },
  scofield: { author: 'C. I. Scofield', work: 'Scofield Reference Notes (1917)' },
  pnt: { author: 'B. W. Johnson', work: 'The People’s New Testament' },
  catena: { author: 'Thomas Aquinas', work: 'Catena Aurea' },
}

// { author, work } -- an unknown commentary falls back to the name it was given.
export function commentarySource(id, fallbackName = 'Commentary') {
  return SOURCES[id] || { author: null, work: fallbackName }
}

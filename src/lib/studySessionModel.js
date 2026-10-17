// JSONB returns keys in a different order from JavaScript object literals.
function canonical(value){
  if(Array.isArray(value))return value.map(canonical)
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))
  return value
}
export function sameSessionState(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}

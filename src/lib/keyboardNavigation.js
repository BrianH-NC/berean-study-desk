// Shared arrow-key behavior for action menus. Tab retains normal page navigation.
export function menuIndex(key,current,length) {
  if(!length)return -1
  if(key==='Home')return 0
  if(key==='End')return length-1
  if(key==='ArrowDown')return (current+1)%length
  if(key==='ArrowUp')return current<=0?length-1:current-1
  return -1
}
export function pickerIndex(key,current,length) {
  if(!length)return -1
  if(key==='ArrowDown')return Math.min(length-1,current+1)
  if(key==='ArrowUp')return current<0?length-1:Math.max(0,current-1)
  return current
}

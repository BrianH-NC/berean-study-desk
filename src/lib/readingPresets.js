export const READING_PRESETS = [
  {id:'john',title:'Read John in 21 readings',book:'John',readings:Array.from({length:21},(_,i)=>`John ${i+1}`)},
  {id:'mark',title:'Read Mark in 16 readings',book:'Mark',readings:Array.from({length:16},(_,i)=>`Mark ${i+1}`)},
  {id:'prayer',title:'Seven readings on prayer',book:'Psalms',readings:['Psalm 23','Psalm 46','Psalm 63','Matthew 6:5-15','Luke 11:1-13','Philippians 4:4-9','Colossians 4:2-6']},
]

export function readingPlanStatus(plan,today) {
  if(plan.items.length && plan.items.every((_,i)=>plan.completed[i]))return 'Completed'
  if(plan.paused)return 'Paused'
  if(plan.start_date>today)return 'Upcoming'
  return 'In progress'
}

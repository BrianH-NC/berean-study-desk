import test from 'node:test'
import assert from 'node:assert/strict'
import {menuIndex,pickerIndex} from '../src/lib/keyboardNavigation.js'
test('menus wrap with arrows and support Home and End',()=>{
 assert.equal(menuIndex('ArrowDown',-1,4),0)
 assert.equal(menuIndex('ArrowDown',3,4),0)
 assert.equal(menuIndex('ArrowUp',0,4),3)
 assert.equal(menuIndex('Home',2,4),0)
 assert.equal(menuIndex('End',0,4),3)
 assert.equal(menuIndex('ArrowDown',0,0),-1)
 assert.equal(menuIndex('Tab',2,4),-1)
})
test('search picker starts at first match, retains boundary and handles empty lists',()=>{
 assert.equal(pickerIndex('ArrowDown',-1,4),0)
 assert.equal(pickerIndex('ArrowUp',-1,4),3)
 assert.equal(pickerIndex('ArrowDown',3,4),3)
 assert.equal(pickerIndex('ArrowUp',0,4),0)
 assert.equal(pickerIndex('ArrowDown',-1,0),-1)
})

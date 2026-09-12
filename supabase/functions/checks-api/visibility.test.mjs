import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import test from 'node:test'

test('personal hiding is scoped to the verified caller and can be restored', async () => {
  const id = '11111111-1111-4111-8111-111111111111'
  const rows = [{ id, title: 'Shared assessment' }]
  const hidden = []
  const admin = {
    auth: { getUser: async token => ({ data: { user: token === 'signed-in' ? { id: 'owner' } : null } }) },
    from(table) {
      let filters = [], operation, values
      const q = {
        select() { return q }, order() { return q }, limit() { return q },
        eq(key, value) { filters.push(row => row[key] === value); return q },
        in(key, value) { filters.push(row => value.includes(row[key])); return q },
        not(key, _operator, value) { filters.push(row => !value.slice(1,-1).split(',').includes(row[key])); return q },
        upsert(row) { operation = 'upsert'; values = row; return q },
        delete() { operation = 'delete'; return q },
        then(resolve) {
          const collection = table === 'hidden_doctrine_checks' ? hidden : rows
          if (operation === 'upsert' && !collection.some(row => row.user_id === values.user_id && row.check_id === values.check_id)) collection.push(values)
          if (operation === 'delete') for (let i=collection.length-1;i>=0;i--) if (filters.every(fn => fn(collection[i]))) collection.splice(i,1)
          return Promise.resolve(resolve({ data: collection.filter(row => filters.every(fn => fn(row))), error: null }))
        },
      }
      return q
    },
  }
  let handler
  const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8').replace(/^import .*;$/gm, '')
  vm.runInNewContext(stripTypeScriptTypes(source), { createClient: () => admin, Deno: { env: { get: () => 'fixture' }, serve: fn => { handler = fn } }, Response })
  const call = async (body, token = 'signed-in') => handler({ method: 'POST', headers: new Headers({ Authorization: `Bearer ${token}` }), json: async () => body })
  assert.equal((await call({ action:'setHidden',id,hidden:true },'anonymous')).status,401)
  assert.equal((await call({ action:'setHidden',id:'bad',hidden:true })).status,400)
  hidden.push({ user_id:'someone-else',check_id:id })
  assert.equal((await (await call({action:'list'})).json()).data.length,1)
  await call({action:'setHidden',id,hidden:true,user_id:'someone-else'})
  assert.ok(hidden.some(row => row.user_id === 'owner'))
  assert.equal((await (await call({action:'list'})).json()).data.length,0)
  assert.equal((await (await call({action:'list',hiddenOnly:true})).json()).data.length,1)
  await call({action:'setHidden',id,hidden:false})
  assert.equal((await (await call({action:'list'})).json()).data.length,1)
  assert.equal(hidden.length,1)
  assert.equal(hidden[0].user_id,'someone-else')
  assert.equal(rows.length,1)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {parseHTML} from 'linkedom'
import React, {act, useState, StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {useFormRecovery} from '../src/lib/useFormRecovery.js'
import {safeDestination,rememberDestination,takeDestination} from '../src/lib/signInDestination.js'
const {window}=parseHTML('<html><body><div id="root"></div></body></html>')
globalThis.window=window;globalThis.document=window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
const data=new Map()
globalThis.sessionStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}
let api
function Form({id='u:form',ready=true}){const [value,set]=useState({title:''});const recovery=useFormRecovery(id,value,set,ready);api={set,recovery,value};return React.createElement('p',null,value.title)}
async function mount(props={}){const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(()=>root.render(React.createElement(StrictMode,null,React.createElement(Form,props))));return root}
test('draft survives unmount and StrictMode hydration and clears after explicit save',async()=>{
 data.clear();let root=await mount();await act(()=>api.set({title:'Unfinished packet'}));assert.equal(JSON.parse(data.get('bsd-draft:u:form')).title,'Unfinished packet');await act(()=>root.unmount());root=await mount();assert.equal(api.value.title,'Unfinished packet');assert.equal(JSON.parse(data.get('bsd-draft:u:form')).title,'Unfinished packet');await act(()=>api.recovery.clear());assert.equal(data.has('bsd-draft:u:form'),false);await act(()=>root.unmount());root=await mount();assert.equal(api.value.title,'');await act(()=>root.unmount())
})
test('drafts isolated by account, waits for loaded data, ignores corrupt storage',async()=>{
 data.clear();data.set('bsd-draft:u:form',JSON.stringify({title:'Saved draft'}));let root=await mount({ready:false});assert.equal(api.value.title,'');await act(()=>root.render(React.createElement(StrictMode,null,React.createElement(Form,{ready:true}))));assert.equal(api.value.title,'Saved draft');await act(()=>root.unmount());root=await mount({id:'other:form'});assert.equal(api.value.title,'');await act(()=>root.unmount());data.set('bsd-draft:u:form','bad json');root=await mount();assert.equal(api.value.title,'');await act(()=>root.unmount())
})
test('storage failure is visible instead of claiming successful recovery',async()=>{
 data.clear();const set=sessionStorage.setItem;sessionStorage.setItem=()=>{throw Error('Quota')};const root=await mount();await act(()=>api.set({title:'Cannot persist'}));assert.match(api.recovery.error,/unavailable/);await act(()=>root.unmount());sessionStorage.setItem=set
})
test('return destination is local, single-use and expires',()=>{
 for(const value of ['https://evil.example','//evil.example','/\\evil.example','/a\nb'])assert.equal(safeDestination(value),'/')
 rememberDestination('/bible?book=John&chapter=3');assert.equal(takeDestination(),'/bible?book=John&chapter=3');assert.equal(takeDestination(),'/');data.set('bsd-sign-in-destination',JSON.stringify({path:'/notebook',at:0}));assert.equal(takeDestination(),'/')
})

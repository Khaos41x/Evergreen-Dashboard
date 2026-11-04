// Actual ProfilesProvider in Chromium; controlled profile transport, no hosted users or keys.
import {chromium} from 'playwright-core'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
const fixture=`window.avatarQA={calls:[],pending:[]};export const checked=async p=>(await p).data;export const db=()=>({rpc:(_,{p_workspace})=>new Promise(resolve=>{window.avatarQA.calls.push(p_workspace);window.avatarQA.pending.push({scope:p_workspace,resolve})}),storage:{from:()=>({createSignedUrl:async p=>({data:{signedUrl:'/avatar-fixture/'+p}})})}});`
const html=`<!doctype html><html><body><div id="root"></div><script type="module">import React,{useState}from'react';import{createRoot}from'react-dom/client';import{ProfilesProvider,usePublicProfiles,MemberAvatar}from'/src/features/productivity/Avatars.tsx';function View(){const profiles=usePublicProfiles();return React.createElement('section',null,React.createElement('output',{'data-testid':'profiles'},JSON.stringify(profiles)),React.createElement(MemberAvatar,{userId:'person',name:'Fallback'}))}function Harness(){const[scope,setScope]=useState('company-a'),[enabled,setEnabled]=useState(true);window.setAvatarScope=setScope;window.setAvatarEnabled=setEnabled;return React.createElement(ProfilesProvider,{workspaceId:scope,enabled},React.createElement(View))}createRoot(document.getElementById('root')).render(React.createElement(Harness));</script></body></html>`
const vite=await createServer({configFile:false,plugins:[react(),{name:'avatar-transport-fixture',enforce:'pre',resolveId(id,importer){if(id==='../../collaboration/client'&&importer?.replaceAll('\\','/').includes('/Avatars.tsx'))return '\0avatar-client'},load(id){if(id==='\0avatar-client')return fixture},configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url.startsWith('/avatar-fixture/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="28" height="28" fill="green"/></svg>');return}if(req.url==='/'){res.setHeader('Content-Type','text/html');void server.transformIndexHtml('/',html).then(x=>res.end(x));return}next()})}}],server:{host:'127.0.0.1',port:5238,strictPort:true}})
await vite.listen();const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),page=await browser.newPage(),checks=[]
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const calls=()=>page.evaluate(()=>window.avatarQA.calls.length)
const resolve=async(name,avatar='avatar.png')=>page.evaluate(({name,avatar})=>{window.avatarQA.pending.shift().resolve({data:[{id:'person',display_name:name,avatar_path:avatar}]})},{name,avatar})
const read=async()=>JSON.parse(await page.getByTestId('profiles').innerText())
try{
 await page.goto('http://127.0.0.1:5238');await page.waitForFunction(()=>window.avatarQA?.calls.length===1);await page.clock.install()
 await resolve('Initial');await page.getByRole('img',{name:'Initial'}).waitFor();assert.equal((await read()).person.name,'Initial')
 checks.push('initial authorized profile loads through real React provider')
 await page.evaluate(()=>{window.dispatchEvent(new Event('evergreen:profile-updated'));window.dispatchEvent(new Event('evergreen:profile-updated'));window.dispatchEvent(new Event('evergreen:profile-updated'))});assert.equal(await calls(),2)
 await resolve('Obsolete');await page.waitForFunction(()=>window.avatarQA.calls.length===3);assert.equal((await read()).person.name,'Initial');await resolve('Current');await page.getByRole('img',{name:'Current'}).waitFor()
 checks.push('overlapping updates are coalesced and invalidated response cannot overwrite current projection')
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await page.clock.runFor(60001);assert.equal(await calls(),3)
 await page.evaluate(()=>window.dispatchEvent(new Event('evergreen:profile-updated')));assert.equal(await calls(),3)
 await page.clock.runFor(50000);assert.equal(await page.getByRole('img').count(),0);assert.equal((await read()).person.name,'Current')
 checks.push('hidden polling makes no requests and signed URL expires to initials while preserving name')
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});await page.waitForFunction(()=>window.avatarQA.calls.length===4);await resolve('Resumed');await page.getByRole('img',{name:'Resumed'}).waitFor()
 await page.evaluate(()=>window.dispatchEvent(new Event('evergreen:pause')));await page.clock.runFor(60001);assert.equal(await calls(),4);await page.evaluate(()=>window.dispatchEvent(new Event('evergreen:resume')));await page.waitForFunction(()=>window.avatarQA.calls.length===5)
 checks.push('visibility and native resume refresh; native pause suppresses polling')
 await page.evaluate(()=>window.setAvatarScope('company-b'));await page.waitForFunction(()=>window.avatarQA.calls.length===6);assert.deepEqual(await read(),{})
 await resolve('Late private A');assert.deepEqual(await read(),{});await resolve('Company B');await page.getByRole('img',{name:'Company B'}).waitFor()
 checks.push('workspace change clears projection immediately; late previous-workspace data is ignored')
 await page.evaluate(()=>window.setAvatarEnabled(false));await page.waitForFunction(()=>document.querySelector('output')?.textContent==='{}');assert.equal(await page.getByRole('img').count(),0)
 checks.push('disabled profile audience exposes no cached names or signed images')
 assert.deepEqual(errors,[])
 mkdirSync('output/performance',{recursive:true});writeFileSync('output/performance/avatar-refresh.json',JSON.stringify({scope:'Actual React + Chromium with local deterministic profile transport; hosted audience enforcement not retested',passed:checks.length,checks},null,2));console.log(JSON.stringify({passed:checks.length,checks},null,2))
}finally{await browser.close();await vite.close()}

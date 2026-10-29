// Explicitly authorized disposable-account provisioning. Never pass the admin key to Vite.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
process.loadEnvFile('.env.local')
const stateDir=process.argv[2]
if(!stateDir) throw new Error('Provide the private scratch directory')
const keyPath=`${stateDir}/server-key.tmp`,statePath=`${stateDir}/test-accounts.json`
const serverKey=existsSync(keyPath)?readFileSync(keyPath,'utf8').trim():null
if(serverKey&&!serverKey.startsWith('sb_secret_')) throw new Error('Expected temporary server key')
const admin=serverKey?createClient(process.env.VITE_SUPABASE_URL,serverKey,{auth:{persistSession:false,autoRefreshToken:false}}):null
try {
 const state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{createdAt:new Date().toISOString(),accounts:{}}
 for(const letter of ['A','B','C']) {
  if(!state.accounts[letter]) {
   if(!admin) throw new Error('Missing test account; temporary provisioning key required')
   const email=`evergreen-e2e-${letter.toLowerCase()}-${Date.now()}@example.com`,password=`Eg!${randomBytes(24).toString('base64url')}8a`
   const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:`Evergreen E2E ${letter}`}})
   if(error) throw new Error(`Account ${letter}: ${error.message}`)
   state.accounts[letter]={id:data.user.id,email,password}
   writeFileSync(statePath,JSON.stringify(state,null,2))
  }
  process.env[`EG_TEST_${letter}_EMAIL`]=state.accounts[letter].email
  process.env[`EG_TEST_${letter}_PASSWORD`]=state.accounts[letter].password
 }
 console.log('Three disposable accounts provisioned through real Supabase Auth; no confirmation email was sent.')
 const result=spawnSync(process.execPath,['scripts/e2e-real.mjs'],{env:process.env,stdio:'inherit',windowsHide:true})
 if(result.error) throw result.error
 process.exitCode=result.status??1
} finally { if(existsSync(keyPath)) unlinkSync(keyPath); console.log('Temporary server-key file removed.') }

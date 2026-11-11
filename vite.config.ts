import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'
import { createHandler } from './server/app.mjs'

export default defineConfig(({mode})=>{
 const env={...process.env,...loadEnv(mode,process.cwd(),'')}
 const identity:Plugin={name:'evergreen-server-identity',configureServer(server){
  const handler=createHandler(env,{indexHTML:async()=>server.transformIndexHtml('/',await readFile('index.html','utf8'))})
  server.middlewares.use((req,res,next)=>{
   const path=(req.url||'').split('?')[0]
   if(['/vision','/economy','/founders','/hub'].includes(path))req.url='/api/page?view='+path.slice(1)
   if((req.url||'').startsWith('/api/'))void handler(req,res);else next()
  })
 }}
 return{plugins:[react(),identity],build:{manifest:'build-manifest.json'}}
})

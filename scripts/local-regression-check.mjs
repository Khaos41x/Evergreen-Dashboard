import{spawn}from'node:child_process'
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','localhost','--port','5197','--strictPort'],{env:{...process.env,APP_ORIGIN:'http://localhost:5197'},windowsHide:true,stdio:['ignore','pipe','pipe']})
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs)),20000);server.stdout.on('data',d=>{if(String(d).includes('5197')){clearTimeout(timer);resolve()}})})
try{for(const script of['functional-check.mjs','mobile-check.mjs','local-preservation-check.mjs']){await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/'+script,'http://localhost:5197'],{windowsHide:true,stdio:'inherit'});child.on('exit',code=>code===0?resolve():reject(Error(script+' exit '+code)))})}}finally{server.kill()}

const CACHE='evergreen-public-1.2.0'
const PUBLIC=['/offline.html','/manifest.webmanifest','/pwa/icon-192.png','/pwa/icon-1024.png']
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC)).then(()=>self.skipWaiting())))
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('evergreen-public-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())))
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url)
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return
 // Every navigation goes to the server, including protected workspaces. Only a
 // public, account-free offline page is returned when the network is unavailable.
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.match('/offline.html')))
  return
 }
 // Cache only versioned public build assets and the explicit install resources.
 if(!url.pathname.startsWith('/assets/')&&!PUBLIC.includes(url.pathname))return
 event.respondWith(caches.open(CACHE).then(async cache=>{
  const cached=await cache.match(request);if(cached)return cached
  const response=await fetch(request)
  if(response.ok&&response.type==='basic')await cache.put(request,response.clone())
  return response
 }))
})

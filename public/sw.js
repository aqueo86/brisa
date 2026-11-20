// Never cache private pages, API responses, transactions or authentication.
const CACHE='brisa-public-shell-v1';
const PUBLIC=['/offline.html','/icons/brisa-192.png','/icons/brisa-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('brisa-public-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html').then(r=>r||new Response('Brisa necesita internet para acceder a tu cuenta.',{headers:{'Content-Type':'text/plain; charset=utf-8'}}))));
});

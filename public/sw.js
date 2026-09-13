/* An authenticated first visit installs a data-free app shell. API, Bin and
   authentication responses are network-only and never put in Cache Storage. */
importScripts("/sw-precache.js", "/jf-offline.js");
const CACHE=self.__JF_CACHE_VERSION;
const urls=self.__JF_PRECACHE;
const offline=self.JasimFlowOffline.createEngine();
const cacheable=new Set(urls);
self.addEventListener("install",event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const shell=await fetch("/",{credentials:"same-origin",cache:"no-store",redirect:"error"});
  if(!shell.ok||!shell.headers.get("content-type")?.includes("text/html")||!(await shell.clone().text()).includes("JasimFlow"))throw new Error("An authenticated JasimFlow visit is required");
  await cache.put("/",shell);
  for(let i=0;i<urls.length;i+=6)await Promise.all(urls.slice(i,i+6).map(async url=>{const r=await fetch(url,{credentials:"same-origin",cache:"reload",redirect:"error"});if(!r.ok)throw new Error("Offline asset unavailable");await cache.put(url,r);}));
  await self.skipWaiting();
})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
  // Retain the previous bundle for an already-open tab; never reload a draft.
  const keys=(await caches.keys()).filter(k=>k.startsWith("jasimflow-shell-"));
  const old=keys.filter(k=>k!==CACHE);await Promise.all(old.slice(0,-1).map(k=>caches.delete(k)));
  await self.clients.claim();const clients=await self.clients.matchAll({type:"window"});clients.forEach(c=>c.postMessage({type:"JF_READY"}));
})()));
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=="GET")return;
  if(event.request.mode==="navigate"&&url.pathname==="/"){event.respondWith((async()=>{const cached=await (await caches.open(CACHE)).match("/");return cached||fetch(event.request);})());return;}
  if(cacheable.has(url.pathname)||url.pathname.startsWith("/_next/static/")){event.respondWith((async()=>{const current=await (await caches.open(CACHE)).match(url.pathname);return current||await caches.match(event.request)||fetch(event.request);})());}
});
self.addEventListener("sync",event=>{if(event.tag==="jasimflow-outbox")event.waitUntil((async()=>{await offline.sync();const s=await offline.status();if(s.pending&&!s.issue&&!s.locked)throw new Error("Retry pending entries when connectivity returns");})());});
self.addEventListener("message",event=>{
  if(event.data?.type==="JF_STATUS")event.waitUntil((async()=>{const c=await caches.open(CACHE);const ready=!!(await c.match("/"))&&((await c.keys()).length>=urls.length+1);event.ports[0]?.postMessage({ready});})());
  if(event.data?.type==="JF_SYNC")event.waitUntil(offline.sync());
});

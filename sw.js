// Tăng phiên bản khi thay đổi các tệp của ứng dụng.
const CACHE_NAME = 'ducthanh-v20260926-3';
const APP_HOME = new URL('./', self.location.href).href;
const APP_INDEX = new URL('./index.html', self.location.href).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(new Request(APP_INDEX, {cache:'reload'}));
    if(!response.ok) throw new Error('Không tải được ứng dụng');
    await cache.put(APP_INDEX, response.clone());
    await cache.put(APP_HOME, response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('ducthanh-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if(request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(APP_HOME)) return;
  // Trang chính luôn thử mạng trước để nhận bản sửa mới; mất mạng mới dùng bản lưu.
  if(request.mode === 'navigate' || url.pathname === new URL(APP_INDEX).pathname){
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try{
        const response = await fetch(new Request(request, {cache:'no-cache'}));
        if(response.ok){
          await cache.put(APP_INDEX, response.clone());
          await cache.put(APP_HOME, response.clone());
          return response;
        }
        return (await cache.match(APP_INDEX)) || response;
      }catch(e){
        return (await cache.match(APP_INDEX)) || Response.error();
      }
    })());
    return;
  }
  if(/\/(logo\.png|manifest\.json)$/.test(url.pathname)){
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try{
        const response = await fetch(request);
        if(response.ok) await cache.put(request, response.clone());
        return response;
      }catch(e){ return (await cache.match(request)) || Response.error(); }
    })());
  }
});

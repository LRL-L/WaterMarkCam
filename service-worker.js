// Service Worker for WaterMarkCam PWA
// 版本号 - 每次更新文件时修改此版本号即可触发缓存更新
const CACHE_VERSION = 'v1.0.6';
const CACHE_NAME = `watermark-cam-${CACHE_VERSION}`;

// 需要缓存的文件列表
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './libs/qrcode.js',
  './libs/jsQR.min.js'
];

// 不缓存的外部 API（需要网络连接）
const EXTERNAL_APIS = [
  'googleapis.com',
  'accounts.google.com'
];

// 安装事件 - 缓存所有资源
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 缓存文件中...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] 所有文件已缓存');
        // 强制激活新的 Service Worker
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] 缓存失败:', err);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] 激活完成，接管所有客户端');
        // 立即接管所有页面
        return self.clients.claim();
      })
  );
});

// 拦截请求 - 离线优先策略
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') {
    return;
  }

  // 跳过 chrome-extension 和其他协议
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // 跳过外部 API（Google APIs 等）- 必须使用网络
  if (EXTERNAL_APIS.some(api => event.request.url.includes(api))) {
    console.log('[SW] 跳过缓存，使用网络:', event.request.url);
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 如果缓存中有，直接返回（离线优先）
        if (cachedResponse) {
          console.log('[SW] 从缓存返回:', event.request.url);
          return cachedResponse;
        }

        // 缓存中没有，尝试网络请求
        console.log('[SW] 网络请求:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // 检查是否是有效响应
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // 克隆响应（响应流只能读取一次）
            const responseToCache = response.clone();

            // 动态缓存新请求的资源
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((err) => {
            console.error('[SW] 网络请求失败:', event.request.url, err);
            // 可以返回一个离线页面或默认内容
            return new Response('离线状态，无法加载资源', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain; charset=utf-8'
              })
            });
          });
      })
  );
});

// 监听消息（可用于手动触发缓存更新等）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

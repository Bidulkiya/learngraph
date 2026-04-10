/**
 * NodeBloom Service Worker — 기본 PWA 지원.
 *
 * 캐시 전략: Network-first (교육 플랫폼은 최신 데이터가 중요).
 * 오프라인 시 캐시된 페이지 제공.
 */

const CACHE_NAME = 'nodebloom-v1';
const OFFLINE_URL = '/';

// Install — 오프라인 페이지 프리캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

// Activate — 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first, 실패 시 캐시
self.addEventListener('fetch', (event) => {
  // POST 요청 (Server Actions)은 캐시하지 않음
  if (event.request.method !== 'GET') return;

  // 외부 API 요청은 캐시하지 않음
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공하면 캐시 업데이트
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 제공
        return caches.match(event.request).then((cached) => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});

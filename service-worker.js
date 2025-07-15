const CACHE_NAME = "junggi-cache-v3"; // 버전을 올려서 새로운 캐시를 사용하도록 합니다.
const urlsToCache = [
  "/",
  "/index.html",
  "/search.html",
  "/manifest.json",
  "/icons/android-chrome-192x192.png",
  "/icons/android-chrome-512x512.png"
  // 폰트 캐싱은 복잡성을 유발할 수 있으므로 초기 단계에서는 제외하는 것이 안정적입니다.
];

// 서비스 워커 설치
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache and caching files");
      return cache.addAll(urlsToCache);
    }).catch(err => {
      console.error('Failed to cache', err); // 캐싱 실패 시 에러 로그 추가
    })
  );
});

// 캐시된 자원 요청 처리
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 캐시에 응답이 있으면 그것을 반환, 없으면 네트워크에서 fetch
      return response || fetch(event.request);
    })
  );
});

// 오래된 캐시 삭제
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});
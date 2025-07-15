const CACHE_NAME = "kakisketch-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/s.html",
  "/search.html",
  "/mypage.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/browserconfig.xml"
];

// 서비스 워커 설치
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache and caching files");
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.error("Failed to cache:", err);
      })
  );
  // 새로운 서비스 워커를 즉시 활성화
  self.skipWaiting();
});

// 서비스 워커 활성화
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 모든 클라이언트에 대해 서비스 워커 제어권 획득
      return self.clients.claim();
    })
  );
});

// 네트워크 요청 가로채기
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시된 버전 반환
        if (response) {
          return response;
        }
        
        // 캐시에 없으면 네트워크에서 가져오기
        return fetch(event.request)
          .then((response) => {
            // 유효한 응답이 아니면 그대로 반환
            if (!response || response.status !== 200 || response.type !== "basic") {
              return response;
            }
            
            // 응답을 복사하여 캐시에 저장
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
      .catch(() => {
        // 네트워크 실패 시 기본 페이지 반환
        if (event.request.destination === "document") {
          return caches.match("/index.html");
        }
      })
  );
});
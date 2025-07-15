const CACHE_NAME = "kakisketch-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/s.html",
  "/search.html",
  "/mypage.html",
  "/manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// 서비스 워커 설치
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache and caching files");
        // 각 파일을 개별적으로 캐시하여 실패한 파일이 있어도 계속 진행
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`캐시 실패: ${url}`, err);
              return null;
            })
          )
        );
      })
      .catch((err) => {
        console.error("캐시 오픈 실패:", err);
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
            console.log("이전 캐시 삭제:", cacheName);
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
  // 아이콘 요청 처리
  if (event.request.url.includes('/icon-192') || event.request.url.includes('/icon-512')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            return response;
          }
          // 아이콘 파일이 없을 경우 기본 아이콘 생성
          return generateDefaultIcon(event.request.url.includes('512') ? 512 : 192);
        })
        .catch(() => {
          return generateDefaultIcon(event.request.url.includes('512') ? 512 : 192);
        })
    );
    return;
  }

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

// 기본 아이콘 생성 함수
function generateDefaultIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 배경 그라데이션
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#fbbc04');
  gradient.addColorStop(1, '#e0a800');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // 둥근 모서리
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();
  
  // 텍스트 추가
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('K', size/2, size/2);
  
  return canvas.convertToBlob({ type: 'image/png' })
    .then(blob => new Response(blob, {
      headers: { 'Content-Type': 'image/png' }
    }));
}
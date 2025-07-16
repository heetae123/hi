const CACHE_NAME = "kakisketch-cache-v4";
const BASE_PATH = "/hi";

const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/s.html`,
  `${BASE_PATH}/search.html`,
  `${BASE_PATH}/mypage.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icons/icon-192.png`,
  `${BASE_PATH}/icons/icon-512.png`
];

console.log('🚀 카키스케치 Service Worker 시작 - BASE_PATH:', BASE_PATH);

// 서비스 워커 설치
self.addEventListener("install", (event) => {
  console.log("📦 Service Worker 설치 중...");
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ 캐시 오픈 완료");
        
        // 각 URL을 개별적으로 처리
        return Promise.allSettled(
          urlsToCache.map(url => {
            return fetch(url)
              .then(response => {
                if (response.ok) {
                  console.log(`✅ 캐시 성공: ${url}`);
                  return cache.put(url, response);
                } else {
                  console.warn(`⚠️ 응답 실패 (${response.status}): ${url}`);
                  return null;
                }
              })
              .catch(err => {
                console.warn(`❌ 네트워크 오류: ${url}`, err);
                return null;
              });
          })
        ).then(results => {
          const successful = results.filter(r => r.status === 'fulfilled').length;
          console.log(`✅ ${successful}/${urlsToCache.length} 파일 캐시 완료`);
        });
      })
      .catch((err) => {
        console.error("❌ 캐시 오픈 실패:", err);
      })
  );
  
  // 즉시 활성화
  self.skipWaiting();
});

// 서비스 워커 활성화
self.addEventListener("activate", (event) => {
  console.log("🔄 Service Worker 활성화 중...");
  
  event.waitUntil(
    Promise.all([
      // 이전 캐시 삭제
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ 이전 캐시 삭제:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 모든 클라이언트 제어
      self.clients.claim()
    ])
  );
});

// 네트워크 요청 처리
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // 같은 origin이고 BASE_PATH로 시작하는 요청만 처리
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE_PATH)) {
    return;
  }

  // 아이콘 파일 특별 처리
  if (url.pathname.includes('/icons/icon-192.png') || url.pathname.includes('/icons/icon-512.png')) {
    event.respondWith(handleIconRequest(event.request));
    return;
  }

  // HTML 페이지는 네트워크 우선
  if (event.request.mode === 'navigate' || 
      event.request.destination === 'document' ||
      url.pathname.endsWith('.html') ||
      url.pathname === BASE_PATH + '/' ||
      url.pathname === BASE_PATH) {
    
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  // 기타 리소스는 캐시 우선
  event.respondWith(handleResourceRequest(event.request));
});

// 네비게이션 요청 처리
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    const cachedResponse = await caches.match(request);
    return cachedResponse || networkResponse;
    
  } catch (error) {
    console.log("🌐 네트워크 실패, 캐시에서 검색:", request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 기본 페이지 반환
    const indexResponse = await caches.match(`${BASE_PATH}/index.html`);
    return indexResponse || new Response('오프라인 상태입니다.', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// 리소스 요청 처리
async function handleResourceRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // 백그라운드에서 업데이트
      fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response);
          });
        }
      }).catch(() => {
        // 백그라운드 업데이트 실패는 무시
      });
      
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn("❌ 리소스 로드 실패:", request.url);
    
    return new Response('리소스를 찾을 수 없습니다.', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

// 아이콘 요청 특별 처리
async function handleIconRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // 아이콘이 없으면 기본 아이콘 생성
    return generateDefaultIcon(request.url.includes('512') ? 512 : 192);
    
  } catch (error) {
    // 오류 시 기본 아이콘 생성
    return generateDefaultIcon(request.url.includes('512') ? 512 : 192);
  }
}

// 기본 아이콘 생성
function generateDefaultIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#fbbc04;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e0a800;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.35em" 
            font-family="Arial, sans-serif" font-size="${size * 0.4}" 
            font-weight="bold" fill="white">K</text>
    </svg>
  `;
  
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  return new Response(blob, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

// 메시지 처리
self.addEventListener('message', (event) => {
  console.log('💬 메시지 수신:', event.data);
  
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log("✅ 카키스케치 GitHub Pages PWA Service Worker 로드 완료!");
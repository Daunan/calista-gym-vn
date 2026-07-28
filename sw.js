/* Service Worker — cache-first offline. HLV Gym CALISTA */
'use strict';

// v5 — thêm BMI / chiều cao / nhật ký cân nặng.
// Mỗi lần sửa file trong ASSETS PHẢI tăng số này, nếu không iPhone sẽ
// tiếp tục dùng bản cũ đã lưu trong cache.
var CACHE = 'gymvn-v5';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/data.js',
  './js/rules.js',
  './js/ui.js',
  './js/anatomy.js',
  './js/motion.js',
  './js/map.js',
  './js/game.js',
  './js/screens.js',
  './js/session.js',
  './js/app.js',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // Add each asset individually; ignore individual failures
      // (Promise.allSettled pattern) so one missing file does not
      // break the whole install.
      return Promise.all(
        ASSETS.map(function (url) {
          return cache.add(url).catch(function () {
            /* ignore this asset */
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  // CHÚ Ý: chỉ xóa CACHE cũ. TUYỆT ĐỐI không đụng vào localStorage
  // (toàn bộ lịch sử tập luyện của người dùng nằm ở đó).
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;

      return fetch(request).then(function (response) {
        // Only cache valid, same-origin-ish GET responses.
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'default')) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(request, copy);
          }).catch(function () { /* storage full etc. — ignore */ });
        }
        return response;
      }).catch(function () {
        // Network failed: fall back to index.html for navigations only.
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return Response.error();
      });
    })
  );
});

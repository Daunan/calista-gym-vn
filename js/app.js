/* app.js — window.App
   Bộ định tuyến theo hash. '#day/3', '#machine/leg_press_40', ...
   Quản lý các mount đang chạy (Anatomy/Motion/GymMapCanvas) qua App.cleanup.
*/
(function () {
  'use strict';

  window.App = {
    // Các đối tượng mount có .stop() — mọi màn hình push vào đây,
    // khi chuyển màn hình sẽ được stop() và xóa hết.
    cleanup: [],

    go: function (hash) {
      if (typeof hash !== 'string') hash = '';
      if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
      if (location.hash === hash) {
        route(); // cùng hash — vẫn render lại
      } else {
        location.hash = hash;
      }
    },

    back: function () {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.App.go('');
      }
    }
  };

  function clearMounts() {
    var arr = window.App.cleanup;
    for (var i = 0; i < arr.length; i++) {
      try {
        if (arr[i] && typeof arr[i].stop === 'function') arr[i].stop();
      } catch (e) { /* bỏ qua */ }
    }
    arr.length = 0;
  }

  function route() {
    clearMounts();

    var h = location.hash || '';
    if (h.charAt(0) === '#') h = h.slice(1);
    var parts = h.split('/');
    var name = parts[0] || '';
    var arg = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('/')) : null;

    var S = window.Screens || {};

    function safe(fn) {
      try {
        fn();
      } catch (e) {
        // Nếu màn hình lỗi, quay về trang chủ để app không chết
        try {
          if (name !== '' && typeof S.home === 'function') {
            location.hash = '';
            S.home();
          }
        } catch (e2) { /* bỏ qua */ }
      }
    }

    switch (name) {
      case '':
        safe(function () { S.home(); });
        break;
      case 'howto':
        safe(function () { S.howto(); });
        break;
      case 'day':
        safe(function () { S.day(parseInt(arg, 10) || 1); });
        break;
      case 'session':
        safe(function () {
          // '#session/0' = chế độ ngày đèn đỏ (ROUTINE.periodDay).
          // parseInt('0') === 0 nên phải kiểm tra riêng, không dùng `|| 1`.
          var dow = parseInt(arg, 10);
          if (isNaN(dow) || dow < 0 || dow > 7) dow = 1;
          S.session(dow);
        });
        break;
      case 'report':
        safe(function () {
          // '#report' = tháng này · '#report/2026/8' = tháng chỉ định
          var now = new Date();
          var y = parseInt(parts[1], 10);
          var m = parseInt(parts[2], 10);
          if (isNaN(y) || y < 2000 || y > 2999) y = now.getFullYear();
          if (isNaN(m) || m < 1 || m > 12) m = now.getMonth() + 1;
          S.monthlyReport(y, m);
        });
        break;
      case 'attendance':
        safe(function () { S.attendance(); });
        break;
      case 'map':
        safe(function () { S.map(arg || null); });
        break;
      case 'library':
        safe(function () { S.library(); });
        break;
      case 'machine':
        safe(function () { S.machine(arg); });
        break;
      case 'exercise':
        safe(function () { S.exercise(arg); });
        break;
      case 'history':
        safe(function () { S.history(); });
        break;
      default:
        safe(function () { S.home(); });
    }

    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);

  // Chạy lần đầu khi tải trang
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', route);
  } else {
    route();
  }
})();

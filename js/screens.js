/* screens.js — window.Screens (trừ session — file session.js riêng)
   Mọi màn hình: xóa #app và dựng DOM mới. Toàn bộ chữ là tiếng Việt.
*/
(function () {
  'use strict';

  var el = function () { return window.UI.el.apply(null, arguments); };

  var CAT_COLORS = {
    chest: '#FF6B81', back: '#4FA3FF', leg: '#4ED09A', shoulder: '#FF9ED2',
    arm: '#C9A0FF', cardio: '#FF9F45', free: '#E8E8E8', facility: '#6B7686'
  };
  var CAT_NAMES = {
    chest: 'Ngực', back: 'Lưng', leg: 'Chân', shoulder: 'Vai',
    arm: 'Tay', cardio: 'Cardio', free: 'Tạ tự do', facility: 'Tiện ích'
  };
  var GOLD = '#F5C542';

  // ---------- tiện ích chung ----------

  function show(screenEl) {
    var app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(screenEl);
  }

  function screen() {
    return el.apply(null, ['div', { class: 'screen' }].concat(Array.prototype.slice.call(arguments)));
  }

  function goHome() { window.App.go(''); }
  function back() { window.App.back(); }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function todayDow() {
    var g = new Date().getDay(); // 0 = CN
    return g === 0 ? 7 : g;
  }

  function dateLabelVi(d) {
    try {
      return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    }
  }

  function effectiveSets(e) {
    if (window.Game.getWeekMode() === 'first2') {
      return Math.min(e.sets, e.setsFirst2Weeks || e.sets);
    }
    return e.sets;
  }

  function setsRepsLabel(e) {
    return effectiveSets(e) + ' hiệp × ' + e.repsLabelVi;
  }

  // Vẽ canvas sau khi đã nằm trong DOM (timerRing cần kích thước thật)
  function drawLater(fn) {
    requestAnimationFrame(function () { requestAnimationFrame(fn); });
  }

  function dowNameShort(dow) {
    return ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][dow] || '';
  }

  function sessionDateIso(s) {
    if (!s || typeof s !== 'object') return null;
    var v = s.dateIso || s.date || s.iso || s.day || null;
    if (typeof v === 'string' && v.length >= 10) return v.slice(0, 10);
    return null;
  }

  function fmtIsoVi(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  // ==========================================================
  // Tiện ích dùng chung: ngày nghỉ · calo · thiết lập cá nhân
  // (Không hardcode dữ liệu thật — mọi giá trị đọc từ localStorage.)
  // ==========================================================

  var PINK = '#FF6B81';
  var GREY = '#6B7686';
  var STATE_KEY = 'gymvn_state';
  var SETUP_SKIP_KEY = 'gymvn_setup_skipped';

  // Khi bấm 'Thiết lập chu kỳ' thì mở lại thẻ thiết lập ở trang chủ.
  var setupForced = false;

  function R() { return window.RULES || null; }

  function rawState() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (!raw) return {};
      var o = JSON.parse(raw);
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }

  function writeRawState(patch) {
    try {
      var s = rawState();
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) s[k] = patch[k];
      }
      localStorage.setItem(STATE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function setupSkipped() {
    try { return localStorage.getItem(SETUP_SKIP_KEY) === '1'; } catch (e) { return false; }
  }

  function setSetupSkipped(v) {
    try {
      if (v) localStorage.setItem(SETUP_SKIP_KEY, '1');
      else localStorage.removeItem(SETUP_SKIP_KEY);
    } catch (e) {}
  }

  function defaultWeight() {
    var d = R() ? Number(R().DEFAULT_WEIGHT_KG) : 0;
    return d > 0 ? d : 55;
  }

  function weightConfigured() {
    try {
      if (window.Game && typeof window.Game.isWeightSet === 'function') return !!window.Game.isWeightSet();
    } catch (e) {}
    var s = rawState();
    if (typeof s.weightSet === 'boolean') return s.weightSet;
    var w = Number(s.weightKg);
    return isFinite(w) && w > 0;
  }

  function currentWeight() {
    var w = 0;
    try {
      if (window.Game && typeof window.Game.getWeight === 'function') w = Number(window.Game.getWeight()) || 0;
    } catch (e) {}
    if (!(w > 0)) w = Number(rawState().weightKg) || 0;
    if (!(w > 0)) w = defaultWeight();
    return w;
  }

  function saveWeight(kg) {
    var v = Math.round(Number(kg) * 10) / 10;
    if (!(v > 0)) return;
    try {
      if (window.Game && typeof window.Game.setWeight === 'function') { window.Game.setWeight(v); return; }
    } catch (e) {}
    writeRawState({ weightKg: v, weightSet: true });
  }

  function currentCycle() {
    var d = (R() && R().CYCLE_DEFAULT) || { lastStartIso: '', cycleDays: 30, periodDays: 7 };
    var c = null;
    try {
      if (window.Game && typeof window.Game.getCycle === 'function') c = window.Game.getCycle();
    } catch (e) {}
    if (!c || typeof c !== 'object') {
      var s = rawState();
      c = (s.cycle && typeof s.cycle === 'object') ? s.cycle : {};
    }
    var cd = Number(c.cycleDays), pd = Number(c.periodDays);
    return {
      lastStartIso: (typeof c.lastStartIso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.lastStartIso))
        ? c.lastStartIso.substring(0, 10) : '',
      cycleDays: (isFinite(cd) && cd >= 20 && cd <= 45) ? Math.round(cd) : d.cycleDays,
      periodDays: (isFinite(pd) && pd >= 1 && pd <= 10) ? Math.round(pd) : d.periodDays
    };
  }

  function saveCycle(cfg) {
    var safe = {
      lastStartIso: (typeof cfg.lastStartIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cfg.lastStartIso)) ? cfg.lastStartIso : '',
      cycleDays: Number(cfg.cycleDays) || 28,
      periodDays: Number(cfg.periodDays) || 5
    };
    try {
      if (window.Game && typeof window.Game.setCycle === 'function') { window.Game.setCycle(safe); return; }
    } catch (e) {}
    writeRawState({ cycle: safe });
  }

  function cycleAt(iso) {
    try {
      if (R() && typeof R().cycleInfo === 'function') return R().cycleInfo(iso, currentCycle()) || { configured: false };
    } catch (e) {}
    return { configured: false };
  }

  function isClosed(iso) {
    try { return !!(R() && R().isClosedDay(iso)); } catch (e) { return false; }
  }

  function nextClosed(iso) {
    try { return (R() && R().nextClosedDay(iso)) || ''; } catch (e) { return ''; }
  }

  function isLastDayOfMonth(iso) {
    try { return !!(R() && R().isLastDayOfMonth(iso)); } catch (e) { return false; }
  }

  function closedDaysOf(y, m) {
    try { return (R() && R().closedDaysOfMonth(y, m)) || []; } catch (e) { return []; }
  }

  function sessionKcal(s, w) {
    try {
      if (R() && typeof R().backfillKcal === 'function') return Math.round(R().backfillKcal(s, w) || 0);
    } catch (e) {}
    var k = Number(s && s.kcal);
    return isFinite(k) && k > 0 ? Math.round(k) : 0;
  }

  function allSessions() {
    try {
      var arr = window.Game.sessions();
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function monthKcal(y, m) {
    try {
      if (window.Game && typeof window.Game.totalKcalOfMonth === 'function') {
        var v = Number(window.Game.totalKcalOfMonth(y, m));
        if (isFinite(v) && v >= 0) return Math.round(v);
      }
    } catch (e) {}
    var w = currentWeight();
    var prefix = y + '-' + pad2(m) + '-';
    var total = 0;
    allSessions().forEach(function (s) {
      var iso = sessionDateIso(s);
      if (iso && iso.indexOf(prefix) === 0) total += sessionKcal(s, w);
    });
    return Math.round(total);
  }

  // Chỉ ghi nhận khi xem báo cáo của CHÍNH tháng hiện tại — xem lại tháng cũ
  // không được ghi đè dấu "đã xem" của tháng này.
  function markReportShown(y, m) {
    var now = new Date();
    if (y !== now.getFullYear() || m !== (now.getMonth() + 1)) return;
    try {
      if (window.Game && typeof window.Game.markReportShown === 'function') {
        window.Game.markReportShown(y + '-' + pad2(m));
      }
    } catch (e) {}
  }

  function kcalCompare(kcal) {
    try { return (R() && R().kcalCompareVi(kcal)) || ''; } catch (e) { return ''; }
  }

  // '1.234' theo kiểu Việt Nam
  function intVi(n) {
    var v = Math.round(Number(n) || 0);
    var neg = v < 0;
    v = Math.abs(v);
    var s = String(v), out = '';
    while (s.length > 3) { out = '.' + s.slice(-3) + out; s = s.slice(0, -3); }
    return (neg ? '-' : '') + s + out;
  }

  function dowShortViOfIso(iso) {
    var d = null;
    try { d = R() ? R().parseIso(iso) : null; } catch (e) {}
    if (!d) {
      var p = String(iso || '').split('-');
      if (p.length < 3) return '';
      d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 12, 0, 0);
    }
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()] || '';
  }

  // '9 tháng 8 (CN)'
  function isoLabelVi(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return parseInt(p[2], 10) + ' tháng ' + parseInt(p[1], 10) + ' (' + dowShortViOfIso(iso) + ')';
  }

  function minutesLabelVi(mins) {
    var m = Math.max(0, Math.round(Number(mins) || 0));
    if (m < 60) return m + ' phút';
    var h = Math.floor(m / 60);
    var r = m % 60;
    return r ? (h + 'g' + pad2(r)) : (h + ' giờ');
  }

  // Ô nhập cân nặng: số + các nút −1 / −0,5 / +0,5 / +1
  function weightControl(initialKg) {
    var start = Math.round((Number(initialKg) > 0 ? Number(initialKg) : defaultWeight()) * 10) / 10;
    var input = el('input', {
      type: 'number', inputmode: 'decimal', step: '0.5', min: '25', max: '200',
      value: String(start),
      style: {
        width: '110px', minHeight: '52px', padding: '8px 10px', textAlign: 'center',
        borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--surface-alt)',
        color: GOLD, fontSize: '24px', fontWeight: '800', fontFamily: 'inherit',
        outline: 'none', WebkitAppearance: 'none'
      }
    });

    function read() {
      var v = parseFloat(String(input.value).replace(',', '.'));
      if (!isFinite(v)) v = start;
      v = Math.round(v * 10) / 10;
      if (v < 25) v = 25;
      if (v > 200) v = 200;
      return v;
    }
    function bump(delta) {
      var v = Math.round((read() + delta) * 10) / 10;
      if (v < 25) v = 25;
      if (v > 200) v = 200;
      input.value = String(v);
    }
    function btn(label, delta) {
      return el('button', {
        type: 'button',
        style: {
          minHeight: '44px', minWidth: '58px', padding: '0 12px', borderRadius: '12px',
          border: '1px solid var(--line)', background: 'var(--surface-alt)',
          color: 'var(--text)', fontSize: '15px', fontWeight: '800', fontFamily: 'inherit'
        },
        onclick: function () { bump(delta); }
      }, label);
    }

    var node = el('div', null,
      el('div', { class: 'row', style: { justifyContent: 'center', gap: '8px' } },
        input,
        el('div', { style: { fontSize: '17px', fontWeight: '700' } }, 'kg')
      ),
      el('div', { class: 'row', style: { justifyContent: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } },
        btn('−1', -1), btn('−0,5', -0.5), btn('+0,5', 0.5), btn('+1', 1)
      )
    );

    return { node: node, get: read };
  }

  // ==========================================================
  // Chiều cao · BMI · nhật ký cân nặng
  // (BMI chỉ là MỘT con số tham khảo — luôn hiển thị kèm ghi chú về cơ bắp.)
  // ==========================================================

  var MIN_HEIGHT_CM = 100;
  var MAX_HEIGHT_CM = 250;

  // Thang đo của biểu đồ BMI
  var BMI_SCALE_MIN = 15;
  var BMI_SCALE_MAX = 35;
  var BMI_TICKS = [18.5, 23, 25, 30];
  var BMI_SEGMENTS = [
    { from: 15, to: 18.5 },
    { from: 18.5, to: 23 },
    { from: 23, to: 25 },
    { from: 25, to: 30 },
    { from: 30, to: 35 }
  ];

  // Số thập phân kiểu Việt Nam: 18,8
  function dec1Vi(x) {
    var v = Math.round((Number(x) || 0) * 10) / 10;
    return v.toFixed(1).replace('.', ',');
  }

  function signedDec1Vi(x) {
    var v = Math.round((Number(x) || 0) * 10) / 10;
    var sign = v > 0 ? '+' : (v < 0 ? '−' : '±');
    return sign + Math.abs(v).toFixed(1).replace('.', ',');
  }

  function tickLabelVi(v) {
    return (v === Math.round(v)) ? String(v) : String(v).replace('.', ',');
  }

  function dayMonthVi(iso) {
    var p = String(iso || '').split('-');
    if (p.length < 3) return '';
    return parseInt(p[2], 10) + '/' + parseInt(p[1], 10);
  }

  function withAlpha(hex, a) {
    var m = /^#([0-9a-fA-F]{6})$/.exec(String(hex || ''));
    if (!m) return 'rgba(245,197,66,' + a + ')';
    var n = parseInt(m[1], 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function defaultHeight() {
    var d = R() ? Number(R().DEFAULT_HEIGHT_CM) : 0;
    return (d >= MIN_HEIGHT_CM && d <= MAX_HEIGHT_CM) ? d : 160;
  }

  function heightConfigured() {
    try {
      if (window.Game && typeof window.Game.isHeightSet === 'function') return !!window.Game.isHeightSet();
    } catch (e) {}
    var s = rawState();
    if (typeof s.heightSet === 'boolean') return s.heightSet;
    var h = Number(s.heightCm);
    return isFinite(h) && h > 0;
  }

  function currentHeight() {
    var h = 0;
    try {
      if (window.Game && typeof window.Game.getHeight === 'function') h = Number(window.Game.getHeight()) || 0;
    } catch (e) {}
    if (!(h > 0)) h = Number(rawState().heightCm) || 0;
    if (!(h > 0)) h = defaultHeight();
    return h;
  }

  function saveHeight(cm) {
    var v = Math.round(Number(cm));
    if (!(v > 0)) return;
    if (v < MIN_HEIGHT_CM) v = MIN_HEIGHT_CM;
    if (v > MAX_HEIGHT_CM) v = MAX_HEIGHT_CM;
    try {
      if (window.Game && typeof window.Game.setHeight === 'function') { window.Game.setHeight(v); return; }
    } catch (e) {}
    writeRawState({ heightCm: v, heightSet: true });
  }

  function bmiOf(kg, cm) {
    try {
      if (R() && typeof R().bmi === 'function') return Number(R().bmi(kg, cm)) || 0;
    } catch (e) {}
    var w = Number(kg), h = Number(cm);
    if (!(w > 0) || !(h > 0)) return 0;
    var m = h / 100;
    return Math.round((w / (m * m)) * 10) / 10;
  }

  function bmiCat(b) {
    try {
      if (R() && typeof R().bmiCategoryVi === 'function') {
        var c = R().bmiCategoryVi(b);
        if (c && c.label) return c;
      }
    } catch (e) {}
    return { label: '', index: 1, color: GOLD };
  }

  function healthyRange(cm) {
    try {
      if (R() && typeof R().healthyWeightRange === 'function') {
        var a = R().healthyWeightRange(cm);
        if (a && a.length === 2 && Number(a[0]) > 0) return [Number(a[0]), Number(a[1])];
      }
    } catch (e) {}
    var m = Number(cm) / 100;
    if (!(m > 0)) return [0, 0];
    return [Math.round(18.5 * m * m * 10) / 10, Math.round(22.9 * m * m * 10) / 10];
  }

  function bmiNote() {
    try {
      if (R() && typeof R().bmiNoteVi === 'function') return R().bmiNoteVi() || '';
    } catch (e) {}
    return 'BMI không phân biệt được cơ và mỡ. Khi cơ tăng lên thì BMI cũng tăng theo.';
  }

  function bmiAdvice(b) {
    try {
      if (R() && typeof R().bmiAdviceVi === 'function') return R().bmiAdviceVi(b) || '';
    } catch (e) {}
    return '';
  }

  function weightLog() {
    try {
      if (window.Game && typeof window.Game.weightHistory === 'function') {
        var a = window.Game.weightHistory();
        return Array.isArray(a) ? a : [];
      }
    } catch (e) {}
    return [];
  }

  // Ô nhập chiều cao: số + nút −1 / +1 cm
  function heightControl(initialCm) {
    var start = Math.round(Number(initialCm) > 0 ? Number(initialCm) : defaultHeight());
    var input = el('input', {
      type: 'number', inputmode: 'numeric', step: '1',
      min: String(MIN_HEIGHT_CM), max: String(MAX_HEIGHT_CM),
      value: String(start),
      style: {
        width: '110px', minHeight: '52px', padding: '8px 10px', textAlign: 'center',
        borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--surface-alt)',
        color: GOLD, fontSize: '24px', fontWeight: '800', fontFamily: 'inherit',
        outline: 'none', WebkitAppearance: 'none'
      }
    });

    function read() {
      var v = parseFloat(String(input.value).replace(',', '.'));
      if (!isFinite(v)) v = start;
      v = Math.round(v);
      if (v < MIN_HEIGHT_CM) v = MIN_HEIGHT_CM;
      if (v > MAX_HEIGHT_CM) v = MAX_HEIGHT_CM;
      return v;
    }
    function bump(delta) {
      var v = read() + delta;
      if (v < MIN_HEIGHT_CM) v = MIN_HEIGHT_CM;
      if (v > MAX_HEIGHT_CM) v = MAX_HEIGHT_CM;
      input.value = String(v);
    }
    function btn(label, delta) {
      return el('button', {
        type: 'button',
        style: {
          minHeight: '44px', minWidth: '58px', padding: '0 12px', borderRadius: '12px',
          border: '1px solid var(--line)', background: 'var(--surface-alt)',
          color: 'var(--text)', fontSize: '15px', fontWeight: '800', fontFamily: 'inherit'
        },
        onclick: function () { bump(delta); }
      }, label);
    }

    var node = el('div', null,
      el('div', { class: 'row', style: { justifyContent: 'center', gap: '8px' } },
        input,
        el('div', { style: { fontSize: '17px', fontWeight: '700' } }, 'cm')
      ),
      el('div', { class: 'row', style: { justifyContent: 'center', gap: '8px', marginTop: '10px' } },
        btn('−1', -1), btn('+1', 1)
      )
    );

    return { node: node, get: read };
  }

  // Vẽ canvas theo devicePixelRatio, vẽ lại khi xoay/đổi kích thước màn hình.
  // Trả về mount có .stop() và tự đăng ký vào App.cleanup.
  function canvasMount(canvas, cssHeight, draw) {
    var stopped = false;

    function render() {
      if (stopped || !canvas.getContext) return;
      // Màn hình đã bị vẽ lại (canvas không còn trong DOM) → tự dừng, tránh vẽ thừa.
      // document.body có thể chưa tồn tại nếu bị gọi quá sớm → bỏ qua phần kiểm tra.
      if (document.body && !document.body.contains(canvas)) { mount.stop(); return; }
      var dpr = window.devicePixelRatio || 1;
      var rect = canvas.getBoundingClientRect();
      var W = Math.max(1, Math.round(rect.width || 320));
      var H = cssHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      try { draw(ctx, W, H); } catch (e) {}
    }

    function onResize() { render(); }

    drawLater(render);
    window.addEventListener('resize', onResize);

    var mount = {
      stop: function () {
        stopped = true;
        window.removeEventListener('resize', onResize);
      }
    };
    try {
      if (window.App && Array.isArray(window.App.cleanup)) window.App.cleanup.push(mount);
    } catch (e) {}
    return mount;
  }

  // Vẽ lại màn hình mà KHÔNG đổi hash (ví dụ sau khi bấm "Lưu").
  // Phải tự dừng các canvas mount cũ, vì App.cleanup chỉ được dọn khi đổi hash —
  // nếu không, mỗi lần lưu lại thêm một listener 'resize' nữa.
  function rerender(fn) {
    try {
      var arr = (window.App && Array.isArray(window.App.cleanup)) ? window.App.cleanup : null;
      if (arr) {
        for (var i = 0; i < arr.length; i++) {
          try { if (arr[i] && typeof arr[i].stop === 'function') arr[i].stop(); } catch (e) {}
        }
        arr.length = 0;
      }
    } catch (e) {}
    fn();
  }

  // Thanh BMI ngang: thang 15–35, tô màu theo từng khoảng + con trỏ vị trí hiện tại.
  function drawBmiGauge(ctx, W, H, bmiValue) {
    var padX = 12;
    var barX = padX;
    var barW = Math.max(20, W - padX * 2);
    var barY = 22;
    var barH = 14;

    function xOf(v) {
      var n = Number(v) || 0;
      if (n < BMI_SCALE_MIN) n = BMI_SCALE_MIN;
      if (n > BMI_SCALE_MAX) n = BMI_SCALE_MAX;
      return barX + ((n - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * barW;
    }

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, 7);
    else ctx.rect(barX, barY, barW, barH);
    ctx.clip();
    for (var i = 0; i < BMI_SEGMENTS.length; i++) {
      var seg = BMI_SEGMENTS[i];
      var x0 = xOf(seg.from), x1 = xOf(seg.to);
      ctx.fillStyle = bmiCat((seg.from + seg.to) / 2).color;
      ctx.fillRect(x0, barY, Math.max(1, x1 - x0), barH);
    }
    ctx.restore();

    ctx.font = '700 10px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    for (var t = 0; t < BMI_TICKS.length; t++) {
      var tx = Math.round(xOf(BMI_TICKS[t]));
      ctx.fillStyle = 'rgba(11,14,20,0.55)';
      ctx.fillRect(tx - 0.5, barY, 1, barH);
      ctx.fillStyle = '#98A2B3';
      ctx.fillText(tickLabelVi(BMI_TICKS[t]), tx, barY + barH + 15);
    }

    if (Number(bmiValue) > 0) {
      var mx = xOf(bmiValue);
      ctx.fillStyle = '#0B0E14';
      ctx.fillRect(mx - 3, barY - 3, 6, barH + 6);
      ctx.fillStyle = GOLD;
      ctx.fillRect(mx - 1.5, barY - 2, 3, barH + 4);
      ctx.beginPath();
      ctx.moveTo(mx, barY - 4);
      ctx.lineTo(mx - 6, barY - 13);
      ctx.lineTo(mx + 6, barY - 13);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Biểu đồ đường cân nặng (vàng). Cần ít nhất 2 mốc.
  function weightTrendCanvas(hist) {
    var data = hist.slice(Math.max(0, hist.length - 30));
    var canvas = el('canvas', {
      style: { width: '100%', height: '132px', display: 'block', marginTop: '10px' }
    });

    canvasMount(canvas, 132, function (ctx, W, H) {
      var n = data.length;
      if (n < 2) return;
      var padL = 38, padR = 12, padT = 14, padB = 22;
      var plotW = Math.max(1, W - padL - padR);
      var plotH = Math.max(1, H - padT - padB);

      var minV = data[0].kg, maxV = data[0].kg;
      for (var i = 1; i < n; i++) {
        if (data[i].kg < minV) minV = data[i].kg;
        if (data[i].kg > maxV) maxV = data[i].kg;
      }
      if (maxV - minV < 1) {
        var mid = (maxV + minV) / 2;
        minV = mid - 0.5;
        maxV = mid + 0.5;
      }

      function xOf(idx) { return padL + (idx / (n - 1)) * plotW; }
      function yOf(v) { return padT + (1 - (v - minV) / (maxV - minV)) * plotH; }

      ctx.strokeStyle = '#2C3545';
      ctx.lineWidth = 1;
      [0, 0.5, 1].forEach(function (t) {
        var yy = Math.round(padT + t * plotH) + 0.5;
        ctx.beginPath();
        ctx.moveTo(padL, yy);
        ctx.lineTo(padL + plotW, yy);
        ctx.stroke();
      });

      ctx.fillStyle = '#98A2B3';
      ctx.font = '600 10px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(dec1Vi(maxV), padL - 6, padT + 4);
      ctx.fillText(dec1Vi(minV), padL - 6, padT + plotH + 4);

      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(data[0].kg));
      for (var a = 1; a < n; a++) ctx.lineTo(xOf(a), yOf(data[a].kg));
      ctx.lineTo(xOf(n - 1), padT + plotH);
      ctx.lineTo(xOf(0), padT + plotH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(245,197,66,0.12)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(data[0].kg));
      for (var b = 1; b < n; b++) ctx.lineTo(xOf(b), yOf(data[b].kg));
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      for (var c = 0; c < n; c++) {
        var isLast = (c === n - 1);
        ctx.beginPath();
        ctx.arc(xOf(c), yOf(data[c].kg), isLast ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = GOLD;
        ctx.fill();
        if (isLast) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#0B0E14';
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#98A2B3';
      ctx.textAlign = 'left';
      ctx.fillText(dayMonthVi(data[0].date), padL, H - 6);
      ctx.textAlign = 'right';
      ctx.fillText(dayMonthVi(data[n - 1].date), padL + plotW, H - 6);
    });

    return canvas;
  }

  // Thẻ "Chỉ số cơ thể": BMI + thanh đo + lời nhắn + chỉnh cân nặng/chiều cao + biểu đồ.
  function buildBodyCard(onSaved) {
    var weight = currentWeight();
    var height = currentHeight();
    var b = bmiOf(weight, height);
    var cat = bmiCat(b);
    var range = healthyRange(height);

    var badge = el('span', {
      style: {
        display: 'inline-block', padding: '5px 12px', borderRadius: '999px',
        background: withAlpha(cat.color, 0.16), border: '1px solid ' + cat.color,
        color: cat.color, fontSize: '13.5px', fontWeight: '800'
      }
    }, cat.label);

    var gauge = el('canvas', {
      style: { width: '100%', height: '68px', display: 'block', marginTop: '12px' }
    });
    canvasMount(gauge, 68, function (ctx, W, H) { drawBmiGauge(ctx, W, H, b); });

    var wc = weightControl(weight);
    var hc = heightControl(height);

    var hist = weightLog();
    var trendBlock;
    if (hist.length >= 2) {
      var delta = Math.round((hist[hist.length - 1].kg - hist[hist.length - 2].kg) * 10) / 10;
      trendBlock = el('div', null,
        el('div', { class: 'row', style: { justifyContent: 'space-between', gap: '10px' } },
          el('div', { style: { fontWeight: '800', fontSize: '15px' } }, 'Thay đổi cân nặng'),
          el('div', { style: { fontWeight: '800', fontSize: '14.5px', color: GOLD, flex: '0 0 auto' } },
            'So với lần trước: ' + signedDec1Vi(delta) + ' kg')
        ),
        weightTrendCanvas(hist),
        el('div', { class: 'text-dim', style: { fontSize: '12.5px', marginTop: '4px' } },
          'Cân nặng lên xuống vài lạng mỗi ngày là hoàn toàn bình thường — hãy nhìn cả đường dài nhé.')
      );
    } else {
      trendBlock = el('div', null,
        el('div', { style: { fontWeight: '800', fontSize: '15px' } }, 'Thay đổi cân nặng'),
        el('div', { class: 'text-dim mt-8', style: { fontSize: '13.5px' } },
          'Mỗi lần em lưu cân nặng, app ghi lại một mốc. Lưu thêm một lần nữa vào ngày khác là sẽ có biểu đồ.')
      );
    }

    return window.UI.card('Chỉ số cơ thể', 'gold',
      el('div', { class: 'row', style: { alignItems: 'flex-end', gap: '10px' } },
        el('div', { style: { minWidth: '0', flex: '1' } },
          el('div', { class: 'text-dim', style: { fontSize: '13px', fontWeight: '700' } }, 'BMI'),
          el('div', { style: { fontSize: '40px', fontWeight: '800', color: GOLD, lineHeight: '1.05' } },
            dec1Vi(b))
        ),
        el('div', { style: { flex: '0 0 auto', textAlign: 'right' } },
          badge,
          el('div', { class: 'text-dim', style: { fontSize: '12.5px', marginTop: '6px' } },
            dec1Vi(weight) + ' kg · ' + Math.round(height) + ' cm')
        )
      ),

      gauge,

      el('div', { style: { fontSize: '15px', lineHeight: '1.5', marginTop: '8px' } }, bmiAdvice(b)),
      el('div', { class: 'text-dim', style: { fontSize: '12.5px', marginTop: '6px', lineHeight: '1.45' } },
        bmiNote() + ' Đừng đánh giá cơ thể mình chỉ bằng một con số nhé 💗'),

      el('div', { style: { fontSize: '13.5px', marginTop: '10px', color: 'var(--ok)', fontWeight: '700' } },
        'Cân nặng phù hợp với chiều cao ' + Math.round(height) + 'cm: ' +
        dec1Vi(range[0]) + ' – ' + dec1Vi(range[1]) + ' kg'),

      el('div', { style: { marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--line)' } },
        el('div', { style: { fontWeight: '800', fontSize: '15px', marginBottom: '8px', textAlign: 'center' } },
          'Cân nặng (kg)'),
        wc.node,
        el('div', { style: { fontWeight: '800', fontSize: '15px', margin: '18px 0 8px', textAlign: 'center' } },
          'Chiều cao (cm)'),
        hc.node,
        el('div', { class: 'mt-16' },
          window.UI.primaryBtn('Lưu', function () {
            saveWeight(wc.get());
            saveHeight(hc.get());
            if (typeof onSaved === 'function') onSaved();
          })),
        el('div', { class: 'text-dim', style: { fontSize: '12.5px', marginTop: '8px', textAlign: 'center' } },
          'Dùng để ước tính calo và BMI. Chỉ lưu trên máy của em.')
      ),

      el('div', { style: { marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--line)' } },
        trendBlock)
    );
  }

  // ==========================================================
  // HOME
  // ==========================================================
  function home() {
    var now = new Date();
    var tIso = todayIso();
    var dow = todayDow();
    var st = window.Game.state();
    var day = window.ROUTINE.forDow(dow);
    var checkedToday = st.attendance.indexOf(tIso) !== -1;
    var ms = window.Game.monthStats(now.getFullYear(), now.getMonth() + 1);
    var closedToday = isClosed(tIso);
    var kcalMonth = monthKcal(now.getFullYear(), now.getMonth() + 1);

    var weekTitle = el('div', { class: 'card-title', style: { margin: '18px 2px 10px' } }, 'Lịch tuần này');

    // --- (d) băng-rôn tổng kết tháng (ngày cuối tháng) ---
    var reportBanner = null;
    if (isLastDayOfMonth(tIso)) {
      reportBanner = el('div', {
        class: 'card accent-gold',
        style: { cursor: 'pointer', borderColor: GOLD },
        onclick: function () { window.App.go('#report'); }
      },
        el('div', { class: 'row' },
          el('div', { style: { fontSize: '26px', flex: '0 0 auto' } }, '📊'),
          el('div', { style: { minWidth: '0', flex: '1' } },
            el('div', { style: { fontWeight: '800', fontSize: '16px', color: GOLD } }, 'Tổng kết tháng đã sẵn sàng'),
            el('div', { class: 'text-dim', style: { fontSize: '13.5px' } },
              'Hôm nay là ngày cuối tháng — xem lại cả tháng của em nhé!')
          ),
          el('span', { style: { color: GOLD, fontSize: '20px' } }, '›')
        )
      );
    }

    // --- (a-2) thẻ thiết lập ban đầu ---
    var cfgNow = currentCycle();
    var needSetup = (!weightConfigured() || !heightConfigured() || !cfgNow.lastStartIso) && !setupSkipped();
    var setupCard = (needSetup || setupForced) ? buildSetupCard() : null;

    // --- dải trò chơi (game strip) ---
    var xpPct = st.xpForNext > 0 ? Math.round((st.xpIntoLevel / st.xpForNext) * 100) : 0;
    var todayLine;
    if (checkedToday) {
      todayLine = el('div', { class: 'text-ok', style: { fontSize: '14px', fontWeight: '700' } }, '✓ Hôm nay đã điểm danh');
    } else if (closedToday) {
      todayLine = el('div', { class: 'text-dim', style: { fontSize: '14px', fontWeight: '700' } }, '🌿 Hôm nay phòng gym nghỉ');
    } else {
      todayLine = el('div', { class: 'text-gold blink', style: { fontSize: '14px', fontWeight: '700' } }, 'Hôm nay chưa điểm danh');
    }
    var strip = el('div', {
      class: 'card accent-gold',
      style: { cursor: 'pointer' },
      onclick: function () { window.App.go('#attendance'); }
    },
      el('div', { class: 'row' },
        el('div', { style: { fontSize: '30px', fontWeight: '800', color: GOLD, lineHeight: '1' } }, 'Lv ' + st.level),
        el('div', { style: { minWidth: '0', flex: '1' } },
          el('div', { style: { fontWeight: '800', fontSize: '16px' } }, window.Game.levelTitleVi(st.level)),
          el('div', { class: 'text-dim', style: { fontSize: '13px' } },
            st.xpIntoLevel + ' / ' + st.xpForNext + ' XP')
        ),
        el('div', { style: { textAlign: 'right', flex: '0 0 auto' } },
          el('div', { style: { fontSize: '18px', fontWeight: '800' } }, '🔥 ' + st.streak),
          el('div', { class: 'text-dim', style: { fontSize: '12.5px' } }, 'Tháng này ' + ms.ratePercent + '%')
        )
      ),
      el('div', { class: 'progress-bar mt-8' },
        el('div', { class: 'progress-fill', style: { width: Math.max(2, xpPct) + '%' } })
      ),
      el('div', { class: 'row mt-8', style: { justifyContent: 'space-between', gap: '10px' } },
        todayLine,
        el('div', { style: { flex: '0 0 auto', fontSize: '14px', fontWeight: '800', color: GOLD } },
          '🔥 ' + intVi(kcalMonth) + ' kcal')
      ),
      el('div', { class: 'text-dim', style: { fontSize: '12.5px', marginTop: '4px' } },
        'Calo ước tính trong tháng này. Ngày nghỉ không ảnh hưởng đến chuỗi ngày của em.')
    );

    // --- dòng BMI nhỏ ---
    // Đã có chiều cao → hiện BMI. Chưa có → hiện lời mời nhập chiều cao.
    // (Người dùng cũ có thể đã bấm "Bỏ qua" thiết lập từ trước, nên thẻ thiết
    //  lập sẽ không tự hiện lại nữa — nếu không có dòng này thì họ sẽ không
    //  bao giờ thấy BMI.)
    var bmiLine = null;
    if (weightConfigured() && heightConfigured()) {
      var hBmi = bmiOf(currentWeight(), currentHeight());
      if (hBmi > 0) {
        var hCat = bmiCat(hBmi);
        bmiLine = el('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: '8px',
            margin: '-4px 2px 14px', cursor: 'pointer', fontSize: '13.5px'
          },
          onclick: function () { window.App.go('#report'); }
        },
          el('span', {
            style: {
              flex: '0 0 8px', width: '8px', height: '8px',
              borderRadius: '50%', background: hCat.color
            }
          }),
          el('span', { class: 'text-dim' }, 'BMI ' + dec1Vi(hBmi) + ' · ' + hCat.label),
          el('span', { class: 'text-dim', style: { marginLeft: 'auto' } }, 'Xem chi tiết ›')
        );
      }
    } else if (!setupCard && !heightConfigured()) {
      // thẻ thiết lập không hiện (đã bấm "Bỏ qua") → mời nhập bằng một dòng nhỏ
      bmiLine = el('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: '8px',
          margin: '-4px 2px 14px', cursor: 'pointer', fontSize: '13.5px'
        },
        onclick: function () {
          setupForced = true;
          home();
          try { window.scrollTo(0, 0); } catch (e) {}
        }
      },
        el('span', {
          style: {
            flex: '0 0 8px', width: '8px', height: '8px',
            borderRadius: '50%', background: GOLD
          }
        }),
        el('span', { class: 'text-dim' }, 'Nhập chiều cao để xem chỉ số cơ thể'),
        el('span', { class: 'text-dim', style: { marginLeft: 'auto' } }, 'Nhập ›')
      );
    }

    // --- (b) thẻ chu kỳ ---
    var cycleCard = buildCycleCard(tIso);

    // --- thẻ buổi tập hôm nay ---
    var todayCard;
    var nextClosedLine = null;
    if (closedToday) {
      todayCard = window.UI.card('🌿 Hôm nay phòng gym nghỉ', 'ok',
        el('div', { style: { fontSize: '15.5px' } },
          'Phòng gym nghỉ vào Chủ Nhật tuần 2 và tuần 4 mỗi tháng.'),
        el('div', { class: 'text-ok mt-8', style: { fontSize: '15px', fontWeight: '700' } },
          'Ngày này không tính là vắng mặt. Chuỗi ngày của em vẫn được giữ nguyên.'),
        el('div', { class: 'text-dim mt-8', style: { fontSize: '14.5px' } },
          'Hôm nay em có thể đi bộ nhẹ 20–30 phút, giãn cơ ở nhà, ngủ đủ giấc và uống nhiều nước nhé 💗'),
        el('div', { class: 'mt-16' },
          window.UI.secondaryBtn('Xem lịch tuần', function () {
            try { weekTitle.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            catch (e) { try { weekTitle.scrollIntoView(); } catch (e2) {} }
          }))
      );
    } else if (day && day.rest) {
      todayCard = window.UI.card('Hôm nay là ngày nghỉ 🌿', 'ok',
        el('div', { style: { fontSize: '16px' } },
          'Hôm nay không tập tạ. Có thể đi bộ nhẹ hoặc giãn cơ, ngủ đủ giấc và uống đủ nước để cơ bắp hồi phục.'),
        el('div', { class: 'mt-16' },
          window.UI.secondaryBtn('Xem lịch điểm danh', function () { window.App.go('#attendance'); }))
      );
    } else if (day) {
      var chips = el('div', { class: 'row-wrap', style: { margin: '10px 0 14px' } });
      for (var i = 0; i < day.exercises.length; i++) {
        var ex = day.exercises[i];
        var mcat = window.GYM.byId(ex.machineId).category;
        chips.appendChild(window.UI.chip(ex.nameVi, CAT_COLORS[mcat] || GOLD));
      }
      todayCard = window.UI.card('Hôm nay — ' + day.titleVi, 'gold',
        el('div', { class: 'text-dim', style: { fontSize: '14.5px', marginTop: '-4px' } }, day.focusVi),
        chips,
        window.UI.primaryBtn('Bắt đầu buổi tập hôm nay', function () {
          window.App.go('#session/' + dow);
        })
      );
    }

    if (!closedToday) {
      var nIso = nextClosed(tIso);
      if (nIso) {
        nextClosedLine = el('div', {
          class: 'text-dim',
          style: { fontSize: '13.5px', margin: '-4px 2px 14px' }
        }, '🌿 Ngày nghỉ tiếp theo: ' + isoLabelVi(nIso));
      }
    }

    // --- 7 hàng trong tuần ---
    var weekRows = el('div', null);
    window.ROUTINE.days.forEach(function (d) {
      var isToday = d.dow === dow;
      var row = el('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: '10px',
          minHeight: '56px', padding: '8px 14px', marginBottom: '8px',
          background: isToday ? 'rgba(245,197,66,0.12)' : 'var(--surface-alt)',
          border: '1px solid ' + (isToday ? GOLD : 'var(--line)'),
          borderRadius: '14px', cursor: 'pointer'
        },
        onclick: (function (dd) { return function () { window.App.go('#day/' + dd); }; })(d.dow)
      },
        el('div', {
          style: {
            flex: '0 0 44px', textAlign: 'center', fontWeight: '800',
            color: isToday ? GOLD : 'var(--text-dim)', fontSize: '15px'
          }
        }, dowNameShort(d.dow)),
        el('div', { style: { minWidth: '0', flex: '1' } },
          el('div', { style: { fontWeight: isToday ? '800' : '700', fontSize: '16px', color: d.rest ? 'var(--ok)' : 'var(--text)' } },
            d.rest ? 'Nghỉ 🌿' : d.titleVi),
          d.rest ? null : el('div', { class: 'text-dim', style: { fontSize: '13px' } }, d.focusVi)
        ),
        isToday ? el('span', { style: { color: GOLD, fontWeight: '800', fontSize: '13px' } }, 'HÔM NAY') : null,
        el('span', { style: { color: 'var(--text-dim)', fontSize: '20px' } }, '›')
      );
      weekRows.appendChild(row);
    });

    // --- lưới lối tắt ---
    function shortcut(emoji, textVi, hash) {
      return el('div', {
        style: {
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px',
          minHeight: '84px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '6px',
          cursor: 'pointer', textAlign: 'center', padding: '10px'
        },
        onclick: function () { window.App.go(hash); }
      },
        el('div', { style: { fontSize: '26px', lineHeight: '1' } }, emoji),
        el('div', { style: { fontSize: '14px', fontWeight: '700' } }, textVi)
      );
    }
    var shortcuts = el('div', { class: 'grid-2' },
      shortcut('🗺️', 'Bản đồ phòng gym', '#map'),
      shortcut('🏋️', 'Danh sách máy', '#library'),
      shortcut('📅', 'Điểm danh', '#attendance'),
      shortcut('📈', 'Lịch sử', '#history'),
      shortcut('📊', 'Tổng kết tháng', '#report'),
      shortcut('❓', 'Hướng dẫn dùng app', '#howto')
    );

    // --- công tắc chế độ 2 tuần đầu ---
    var isFirst2 = window.Game.getWeekMode() === 'first2';
    var knob = el('div', {
      style: {
        width: '26px', height: '26px', borderRadius: '50%', background: '#0B0E14',
        position: 'absolute', top: '3px', left: isFirst2 ? '31px' : '3px',
        transition: 'left 0.15s ease'
      }
    });
    var toggle = el('button', {
      'aria-label': 'Chế độ tuần 1–2',
      style: {
        position: 'relative', width: '60px', height: '32px', minHeight: '32px',
        borderRadius: '999px', border: 'none', flex: '0 0 60px',
        background: isFirst2 ? GOLD : 'var(--line)', transition: 'background 0.15s ease'
      },
      onclick: function () {
        window.Game.setWeekMode(isFirst2 ? 'full' : 'first2');
        home(); // vẽ lại
      }
    }, knob);
    var modeCard = window.UI.card('Chế độ tuần 1–2', null,
      el('div', { class: 'row' },
        el('div', { style: { minWidth: '0', flex: '1' } },
          el('div', { style: { fontSize: '15.5px' } }, 'Tuần 1–2: mọi bài chỉ 2 hiệp'),
          el('div', { class: 'text-dim', style: { fontSize: '13px', marginTop: '2px' } },
            isFirst2 ? 'Đang BẬT — mọi bài hiển thị 2 hiệp' : 'Đang TẮT — hiển thị đủ số hiệp')
        ),
        toggle
      )
    );

    show(screen(
      window.UI.topbar('Xin chào! 👋', dateLabelVi(now), null),
      reportBanner,
      setupCard,
      strip,
      bmiLine,
      cycleCard,
      todayCard,
      nextClosedLine,
      weekTitle,
      weekRows,
      el('div', { class: 'card-title', style: { margin: '18px 2px 10px' } }, 'Lối tắt'),
      shortcuts,
      el('div', { class: 'mt-16' }),
      modeCard
    ));
  }

  // ----------------------------------------------------------
  // Thẻ thiết lập ban đầu (cân nặng + ngày bắt đầu kỳ kinh)
  // ----------------------------------------------------------
  function buildSetupCard() {
    var cfg = currentCycle();
    var wc = weightControl(currentWeight());
    var hc = heightControl(currentHeight());
    var dateInput = el('input', {
      type: 'date',
      value: cfg.lastStartIso || '',
      style: {
        width: '100%', minHeight: '50px', padding: '10px 12px', borderRadius: '12px',
        border: '1px solid var(--line)', background: 'var(--surface-alt)',
        color: 'var(--text)', fontSize: '16px', fontFamily: 'inherit',
        outline: 'none', WebkitAppearance: 'none'
      }
    });

    return window.UI.card('Thiết lập ban đầu', 'gold',
      el('div', { class: 'text-dim', style: { fontSize: '14px', marginTop: '-4px' } },
        'Chỉ cần làm một lần. Dữ liệu chỉ lưu trên máy của em.'),

      el('div', { style: { fontWeight: '800', fontSize: '15.5px', margin: '16px 0 8px' } }, 'Cân nặng của em'),
      wc.node,
      el('div', { class: 'text-dim', style: { fontSize: '13px', marginTop: '8px', textAlign: 'center' } },
        'Dùng để ước tính lượng calo đã đốt.'),

      el('div', { style: { fontWeight: '800', fontSize: '15.5px', margin: '18px 0 8px' } }, 'Chiều cao (cm)'),
      hc.node,
      el('div', { class: 'text-dim', style: { fontSize: '13px', marginTop: '8px', textAlign: 'center' } },
        'Dùng để tính chỉ số cơ thể (BMI).'),

      el('div', { style: { fontWeight: '800', fontSize: '15.5px', margin: '18px 0 8px' } },
        'Ngày bắt đầu kỳ kinh gần nhất'),
      dateInput,
      el('div', { class: 'text-dim', style: { fontSize: '13px', marginTop: '6px' } },
        'Dùng để gợi ý bài tập phù hợp. Có thể bỏ qua.'),

      el('div', { class: 'mt-16' },
        window.UI.primaryBtn('Lưu', function () {
          saveWeight(wc.get());
          saveHeight(hc.get());
          var iso = String(dateInput.value || '').substring(0, 10);
          var c = currentCycle();
          saveCycle({
            lastStartIso: /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '',
            cycleDays: c.cycleDays,
            periodDays: c.periodDays
          });
          setSetupSkipped(true);
          setupForced = false;
          home();
        })),
      el('div', { class: 'mt-8' },
        window.UI.secondaryBtn('Bỏ qua', function () {
          setSetupSkipped(true);
          setupForced = false;
          home();
        })),
      el('div', { class: 'text-dim', style: { fontSize: '12.5px', marginTop: '8px', textAlign: 'center' } },
        'Bỏ qua cũng được — có thể thiết lập lại sau bất cứ lúc nào.')
    );
  }

  // ----------------------------------------------------------
  // Thẻ chu kỳ kinh nguyệt
  // ----------------------------------------------------------
  function buildCycleCard(iso) {
    var ci = cycleAt(iso);

    if (!ci.configured) {
      return el('div', { style: { margin: '-4px 2px 14px', textAlign: 'right' } },
        el('span', {
          style: {
            fontSize: '13.5px', color: 'var(--text-dim)',
            textDecoration: 'underline', cursor: 'pointer'
          },
          onclick: function () {
            setupForced = true;
            home();
            try { window.scrollTo(0, 0); } catch (e) {}
          }
        }, 'Thiết lập chu kỳ')
      );
    }

    var cfg = currentCycle();
    var cycleDays = ci.cycleDays || cfg.cycleDays || 28;
    var periodDays = ci.periodDays || cfg.periodDays || 5;
    var periodPct = Math.max(5, Math.min(60, (periodDays / cycleDays) * 100));
    var posPct = Math.max(0, Math.min(100, ((ci.dayOfCycle - 1) / Math.max(1, cycleDays - 1)) * 100));

    var bar = el('div', { style: { position: 'relative', height: '22px', margin: '12px 0 6px' } },
      el('div', {
        style: {
          position: 'absolute', left: '0', right: '0', top: '6px', height: '10px',
          borderRadius: '999px', overflow: 'hidden',
          background: 'var(--surface-alt)', border: '1px solid var(--line)'
        }
      },
        el('div', { style: { position: 'absolute', left: '0', top: '0', bottom: '0', width: periodPct + '%', background: PINK } }),
        el('div', { style: { position: 'absolute', left: periodPct + '%', top: '0', bottom: '0', right: '0', background: 'rgba(245,197,66,0.55)' } })
      ),
      el('div', {
        style: {
          position: 'absolute', top: '2px', left: 'calc(' + posPct + '% - 9px)',
          width: '18px', height: '18px', borderRadius: '50%',
          background: '#0B0E14', border: '3px solid ' + GOLD,
          boxShadow: '0 0 8px rgba(245,197,66,0.6)'
        }
      })
    );

    var legend = el('div', { class: 'row', style: { justifyContent: 'space-between', fontSize: '12px' } },
      el('span', { style: { color: PINK, fontWeight: '700' } }, 'Ngày 1 — kỳ kinh'),
      el('span', { class: 'text-dim' }, 'Ngày ' + cycleDays)
    );

    // --- sửa nhanh (inline) ---
    var editBox = el('div', {
      style: { display: 'none', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)' }
    });
    var editDate = el('input', {
      type: 'date', value: cfg.lastStartIso || '',
      style: {
        width: '100%', minHeight: '48px', padding: '10px 12px', borderRadius: '12px',
        border: '1px solid var(--line)', background: 'var(--surface-alt)',
        color: 'var(--text)', fontSize: '16px', fontFamily: 'inherit',
        outline: 'none', WebkitAppearance: 'none'
      }
    });
    var cdValue = cfg.cycleDays;
    var cdLabel = el('div', {
      style: { fontSize: '20px', fontWeight: '800', color: GOLD, minWidth: '92px', textAlign: 'center' }
    }, cdValue + ' ngày');
    function stepCd(delta) {
      var v = cdValue + delta;
      if (v < 20) v = 20;
      if (v > 45) v = 45;
      cdValue = v;
      cdLabel.textContent = cdValue + ' ngày';
    }
    function cdBtn(label, delta) {
      return el('button', {
        type: 'button',
        style: {
          minHeight: '44px', minWidth: '52px', borderRadius: '12px',
          border: '1px solid var(--line)', background: 'var(--surface-alt)',
          color: 'var(--text)', fontSize: '18px', fontWeight: '800', fontFamily: 'inherit'
        },
        onclick: function () { stepCd(delta); }
      }, label);
    }
    editBox.appendChild(el('div', { style: { fontWeight: '800', fontSize: '14.5px', marginBottom: '6px' } },
      'Ngày bắt đầu kỳ kinh gần nhất'));
    editBox.appendChild(editDate);
    editBox.appendChild(el('div', { style: { fontWeight: '800', fontSize: '14.5px', margin: '14px 0 6px' } },
      'Độ dài chu kỳ'));
    editBox.appendChild(el('div', { class: 'row', style: { justifyContent: 'center', gap: '10px' } },
      cdBtn('−', -1), cdLabel, cdBtn('+', 1)));
    editBox.appendChild(el('div', { class: 'mt-16' },
      window.UI.primaryBtn('Lưu thay đổi', function () {
        var v = String(editDate.value || '').substring(0, 10);
        saveCycle({
          lastStartIso: /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '',
          cycleDays: cdValue,
          periodDays: cfg.periodDays
        });
        home();
      })));

    var editLink = el('span', {
      style: {
        fontSize: '13px', color: 'var(--text-dim)', textDecoration: 'underline',
        cursor: 'pointer', flex: '0 0 auto'
      },
      onclick: function () {
        editBox.style.display = (editBox.style.display === 'none') ? 'block' : 'none';
      }
    }, '⚙ Sửa');

    var periodBlock = null;
    if (ci.isPeriod) {
      periodBlock = el('div', { class: 'mt-16' },
        window.UI.primaryBtn('CHẾ ĐỘ NHẸ NHÀNG', function () { location.hash = '#session/0'; }),
        el('div', {
          style: { fontSize: '14px', fontWeight: '700', color: PINK, marginTop: '8px', textAlign: 'center' }
        }, 'Hôm nay tập nhẹ cũng vẫn được điểm danh đầy đủ 💗')
      );
    }

    var nextLine = null;
    if (ci.nextStartIso) {
      nextLine = el('div', { class: 'text-dim mt-8', style: { fontSize: '13.5px' } },
        'Dự kiến kỳ tới: ' + isoLabelVi(ci.nextStartIso) + ' (còn ' + ci.daysUntilNext + ' ngày)');
    }

    return window.UI.card(null, null,
      el('div', { class: 'row' },
        el('div', { style: { fontSize: '30px', lineHeight: '1', flex: '0 0 auto' } }, ci.emoji || '🌸'),
        el('div', { style: { minWidth: '0', flex: '1' } },
          el('div', { style: { fontWeight: '800', fontSize: '16.5px' } }, ci.phaseVi || ''),
          el('div', { class: 'text-dim', style: { fontSize: '13.5px' } },
            'Ngày thứ ' + ci.dayOfCycle + ' của chu kỳ')
        ),
        editLink
      ),
      bar,
      legend,
      el('div', { style: { fontSize: '15px', marginTop: '10px' } }, ci.adviceVi || ''),
      ci.isPms
        ? el('div', { style: { fontSize: '13.5px', color: PINK, fontWeight: '700', marginTop: '6px' } },
            'Sắp đến kỳ kinh rồi — nhớ chuẩn bị trước nhé.')
        : null,
      periodBlock,
      nextLine,
      editBox
    );
  }

  // ==========================================================
  // HOWTO
  // ==========================================================
  function howto() {
    var R = window.ROUTINE;

    show(screen(
      window.UI.topbar('Hướng dẫn dùng app', 'Đọc một lần trước buổi tập đầu tiên', back),

      window.UI.card('Một buổi tập diễn ra thế nào?', 'gold',
        window.UI.numberedList([
          'Mở app, bấm "Bắt đầu buổi tập hôm nay" ở trang chủ.',
          '10 phút máy leo cầu thang để khởi động (mức 1–3).',
          'Tập lần lượt từng máy theo thứ tự app hiển thị. App chỉ đường đến từng máy.',
          'Sau mỗi hiệp, bấm nút hoàn thành — app tự đếm giờ nghỉ.',
          '20 phút đi bộ nhanh trên máy chạy bộ.',
          'Kết thúc buổi tập → điểm danh, nhận XP và giữ chuỗi ngày 🔥.'
        ])
      ),

      window.UI.card('Ý nghĩa màu sắc', null,
        window.UI.bulletList([
          'Hồng — máy tập ngực', 'Xanh dương — máy tập lưng', 'Xanh lá — máy tập chân',
          'Hồng nhạt — máy tập vai', 'Tím — máy tập tay', 'Cam — máy cardio',
          'Trắng — khu tạ tự do', 'Xám — tiện ích (tủ đồ, nước...)'
        ], GOLD),
        el('div', { class: 'row-wrap mt-8' },
          Object.keys(CAT_NAMES).map(function (k) {
            return window.UI.chip(CAT_NAMES[k], CAT_COLORS[k]);
          })
        ),
        el('div', { class: 'text-dim mt-8', style: { fontSize: '14px' } },
          'Trong hình cơ thể: màu đỏ = cơ chính, cam = cơ phụ, xanh = cơ giữ thăng bằng.')
      ),

      window.UI.card('Cách chọn mức tạ', 'ok',
        window.UI.bulletList(R.weightRulesVi, 'var(--ok)')
      ),

      window.UI.card('Quy tắc chung', null,
        window.UI.bulletList(R.generalRulesVi, GOLD)
      ),

      window.UI.card('Quy tắc tăng tạ', null,
        window.UI.bulletList(R.progressionRulesVi, GOLD)
      ),

      window.UI.card('An toàn — quan trọng nhất!', 'danger',
        window.UI.bulletList(R.safetyRulesVi, 'var(--danger)')
      ),

      window.UI.card('Câu hỏi thường gặp', null,
        el('div', { style: { fontWeight: '800', marginBottom: '4px' } }, 'App có cần mạng không?'),
        el('div', { class: 'text-dim mb-16', style: { fontSize: '15px' } },
          'Không. App hoạt động hoàn toàn không cần mạng, kể cả trong phòng gym sóng yếu.'),
        el('div', { style: { fontWeight: '800', marginBottom: '4px' } }, 'Dữ liệu lưu ở đâu?'),
        el('div', { class: 'text-dim mb-16', style: { fontSize: '15px' } },
          'Mọi ghi chép chỉ lưu trên chiếc điện thoại này. Đừng xóa app hoặc xóa dữ liệu Safari.'),
        el('div', { style: { fontWeight: '800', marginBottom: '4px' } }, 'Bắt đầu từ giữa tuần được không?'),
        el('div', { class: 'text-dim mb-16', style: { fontSize: '15px' } },
          'Được. Bắt đầu từ bất kỳ ngày nào — cứ tập theo bài của ngày hôm đó là được.'),
        el('div', { style: { fontWeight: '800', marginBottom: '4px' } }, 'Làm sao để dậy sớm đi tập?'),
        el('div', { class: 'text-dim', style: { fontSize: '15px' } },
          'Cài báo thức 6:00 sáng trên iPhone nhé. App không thể tự đánh thức em được 😊')
      ),

      window.UI.secondaryBtn('Về trang chủ', goHome)
    ));
  }

  // ==========================================================
  // DAY
  // ==========================================================
  function day(dow) {
    var d = window.ROUTINE.forDow(dow);
    if (!d) { goHome(); return; }

    if (d.rest) {
      show(screen(
        window.UI.topbar(d.nameVi + ' — Ngày nghỉ', d.focusVi, back),
        window.UI.card('Hôm nay nghỉ ngơi 🌿', 'ok',
          window.UI.bulletList(d.tipsVi, 'var(--ok)')
        ),
        window.UI.secondaryBtn('Về trang chủ', goHome)
      ));
      return;
    }

    // --- dòng thời gian 80 phút ---
    function tlRow(color, minutes, textVi, flex) {
      return el('div', { class: 'row', style: { marginBottom: '8px' } },
        el('div', {
          style: {
            flex: '0 0 ' + flex + 'px', height: '14px', borderRadius: '7px',
            background: color
          }
        }),
        el('div', { style: { fontSize: '15px', fontWeight: '700' } }, minutes + ' phút'),
        el('div', { class: 'text-dim', style: { fontSize: '14px', minWidth: '0' } }, textVi)
      );
    }
    var timeline = window.UI.card('80 phút hôm nay', 'gold',
      tlRow(CAT_COLORS.cardio, 10, 'Máy leo cầu thang (khởi động)', 34),
      tlRow(GOLD, 50, 'Tập máy — ' + d.titleVi, 130),
      tlRow(CAT_COLORS.cardio, 20, 'Đi bộ nhanh máy chạy bộ', 62)
    );

    // --- cầu thang & máy chạy ---
    var stairsCard = null, treadCard = null;
    if (d.stairs) {
      stairsCard = window.UI.card('1️⃣ Máy leo cầu thang — ' + d.stairs.minutes + ' phút', 'cardio',
        window.UI.bulletList(d.stairs.phases.map(function (p) {
          return 'Phút ' + p.from + '–' + p.to + ': ' + p.textVi;
        }), CAT_COLORS.cardio)
      );
    }
    if (d.treadmill) {
      treadCard = window.UI.card('3️⃣ Máy chạy bộ — ' + d.treadmill.minutes + ' phút', 'cardio',
        window.UI.bulletList(d.treadmill.phases.map(function (p) {
          return 'Phút ' + p.from + '–' + p.to + ': ' + p.textVi;
        }), CAT_COLORS.cardio)
      );
    }

    // --- danh sách bài tập ---
    var exList = el('div', null);
    d.exercises.forEach(function (e, idx) {
      var m = window.GYM.byId(e.machineId);
      var color = CAT_COLORS[m.category] || GOLD;
      exList.appendChild(el('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: '12px',
          minHeight: '64px', padding: '10px 12px', marginBottom: '8px',
          background: 'var(--surface-alt)', border: '1px solid var(--line)',
          borderRadius: '14px', cursor: 'pointer'
        },
        onclick: function () { window.App.go('#exercise/' + e.id); }
      },
        el('div', {
          style: {
            flex: '0 0 30px', width: '30px', height: '30px', borderRadius: '50%',
            background: color, color: '#0B0E14', fontWeight: '800', fontSize: '15px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }
        }, String(idx + 1)),
        el('div', { style: { minWidth: '0', flex: '1' } },
          el('div', { style: { fontWeight: '800', fontSize: '16px' } }, e.nameVi + ' (' + e.nameKo + ')'),
          el('div', { class: 'text-dim', style: { fontSize: '13.5px' } },
            setsRepsLabel(e) + ' · nghỉ ' + e.restSeconds + ' giây'),
          el('div', { class: 'text-dim', style: { fontSize: '12.5px' } }, '📍 ' + m.zoneVi)
        ),
        el('span', { style: { color: 'var(--text-dim)', fontSize: '20px' } }, '›')
      ));
    });
    var weightsCard = window.UI.card('2️⃣ Tập máy — 50 phút', 'gold', exList,
      window.Game.getWeekMode() === 'first2'
        ? el('div', { class: 'text-gold', style: { fontSize: '13.5px', marginTop: '4px' } },
            '★ Chế độ tuần 1–2 đang bật: mọi bài chỉ 2 hiệp.')
        : null
    );

    show(screen(
      window.UI.topbar(d.nameVi + ' — ' + d.titleVi, d.focusVi, back),
      timeline,
      stairsCard,
      weightsCard,
      treadCard,
      d.tipsVi && d.tipsVi.length
        ? window.UI.card('Mẹo hôm nay 💡', 'ok', window.UI.bulletList(d.tipsVi, 'var(--ok)'))
        : null,
      window.UI.primaryBtn('Bắt đầu', function () { window.App.go('#session/' + dow); })
    ));
  }

  // ==========================================================
  // ATTENDANCE
  // ==========================================================
  var MONTH_VI = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  function attendance(viewYear, viewMonth) {
    var now = new Date();
    if (!viewYear) { viewYear = now.getFullYear(); viewMonth = now.getMonth() + 1; }

    var st = window.Game.state();
    var ms = window.Game.monthStats(viewYear, viewMonth);
    var attSet = {};
    st.attendance.forEach(function (iso) { attSet[iso] = true; });
    var tIso = todayIso();

    // --- thẻ cấp độ ---
    var xpPct = st.xpForNext > 0 ? Math.round((st.xpIntoLevel / st.xpForNext) * 100) : 0;
    var levelCard = window.UI.card(null, 'gold',
      el('div', { class: 'row' },
        el('div', { class: 'big-number' }, 'Lv ' + st.level),
        el('div', { style: { minWidth: '0', flex: '1' } },
          el('div', { style: { fontWeight: '800', fontSize: '17px' } }, window.Game.levelTitleVi(st.level)),
          el('div', { class: 'text-dim', style: { fontSize: '13.5px' } },
            st.xpIntoLevel + ' / ' + st.xpForNext + ' XP đến cấp sau')
        ),
        el('div', { style: { textAlign: 'right' } },
          el('div', { style: { fontSize: '20px', fontWeight: '800' } }, '🔥 ' + st.streak),
          el('div', { class: 'text-dim', style: { fontSize: '12.5px' } }, 'Kỷ lục: ' + st.bestStreak)
        )
      ),
      el('div', { class: 'progress-bar mt-8' },
        el('div', { class: 'progress-fill', style: { width: Math.max(2, xpPct) + '%' } })
      )
    );

    // --- vòng % tháng ---
    var gaugeCanvas = el('canvas', { style: { width: '150px', height: '150px' } });
    var gaugeWrap = el('div', { style: { position: 'relative', width: '150px', height: '150px', margin: '0 auto' } },
      gaugeCanvas,
      el('div', {
        style: {
          position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }
      },
        el('div', { style: { fontSize: '34px', fontWeight: '800', color: GOLD, lineHeight: '1.1' } }, ms.ratePercent + '%'),
        el('div', { class: 'text-dim', style: { fontSize: '12px' } }, ms.attended + '/' + ms.daysElapsed + ' ngày')
      )
    );
    drawLater(function () { window.UI.timerRing(gaugeCanvas, ms.ratePercent, 100); });

    var monthCard = window.UI.card('Tỷ lệ đi tập trong tháng', null,
      gaugeWrap,
      el('div', { class: 'row mt-16', style: { justifyContent: 'center', gap: '14px' } },
        window.UI.statPill('Đã tập', ms.attended),
        window.UI.statPill('Bỏ lỡ', ms.missed)
      ),
      el('div', { class: 'text-dim mt-8', style: { fontSize: '13px', textAlign: 'center' } },
        'Tỷ lệ tính trên ngày tập được — đã trừ ' + (Number(ms.closedDays) || 0) +
        ' ngày phòng gym nghỉ và ' + (Number(ms.restDays) || 0) + ' ngày nghỉ theo lịch.'),
      el('div', { class: 'text-dim', style: { fontSize: '13px', textAlign: 'center', marginTop: '4px' } },
        'Ngày nghỉ không ảnh hưởng đến chuỗi ngày của em.')
    );

    // --- lịch tháng ---
    var calCycleCfg = currentCycle();
    var calGrid = el('div', { class: 'cal-grid' });
    ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].forEach(function (h) {
      calGrid.appendChild(el('div', { class: 'cal-head' }, h));
    });
    var first = new Date(viewYear, viewMonth - 1, 1);
    var lastDay = new Date(viewYear, viewMonth, 0).getDate();
    var offset = (first.getDay() + 6) % 7; // thứ Hai đứng đầu
    for (var b = 0; b < offset; b++) calGrid.appendChild(el('div', { class: 'cal-cell cal-empty' }, '·'));
    for (var dd = 1; dd <= lastDay; dd++) {
      var iso = viewYear + '-' + pad2(viewMonth) + '-' + pad2(dd);
      var cls = 'cal-cell';
      var content = String(dd);
      var cellStyle = null;
      var dayClosed = isClosed(iso);

      if (attSet[iso]) {
        cls += ' cal-attended';
        content = '💪';
      } else if (dayClosed) {
        // Ngày phòng gym nghỉ: xám + 🌿, KHÔNG BAO GIỜ đánh dấu vắng mặt đỏ.
        content = '🌿';
        cellStyle = {
          background: 'rgba(107,118,102,0.10)',
          border: '1px dashed ' + GREY,
          color: 'var(--text-dim)',
          opacity: '0.85'
        };
      } else if (iso < tIso) {
        cls += ' cal-missed';
      } else if (iso > tIso) {
        cls += ' cal-dim';
      }
      if (iso === tIso) cls += ' cal-today';

      var cell = el('div', cellStyle ? { class: cls, style: cellStyle } : { class: cls }, content);

      // Chấm hồng: ngày dự kiến có kinh (chỉ khi đã thiết lập chu kỳ)
      if (calCycleCfg.lastStartIso) {
        var ciDay = cycleAt(iso);
        if (ciDay.configured && ciDay.isPeriod) {
          cell.appendChild(el('span', {
            style: {
              position: 'absolute', bottom: '3px', left: '50%', marginLeft: '-3px',
              width: '6px', height: '6px', borderRadius: '50%', background: PINK
            }
          }));
        }
      }

      calGrid.appendChild(cell);
    }

    // --- chú giải lịch ---
    function legendItem(mark, textVi, color) {
      return el('span', { class: 'row', style: { gap: '6px', fontSize: '12.5px', color: 'var(--text-dim)' } },
        el('span', { style: { fontSize: '13px', color: color || 'var(--text-dim)' } }, mark),
        textVi);
    }
    var calLegend = el('div', { class: 'row-wrap mt-8', style: { gap: '12px' } },
      legendItem('💪', 'Đã tập'),
      legendItem('🌿', 'Phòng gym nghỉ'),
      legendItem('⭕', 'Bỏ lỡ', 'var(--danger)'),
      calCycleCfg.lastStartIso ? legendItem('●', 'Dự kiến kỳ kinh', PINK) : null
    );

    var navRow = el('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '10px' } },
      el('button', {
        class: 'topbar-back', 'aria-label': 'Tháng trước',
        onclick: function () {
          var m = viewMonth - 1, y = viewYear;
          if (m < 1) { m = 12; y--; }
          attendance(y, m);
        }
      }, '‹'),
      el('div', { style: { fontWeight: '800', fontSize: '17px' } }, MONTH_VI[viewMonth] + ' ' + viewYear),
      el('button', {
        class: 'topbar-back', 'aria-label': 'Tháng sau',
        onclick: function () {
          var m = viewMonth + 1, y = viewYear;
          if (m > 12) { m = 1; y++; }
          attendance(y, m);
        }
      }, '›')
    );
    var calCard = window.UI.card(null, null, navRow, calGrid, calLegend);

    // --- tủ huy hiệu ---
    var badges = window.Game.badges();
    var earnedCount = 0;
    badges.forEach(function (bd) { if (bd.earned) earnedCount++; });
    var badgeGrid = el('div', {
      style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }
    });
    badges.forEach(function (bd) {
      badgeGrid.appendChild(el('div', {
        style: {
          background: bd.earned ? 'rgba(245,197,66,0.10)' : 'var(--surface-alt)',
          border: '1px solid ' + (bd.earned ? GOLD : 'var(--line)'),
          borderRadius: '14px', padding: '10px 6px', textAlign: 'center',
          opacity: bd.earned ? '1' : '0.6'
        }
      },
        el('div', { style: { fontSize: '26px', lineHeight: '1.2' } }, bd.earned ? bd.emoji : '🔒'),
        el('div', { style: { fontSize: '12.5px', fontWeight: '800', marginTop: '4px' } }, bd.nameVi),
        el('div', { class: 'text-dim', style: { fontSize: '11px', marginTop: '2px' } }, bd.descVi)
      ));
    });
    var badgeCard = window.UI.card('Bộ sưu tập huy hiệu — ' + earnedCount + ' / ' + badges.length,
      null, badgeGrid);

    // --- câu động viên ---
    var msNow = window.Game.monthStats(now.getFullYear(), now.getMonth() + 1);
    var motiv;
    if (st.streak >= 14) motiv = 'Chuỗi ' + st.streak + ' ngày — em là huyền thoại của CALISTA rồi! 👑';
    else if (st.streak >= 7) motiv = '🔥 ' + st.streak + ' ngày liên tiếp! Đừng để lửa tắt nhé!';
    else if (st.streak >= 3) motiv = 'Chuỗi ' + st.streak + ' ngày — thói quen đang hình thành! 💪';
    else if (msNow.ratePercent >= 70) motiv = 'Tháng này ' + msNow.ratePercent + '% — quá tuyệt vời!';
    else if (st.totalSessions >= 1) motiv = 'Mỗi buổi tập đều được tính. Hôm nay đi tập nhé! 🌱';
    else motiv = 'Hành trình nghìn dặm bắt đầu từ buổi tập đầu tiên! 🌱';

    show(screen(
      window.UI.topbar('Điểm danh', 'Chuỗi ngày · cấp độ · huy hiệu', back),
      levelCard,
      monthCard,
      calCard,
      el('div', { class: 'mb-16' },
        window.UI.secondaryBtn('Xem tổng kết tháng', function () {
          // Router tách theo '/': '#report/2026/8' (KHÔNG phải '2026-08').
          window.App.go('#report/' + viewYear + '/' + viewMonth);
        })),
      badgeCard,
      window.UI.card(null, 'gold',
        el('div', { class: 'text-center', style: { fontSize: '16.5px', fontWeight: '700' } }, motiv))
    ));
  }

  // ==========================================================
  // MAP
  // ==========================================================
  function map(focusId) {
    var selectedCat = null;
    var mapMount = null;

    var detailBox = el('div', null);

    function showDetail(m) {
      detailBox.innerHTML = '';
      if (!m) return;
      var exs = window.ROUTINE.exercisesUsing(m.id);
      var color = CAT_COLORS[m.category] || GOLD;
      var card = window.UI.card(m.nameVi, m.category,
        el('div', { class: 'text-dim', style: { fontSize: '14.5px', marginTop: '-6px' } },
          m.nameKo + (m.brand ? ' · ' + m.brand : '')),
        el('div', { class: 'mt-8', style: { fontSize: '15px' } }, '📍 ' + m.zoneVi),
        m.landmarkVi ? el('div', { class: 'text-dim', style: { fontSize: '14px', marginTop: '4px' } }, m.landmarkVi) : null,
        exs.length
          ? el('div', { class: 'mt-8' },
              el('div', { style: { fontWeight: '800', fontSize: '14.5px', marginBottom: '6px' } }, 'Các bài tập dùng máy này:'),
              el('div', { class: 'row-wrap' }, exs.map(function (e) {
                return window.UI.chip(e.nameVi, color);
              })))
          : null,
        el('div', { class: 'mt-16' },
          window.UI.secondaryBtn('Xem chi tiết', function () { window.App.go('#machine/' + m.id); }))
      );
      detailBox.appendChild(card);
    }

    function currentHighlights() {
      if (focusId) return [focusId];
      if (!selectedCat) return [];
      return window.GYM.machines
        .filter(function (m) { return m.category === selectedCat; })
        .map(function (m) { return m.id; });
    }

    // --- lọc theo loại ---
    var chipRow = el('div', { class: 'row-wrap', style: { marginBottom: '12px' } });
    function rebuildChips() {
      chipRow.innerHTML = '';
      Object.keys(CAT_NAMES).forEach(function (k) {
        var active = selectedCat === k;
        var c = window.UI.chip(CAT_NAMES[k], CAT_COLORS[k]);
        c.style.cursor = 'pointer';
        if (active) {
          c.style.borderColor = CAT_COLORS[k];
          c.style.background = 'rgba(245,197,66,0.12)';
        }
        c.addEventListener('click', function () {
          selectedCat = active ? null : k;
          focusId = null;
          rebuildChips();
          if (mapMount) mapMount.update({ highlightIds: currentHighlights(), fromId: null, toId: null });
        });
        chipRow.appendChild(c);
      });
    }
    rebuildChips();

    var mapBox = el('div', null);

    // --- chú giải ---
    var legend = el('div', { class: 'row-wrap mt-8' },
      Object.keys(CAT_NAMES).map(function (k) {
        return el('span', { class: 'row', style: { gap: '5px', fontSize: '12.5px', color: 'var(--text-dim)' } },
          el('span', { style: { width: '10px', height: '10px', borderRadius: '3px', background: CAT_COLORS[k], display: 'inline-block' } }),
          CAT_NAMES[k]);
      })
    );

    show(screen(
      window.UI.topbar('Bản đồ phòng gym', 'FITNESS CALISTA — chạm vào máy để xem', back),
      chipRow,
      el('div', { class: 'card', style: { padding: '10px' } }, mapBox, legend),
      detailBox
    ));

    mapMount = window.GymMapCanvas.mount(mapBox, {
      highlightIds: currentHighlights(),
      fromId: focusId ? 'info_desk' : null,
      toId: focusId || null,
      showLabels: true,
      onClick: function (m) {
        showDetail(m);
        if (mapMount) mapMount.update({ highlightIds: [m.id] });
      }
    });
    window.App.cleanup.push(mapMount);

    if (focusId) showDetail(window.GYM.byId(focusId));
  }

  // ==========================================================
  // LIBRARY
  // ==========================================================
  function library() {
    var input = el('input', {
      type: 'search', placeholder: 'Tìm máy... (vd: leg press)',
      autocomplete: 'off', autocorrect: 'off',
      style: {
        width: '100%', minHeight: '52px', padding: '12px 16px',
        borderRadius: '14px', border: '1px solid var(--line)',
        background: 'var(--surface)', color: 'var(--text)',
        fontSize: '16px', fontFamily: 'inherit', outline: 'none',
        marginBottom: '14px', WebkitAppearance: 'none'
      }
    });

    var listBox = el('div', null);

    function norm(s) {
      return String(s || '').toLowerCase();
    }

    function render(query) {
      listBox.innerHTML = '';
      var q = norm(query).trim();
      var zones = [];
      var byZone = {};
      window.GYM.machines.forEach(function (m) {
        if (q && norm(m.nameVi).indexOf(q) === -1 && norm(m.nameKo).indexOf(q) === -1 &&
            norm(m.brand).indexOf(q) === -1 && norm(m.id).indexOf(q) === -1) return;
        if (!byZone[m.zoneVi]) { byZone[m.zoneVi] = []; zones.push(m.zoneVi); }
        byZone[m.zoneVi].push(m);
      });

      if (!zones.length) {
        listBox.appendChild(el('div', { class: 'text-dim text-center mt-16' }, 'Không tìm thấy máy nào.'));
        return;
      }

      zones.forEach(function (z) {
        listBox.appendChild(el('div', {
          class: 'text-dim',
          style: { fontWeight: '800', fontSize: '13.5px', margin: '16px 2px 8px', textTransform: 'uppercase', letterSpacing: '0.4px' }
        }, z));
        byZone[z].forEach(function (m) {
          var color = CAT_COLORS[m.category] || GOLD;
          listBox.appendChild(el('div', {
            style: {
              display: 'flex', alignItems: 'center', gap: '12px',
              minHeight: '60px', padding: '10px 12px', marginBottom: '8px',
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: '14px', cursor: 'pointer'
            },
            onclick: function () { window.App.go('#machine/' + m.id); }
          },
            el('div', { style: { flex: '0 0 5px', alignSelf: 'stretch', borderRadius: '3px', background: color } }),
            el('div', { style: { minWidth: '0', flex: '1' } },
              el('div', { style: { fontWeight: '800', fontSize: '15.5px' } }, m.nameVi + ' (' + m.nameKo + ')'),
              m.landmarkVi ? el('div', { class: 'text-dim', style: { fontSize: '13px' } }, m.landmarkVi) : null
            ),
            el('span', { style: { color: 'var(--text-dim)', fontSize: '20px' } }, '›')
          ));
        });
      });
    }

    input.addEventListener('input', function () { render(input.value); });
    render('');

    show(screen(
      window.UI.topbar('Danh sách máy', window.GYM.machines.length + ' máy trong phòng gym', back),
      input,
      listBox
    ));
  }

  // ==========================================================
  // MACHINE
  // ==========================================================
  function machine(id) {
    var m = window.GYM.byId(id);
    var exs = window.ROUTINE.exercisesUsing(id);
    var dist = window.GYM.distanceMeters('info_desk', id);
    var steps = window.GYM.walkSteps('info_desk', id);

    var mapBox = el('div', null);

    var exList = el('div', null);
    if (exs.length) {
      exs.forEach(function (e) {
        var dRef = null;
        window.ROUTINE.days.forEach(function (dy) {
          if (!dRef && dy.exercises.indexOf(e) !== -1) dRef = dy;
        });
        exList.appendChild(el('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: '10px',
            minHeight: '58px', padding: '8px 12px', marginBottom: '8px',
            background: 'var(--surface-alt)', border: '1px solid var(--line)',
            borderRadius: '14px', cursor: 'pointer'
          },
          onclick: function () { window.App.go('#exercise/' + e.id); }
        },
          el('div', { style: { minWidth: '0', flex: '1' } },
            el('div', { style: { fontWeight: '800', fontSize: '15.5px' } }, e.nameVi),
            el('div', { class: 'text-dim', style: { fontSize: '13px' } },
              (dRef ? dRef.nameVi + ' · ' : '') + setsRepsLabel(e))
          ),
          el('span', { style: { color: 'var(--text-dim)', fontSize: '20px' } }, '›')
        ));
      });
    } else {
      exList.appendChild(el('div', { class: 'text-dim', style: { fontSize: '14.5px' } },
        'Máy này không nằm trong lịch tập hiện tại.'));
    }

    show(screen(
      window.UI.topbar(m.nameVi, m.nameKo + (m.brand ? ' · ' + m.brand : ''), back),
      el('div', { class: 'card', style: { padding: '10px' } }, mapBox),
      window.UI.card('Đường đi từ quầy lễ tân (~' + dist + 'm)', m.category,
        window.UI.numberedList(steps),
        m.landmarkVi ? el('div', { class: 'text-dim mt-8', style: { fontSize: '14px' } }, '📍 ' + m.zoneVi) : null
      ),
      window.UI.card('Các bài tập dùng máy này', null, exList)
    ));

    var mount = window.GymMapCanvas.mount(mapBox, {
      highlightIds: [id],
      fromId: 'info_desk',
      toId: id,
      showLabels: true,
      onClick: function (mm) { window.App.go('#machine/' + mm.id); }
    });
    window.App.cleanup.push(mount);
  }

  // ==========================================================
  // EXERCISE
  // ==========================================================
  function exercise(id) {
    var e = window.ROUTINE.exerciseById(id);
    if (!e) {
      show(screen(
        window.UI.topbar('Không tìm thấy bài tập', null, back),
        window.UI.card(null, 'danger', 'Bài tập này không tồn tại.'),
        window.UI.secondaryBtn('Về trang chủ', goHome)
      ));
      return;
    }
    var m = window.GYM.byId(e.machineId);
    var sets = effectiveSets(e);

    // --- thẻ chỉ số ---
    var stats = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' } },
      window.UI.statPill('Hiệp', sets),
      window.UI.statPill(e.timeSeconds ? 'Thời gian' : 'Số lần',
        e.timeSeconds ? e.repsLabelVi : e.repsLabelVi.replace(' lần', '')),
      window.UI.statPill('Nghỉ', window.UI.fmtTime(e.restSeconds))
    );

    var perSideNote = e.perSide
      ? el('div', { class: 'text-gold', style: { fontSize: '14px', fontWeight: '700', marginBottom: '12px', textAlign: 'center' } },
          '↔️ Tập từng bên: xong một bên rồi đổi chân.')
      : null;

    // --- hoạt ảnh động tác ---
    var motionBox = el('div', null);
    var motionCard = window.UI.card('Động tác', m.category,
      motionBox,
      el('div', { class: 'text-dim mt-8', style: { fontSize: '14.5px' } }, window.Motion.labelVi(e.motion))
    );

    // --- cơ bắp ---
    var anatomyBox = el('div', null);
    var legendBox = el('div', { class: 'mt-8' });
    var anatomyCard = window.UI.card('Cơ nào đang làm việc?', null, anatomyBox, legendBox);

    // --- hướng dẫn ---
    var setupCard = window.UI.card('Chuẩn bị máy', 'gold', window.UI.numberedList(e.setupVi));
    var formCard = window.UI.card('Cách thực hiện', 'ok', window.UI.numberedList(e.formVi));
    var cautionCard = e.cautionsVi && e.cautionsVi.length
      ? window.UI.card('Tránh những lỗi này ⚠️', 'danger', window.UI.bulletList(e.cautionsVi, 'var(--danger)'))
      : null;
    var noteCard = e.noteVi
      ? window.UI.card('Ghi chú 📌', 'gold', el('div', { style: { fontSize: '15.5px' } }, e.noteVi))
      : null;

    // --- máy thay thế ---
    var altCard = null;
    if (e.altMachineIds && e.altMachineIds.length) {
      altCard = window.UI.card('Nếu máy bận hoặc quá nặng', null,
        el('div', { class: 'row-wrap' }, e.altMachineIds.map(function (aid) {
          var am = window.GYM.byId(aid);
          var c = window.UI.chip(am.nameVi + ' (' + am.nameKo + ')', CAT_COLORS[am.category] || GOLD);
          c.style.cursor = 'pointer';
          c.addEventListener('click', function () { window.App.go('#machine/' + aid); });
          return c;
        }))
      );
    }

    // --- vị trí máy ---
    var locCard = window.UI.card('Máy ở đâu?', m.category,
      el('div', { style: { fontWeight: '800', fontSize: '16px' } }, m.nameVi + ' (' + m.nameKo + ')'),
      el('div', { class: 'text-dim', style: { fontSize: '14.5px', marginTop: '4px' } }, '📍 ' + m.zoneVi),
      m.landmarkVi ? el('div', { class: 'text-dim', style: { fontSize: '14px', marginTop: '2px' } }, m.landmarkVi) : null,
      el('div', { class: 'mt-16' },
        window.UI.secondaryBtn('Xem trên bản đồ', function () { window.App.go('#map/' + m.id); }))
    );

    show(screen(
      window.UI.topbar(e.nameVi, e.nameKo, back),
      stats,
      perSideNote,
      motionCard,
      anatomyCard,
      setupCard,
      formCard,
      cautionCard,
      noteCard,
      altCard,
      locCard
    ));

    var mMount = window.Motion.mount(motionBox, e.motion, e.muscles);
    if (mMount) window.App.cleanup.push(mMount);
    var aMount = window.Anatomy.mount(anatomyBox, e.muscles);
    if (aMount) window.App.cleanup.push(aMount);
    window.Anatomy.legend(legendBox, e.muscles);
  }

  // ==========================================================
  // HISTORY
  // ==========================================================
  function history() {
    var sessions = window.Game.sessions();
    var st = window.Game.state();

    // --- tuần này ---
    var now = new Date();
    var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    var mondayIso = monday.getFullYear() + '-' + pad2(monday.getMonth() + 1) + '-' + pad2(monday.getDate());
    var thisWeek = 0;
    sessions.forEach(function (s) {
      var iso = sessionDateIso(s);
      if (iso && iso >= mondayIso) thisWeek++;
    });
    var lastIso = sessions.length ? sessionDateIso(sessions[0]) : null;

    // --- calo (ước tính) ---
    var hWeight = currentWeight();
    var kcalById = [];
    var totalKcal = 0;
    sessions.forEach(function (s, i) {
      var k = sessionKcal(s, hWeight);
      kcalById[i] = k;
      totalKcal += k;
    });

    var summary = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' } },
      window.UI.statPill('Tổng buổi', st.totalSessions),
      window.UI.statPill('Tuần này', thisWeek),
      window.UI.statPill('Gần nhất', lastIso ? fmtIsoVi(lastIso).slice(0, 5) : '—'),
      window.UI.statPill('Tổng calo (ước tính)', intVi(totalKcal) + ' kcal')
    );

    // --- biểu đồ 8 tuần ---
    var weekCounts = [];
    var weekLabels = [];
    for (var w = 7; w >= 0; w--) {
      var start = new Date(monday);
      start.setDate(start.getDate() - w * 7);
      var end = new Date(start);
      end.setDate(end.getDate() + 7);
      var sIso = start.getFullYear() + '-' + pad2(start.getMonth() + 1) + '-' + pad2(start.getDate());
      var eIso = end.getFullYear() + '-' + pad2(end.getMonth() + 1) + '-' + pad2(end.getDate());
      var count = 0;
      sessions.forEach(function (s) {
        var iso = sessionDateIso(s);
        if (iso && iso >= sIso && iso < eIso) count++;
      });
      weekCounts.push(count);
      weekLabels.push(pad2(start.getDate()) + '/' + pad2(start.getMonth() + 1));
    }

    var barCanvas = el('canvas', { style: { width: '100%', height: '150px' } });
    drawLater(function () {
      var dpr = window.devicePixelRatio || 1;
      var rect = barCanvas.getBoundingClientRect();
      var W = rect.width || 320, H = 150;
      barCanvas.width = Math.round(W * dpr);
      barCanvas.height = Math.round(H * dpr);
      var ctx = barCanvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var maxV = Math.max(6, Math.max.apply(null, weekCounts));
      var n = weekCounts.length;
      var gap = 10;
      var bw = (W - gap * (n + 1)) / n;
      var chartH = H - 30;
      for (var i = 0; i < n; i++) {
        var x = gap + i * (bw + gap);
        var h = Math.max(3, (weekCounts[i] / maxV) * (chartH - 16));
        var y = chartH - h;
        var isLast = i === n - 1;
        ctx.fillStyle = isLast ? GOLD : 'rgba(245,197,66,0.35)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, bw, h, 4);
        else ctx.rect(x, y, bw, h);
        ctx.fill();
        if (weekCounts[i] > 0) {
          ctx.fillStyle = '#F2F4F8';
          ctx.font = '700 12px -apple-system, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(String(weekCounts[i]), x + bw / 2, y - 5);
        }
        ctx.fillStyle = '#98A2B3';
        ctx.font = '600 10px -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(weekLabels[i], x + bw / 2, H - 8);
      }
    });
    var chartCard = window.UI.card('Số buổi mỗi tuần (8 tuần gần đây)', 'gold', barCanvas);

    // --- danh sách buổi tập ---
    var listBox = el('div', null);
    if (!sessions.length) {
      listBox.appendChild(window.UI.card(null, null,
        el('div', { class: 'text-dim text-center', style: { fontSize: '15px' } },
          'Chưa có buổi tập nào được lưu. Bắt đầu buổi đầu tiên nhé! 💪')));
    } else {
      sessions.slice(0, 30).forEach(function (s, idx) {
        var iso = sessionDateIso(s);
        var title = s.titleVi || (s.dow ? (window.ROUTINE.forDow(s.dow) || {}).titleVi : '') || 'Buổi tập';
        var exs = Array.isArray(s.exercises) ? s.exercises : [];
        var sKcal = kcalById[idx] || 0;
        var isPeriodSession = !!(s.periodMode || s.dow === 0);

        var detail = el('div', { style: { display: 'none', marginTop: '8px' } });
        if (exs.length) {
          exs.forEach(function (ex) {
            var sub = '';
            if (Array.isArray(ex.sets)) {
              sub = ex.sets.map(function (one) {
                if (!one) return '';
                var parts = [];
                if (typeof one.weight === 'number' && one.weight > 0) parts.push(one.weight + 'kg');
                if (typeof one.reps === 'number') parts.push(one.reps + ' lần');
                if (!parts.length && typeof one.seconds === 'number') parts.push(one.seconds + ' giây');
                return parts.join(' × ');
              }).filter(Boolean).join(' · ');
            } else if (typeof ex.weight === 'number' && ex.weight > 0) {
              sub = ex.weight + 'kg';
            }
            detail.appendChild(el('div', { style: { padding: '5px 0', borderTop: '1px solid var(--line)', fontSize: '14px' } },
              el('div', { style: { fontWeight: '700' } }, ex.nameVi || ex.id || '?'),
              sub ? el('div', { class: 'text-dim', style: { fontSize: '13px' } }, sub) : null
            ));
          });
        } else {
          detail.appendChild(el('div', { class: 'text-dim', style: { fontSize: '13.5px' } }, 'Không có chi tiết bài tập.'));
        }

        var arrow = el('span', { style: { color: 'var(--text-dim)', fontSize: '18px', transition: 'transform 0.15s ease' } }, '▾');
        var head = el('div', {
          class: 'row', style: { cursor: 'pointer', minHeight: '44px' },
          onclick: function () {
            var open = detail.style.display !== 'none';
            detail.style.display = open ? 'none' : 'block';
            arrow.style.transform = open ? 'none' : 'rotate(180deg)';
          }
        },
          el('div', { style: { minWidth: '0', flex: '1' } },
            el('div', { style: { fontWeight: '800', fontSize: '15.5px' } },
              (isPeriodSession ? '💗 ' : '') + title),
            el('div', { class: 'text-dim', style: { fontSize: '13px' } },
              (iso ? fmtIsoVi(iso) : '') + (exs.length ? ' · ' + exs.length + ' bài' : '') +
              (typeof s.xp === 'number' ? ' · +' + s.xp + ' XP' : '')),
            sKcal > 0
              ? el('div', { style: { fontSize: '13px', fontWeight: '800', color: GOLD, marginTop: '2px' } },
                  '🔥 ' + intVi(sKcal) + ' kcal (ước tính)')
              : null
          ),
          arrow
        );

        listBox.appendChild(el('div', { class: 'card', style: { padding: '12px 16px' } }, head, detail));
      });
    }

    show(screen(
      window.UI.topbar('Lịch sử tập luyện', st.totalSessions + ' buổi đã hoàn thành', back),
      summary,
      chartCard,
      el('div', { class: 'card-title', style: { margin: '18px 2px 10px' } }, 'Các buổi gần đây'),
      listBox
    ));
  }

  // ==========================================================
  // TỔNG KẾT THÁNG (monthlyReport)
  // ==========================================================
  function monthlyReport(y, m) {
    var now = new Date();

    // Chấp nhận cả dạng chuỗi '2026-08' (từ router hoặc nút điểm danh)
    if (typeof y === 'string' && y.indexOf('-') !== -1 && (m === undefined || m === null)) {
      var pp = y.split('-');
      y = pp[0];
      m = pp[1];
    }

    y = parseInt(y, 10);
    m = parseInt(m, 10);
    if (!isFinite(y) || !isFinite(m) || m < 1 || m > 12) {
      y = now.getFullYear();
      m = now.getMonth() + 1;
    }

    var tIso = todayIso();
    var weight = currentWeight();

    var rep = null;
    try {
      if (R() && typeof R().monthlyReport === 'function') {
        rep = R().monthlyReport(allSessions(), y, m, tIso, weight);
      }
    } catch (e) { rep = null; }

    if (!rep || typeof rep !== 'object') {
      rep = {
        year: y, month: m, sessionCount: 0, openDays: 0, closedDays: 0, restDays: 0,
        attendedDays: 0, missedDays: 0, ratePercent: 0, totalKcal: 0,
        avgKcalPerSession: 0, totalSets: 0, totalVolumeKg: 0, totalMinutes: 0,
        bestStreak: 0, topExercises: [], dailyKcal: [], prevMonthKcal: 0, prevMonthSessions: 0
      };
    }
    if (!Array.isArray(rep.dailyKcal)) rep.dailyKcal = [];
    if (!Array.isArray(rep.topExercises)) rep.topExercises = [];

    markReportShown(y, m);

    function goMonth(dy, dm) {
      var yy = y, mm = m + dm;
      yy += dy;
      if (mm < 1) { mm = 12; yy--; }
      if (mm > 12) { mm = 1; yy++; }
      monthlyReport(yy, mm);
    }

    // --- chuyển tháng ---
    var navRow = el('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '14px' } },
      el('button', {
        class: 'topbar-back', 'aria-label': 'Tháng trước', type: 'button',
        onclick: function () { goMonth(0, -1); }
      }, '‹'),
      el('div', { style: { fontWeight: '800', fontSize: '17px' } }, MONTH_VI[m] + ' ' + y),
      el('button', {
        class: 'topbar-back', 'aria-label': 'Tháng sau', type: 'button',
        onclick: function () { goMonth(0, 1); }
      }, '›')
    );

    // --- hero: tổng calo ---
    var compare = kcalCompare(rep.totalKcal);
    var msg = '';
    try { msg = (R() && R().monthlyMessageVi(rep)) || ''; } catch (e) { msg = ''; }

    var heroCard = window.UI.card(null, 'gold',
      el('div', { class: 'text-center' },
        el('div', { class: 'text-dim', style: { fontSize: '14px', fontWeight: '700' } },
          'Ước tính đã đốt khoảng'),
        el('div', {
          class: 'big-number',
          style: { fontSize: '54px', marginTop: '2px' }
        }, intVi(rep.totalKcal)),
        el('div', { style: { fontSize: '17px', fontWeight: '800', marginTop: '-2px' } }, 'kcal'),
        compare
          ? el('div', { class: 'text-dim mt-8', style: { fontSize: '14.5px' } }, 'Tương đương ' + compare)
          : null,
        rep.sessionCount > 0
          ? el('div', { class: 'text-dim', style: { fontSize: '13.5px', marginTop: '4px' } },
              'Trung bình ' + intVi(rep.avgKcalPerSession) + ' kcal mỗi buổi')
          : null
      ),
      el('div', {
        style: {
          fontSize: '15.5px', lineHeight: '1.5', marginTop: '14px',
          paddingTop: '14px', borderTop: '1px solid var(--line)'
        }
      }, msg)
    );

    // --- 6 chỉ số ---
    var statsGrid = el('div', {
      style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }
    },
      window.UI.statPill('Số buổi tập', rep.sessionCount),
      window.UI.statPill('Tỷ lệ đi tập', rep.ratePercent + '%'),
      window.UI.statPill('Tổng số hiệp', rep.totalSets),
      window.UI.statPill('Tổng khối lượng', intVi(rep.totalVolumeKg) + ' kg'),
      window.UI.statPill('Tổng thời gian', minutesLabelVi(rep.totalMinutes)),
      window.UI.statPill('Chuỗi dài nhất', rep.bestStreak + ' ngày')
    );
    var skipDays = (Number(rep.closedDays) || 0) + (Number(rep.restDays) || 0);
    var statsCard = window.UI.card('Các con số trong tháng', null,
      statsGrid,
      el('div', { class: 'text-dim mt-8', style: { fontSize: '13px', textAlign: 'center' } },
        rep.openDays + ' ngày tập được' +
        (skipDays > 0
          ? ' (đã trừ ' + (Number(rep.closedDays) || 0) + ' ngày phòng gym nghỉ và ' +
            (Number(rep.restDays) || 0) + ' ngày nghỉ theo lịch)'
          : '')),
      el('div', { class: 'text-dim', style: { fontSize: '12.5px', textAlign: 'center', marginTop: '4px' } },
        'Ngày nghỉ không tính là vắng mặt và không làm đứt chuỗi ngày.')
    );

    // --- biểu đồ calo theo ngày ---
    var lastDayNum = rep.dailyKcal.length || (new Date(y, m, 0).getDate());
    var closedSet = {};
    closedDaysOf(y, m).forEach(function (iso) {
      closedSet[parseInt(iso.substring(8, 10), 10)] = true;
    });

    var chartCanvas = el('canvas', { style: { width: '100%', height: '170px' } });
    drawLater(function () {
      if (!chartCanvas.getContext) return;
      var dpr = window.devicePixelRatio || 1;
      var rect = chartCanvas.getBoundingClientRect();
      var W = rect.width || 320, H = 170;
      chartCanvas.width = Math.round(W * dpr);
      chartCanvas.height = Math.round(H * dpr);
      var ctx = chartCanvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      var maxV = 1;
      for (var q = 0; q < rep.dailyKcal.length; q++) {
        if (rep.dailyKcal[q].kcal > maxV) maxV = rep.dailyKcal[q].kcal;
      }
      var padX = 4;
      var baseY = H - 26;
      var slot = (W - padX * 2) / lastDayNum;
      var bw = Math.max(2, slot - 2);

      for (var i = 0; i < lastDayNum; i++) {
        var item = rep.dailyKcal[i] || { day: i + 1, kcal: 0 };
        var x = padX + i * slot + (slot - bw) / 2;
        if (item.kcal > 0) {
          var h = Math.max(3, (item.kcal / maxV) * (baseY - 16));
          ctx.fillStyle = GOLD;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, baseY - h, bw, h, 3);
          else ctx.rect(x, baseY - h, bw, h);
          ctx.fill();
        } else if (closedSet[item.day]) {
          ctx.fillStyle = GREY;
          ctx.beginPath();
          ctx.arc(x + bw / 2, baseY - 5, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(245,197,66,0.18)';
          ctx.fillRect(x, baseY - 2, bw, 2);
        }
      }

      ctx.fillStyle = '#2C3545';
      ctx.fillRect(0, baseY, W, 1);

      ctx.fillStyle = '#98A2B3';
      ctx.font = '600 10px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      for (var d2 = 1; d2 <= lastDayNum; d2++) {
        if (d2 === 1 || d2 % 5 === 0) {
          ctx.fillText(String(d2), padX + (d2 - 1) * slot + slot / 2, H - 9);
        }
      }
    });

    var chartCard = window.UI.card('Calo mỗi ngày', 'gold',
      chartCanvas,
      el('div', { class: 'text-dim mt-8', style: { fontSize: '12.5px' } },
        'Cột vàng: calo đã đốt · Chấm xám: ngày phòng gym nghỉ 🌿')
    );

    // --- so với tháng trước ---
    var prevCard = null;
    if (rep.prevMonthSessions > 0 || rep.prevMonthKcal > 0) {
      var dK = rep.totalKcal - rep.prevMonthKcal;
      var dS = rep.sessionCount - rep.prevMonthSessions;
      var deltaRow = function (labelVi, delta, unitVi) {
        var up = delta > 0, flat = delta === 0;
        var color = flat ? 'var(--text-dim)' : (up ? 'var(--ok)' : 'var(--danger)');
        var mark = flat ? '=' : (up ? '▲' : '▼');
        return el('div', { class: 'row', style: { justifyContent: 'space-between', padding: '6px 0' } },
          el('div', { style: { fontSize: '15px' } }, labelVi),
          el('div', { style: { fontWeight: '800', fontSize: '15px', color: color } },
            mark + ' ' + intVi(Math.abs(delta)) + ' ' + unitVi)
        );
      };
      prevCard = window.UI.card('So với tháng trước', null,
        deltaRow('Calo đã đốt', dK, 'kcal'),
        deltaRow('Số buổi tập', dS, 'buổi'),
        el('div', { class: 'text-dim mt-8', style: { fontSize: '13px' } },
          'Tháng trước: ' + intVi(rep.prevMonthKcal) + ' kcal · ' + rep.prevMonthSessions + ' buổi')
      );
    }

    // --- TOP 5 bài tập ---
    var topCard = null;
    if (rep.topExercises.length) {
      var maxSets = rep.topExercises[0].sets || 1;
      var topBox = el('div', null);
      rep.topExercises.forEach(function (t, i) {
        var pct = Math.max(6, Math.round((t.sets / maxSets) * 100));
        topBox.appendChild(el('div', { style: { marginBottom: '10px' } },
          el('div', { class: 'row', style: { justifyContent: 'space-between', gap: '10px' } },
            el('div', { style: { minWidth: '0', flex: '1', fontSize: '15px', fontWeight: '700' } },
              (i + 1) + '. ' + t.name),
            el('div', { style: { flex: '0 0 auto', fontSize: '14px', fontWeight: '800', color: GOLD } },
              t.sets + ' hiệp')
          ),
          el('div', { class: 'progress-bar', style: { marginTop: '5px', height: '8px' } },
            el('div', { class: 'progress-fill', style: { width: pct + '%' } }))
        ));
      });
      topCard = window.UI.card('5 bài tập nhiều nhất', null, topBox);
    }

    // --- thẻ chỉ số cơ thể (BMI + cân nặng + chiều cao + biểu đồ thay đổi) ---
    var bodyCard = buildBodyCard(function () {
      rerender(function () { monthlyReport(y, m); });
    });

    show(screen(
      window.UI.topbar('Tổng kết ' + MONTH_VI[m].toLowerCase(), 'Năm ' + y, back),
      navRow,
      heroCard,
      statsCard,
      chartCard,
      prevCard,
      topCard,
      bodyCard,
      window.UI.secondaryBtn('Về trang chủ', goHome)
    ));
  }

  // ==========================================================
  // xuất — session() do session.js gắn thêm vào cùng object
  // ==========================================================
  window.Screens = window.Screens || {};
  window.Screens.home = home;
  window.Screens.howto = howto;
  window.Screens.day = day;
  window.Screens.attendance = attendance;
  window.Screens.map = map;
  window.Screens.library = library;
  window.Screens.machine = machine;
  window.Screens.exercise = exercise;
  window.Screens.history = history;
  window.Screens.monthlyReport = monthlyReport;
})();

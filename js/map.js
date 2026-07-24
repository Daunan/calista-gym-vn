/* map.js — window.GymMapCanvas
   Bản đồ phòng gym FITNESS CALISTA (canvas, offline, không phụ thuộc ngoài).
   Hợp đồng: GymMapCanvas.mount(containerEl, opts) -> { update(opts), stop() }
*/
(function () {
  'use strict';

  // Màu theo danh mục (đồng bộ với biến CSS)
  var CAT_COLORS = {
    chest: '#FF6B81',
    back: '#4FA3FF',
    leg: '#4ED09A',
    shoulder: '#FF9ED2',
    arm: '#C9A0FF',
    cardio: '#FF9F45',
    free: '#E8E8E8',
    facility: '#6B7686'
  };
  var GOLD = '#F5C542';
  var LINE = '#2C3545';
  var TEXT = '#F2F4F8';
  var DIM = '#98A2B3';
  var BG = '#0B0E14';

  function hexToRgba(hex, alpha) {
    var h = hex.replace('#', '');
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
  }

  // Cắt chữ theo từng từ, tối đa 2 dòng
  function wrapTwoLines(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return [text];
    var words = String(text).split(' ');
    if (words.length === 1) return [text];
    var line1 = '';
    var i = 0;
    for (; i < words.length; i++) {
      var test = line1 ? line1 + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width <= maxWidth) {
        line1 = test;
      } else {
        break;
      }
    }
    if (!line1) { line1 = words[0]; i = 1; }
    var line2 = words.slice(i).join(' ');
    if (!line2) return [line1];
    // Nếu dòng 2 quá dài thì thêm dấu "…"
    while (line2.length > 1 && ctx.measureText(line2 + '…').width > maxWidth) {
      line2 = line2.slice(0, -1);
      if (ctx.measureText(line2).width <= maxWidth) { line2 = line2 + '…'; break; }
    }
    return [line1, line2];
  }

  function normalizeOpts(opts) {
    opts = opts || {};
    return {
      highlightIds: Array.isArray(opts.highlightIds) ? opts.highlightIds.slice() : [],
      fromId: opts.fromId || null,
      toId: opts.toId || null,
      showLabels: opts.showLabels !== false,
      onClick: typeof opts.onClick === 'function' ? opts.onClick : null
    };
  }

  function mount(containerEl, opts) {
    var state = normalizeOpts(opts);

    var canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.borderRadius = '14px';
    canvas.style.background = BG;
    canvas.style.touchAction = 'manipulation';
    containerEl.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var cssW = 0, cssH = 0;
    var pad = 14;       // lề trong (px CSS)
    var padTop = 26;    // chừa chỗ cho vạch "lối vào"
    var rafId = 0;
    var stopped = false;
    var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    function nowSec() {
      var n = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      return (n - t0) / 1000;
    }

    function resize() {
      var w = containerEl.clientWidth || 320;
      var h = Math.round(w / 0.78); // tỉ lệ dọc 0.78
      var dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      cssW = w;
      cssH = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // 0~100 -> pixel
    function px(x) { return pad + (x / 100) * (cssW - pad * 2); }
    function py(y) { return padTop + (y / 100) * (cssH - padTop - pad); }
    // pixel -> 0~100
    function ux(x) { return ((x - pad) / (cssW - pad * 2)) * 100; }
    function uy(y) { return ((y - padTop) / (cssH - padTop - pad)) * 100; }

    function machineRect(m) {
      var x = px(m.x), y = py(m.y);
      return { x: x, y: y, w: px(m.x + m.w) - x, h: py(m.y + m.h) - y };
    }

    function machineCenter(m) {
      return { x: px(m.x + m.w / 2), y: py(m.y + m.h / 2) };
    }

    function drawGrid() {
      ctx.save();
      ctx.strokeStyle = hexToRgba(LINE, 0.35);
      ctx.lineWidth = 1;
      for (var gx = 0; gx <= 100; gx += 10) {
        ctx.beginPath();
        ctx.moveTo(px(gx), py(0));
        ctx.lineTo(px(gx), py(100));
        ctx.stroke();
      }
      for (var gy = 0; gy <= 100; gy += 10) {
        ctx.beginPath();
        ctx.moveTo(px(0), py(gy));
        ctx.lineTo(px(100), py(gy));
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawEntrance() {
      // Vạch chấm vàng phía trên: hướng lối vào
      ctx.save();
      ctx.strokeStyle = hexToRgba(GOLD, 0.85);
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(pad, padTop - 12);
      ctx.lineTo(cssW - pad, padTop - 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = hexToRgba(GOLD, 0.95);
      ctx.font = '600 10px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▲ Lối vào (입구)', cssW / 2, padTop - 12);
      ctx.restore();
    }

    function isHighlighted(m) {
      if (state.toId && m.id === state.toId) return true;
      for (var i = 0; i < state.highlightIds.length; i++) {
        if (state.highlightIds[i] === m.id) return true;
      }
      return false;
    }

    function drawMachines(t) {
      var machines = (window.GYM && window.GYM.machines) || [];
      var smallCanvas = cssW < 340;

      for (var i = 0; i < machines.length; i++) {
        var m = machines[i];
        var color = CAT_COLORS[m.category] || CAT_COLORS.facility;
        var r = machineRect(m);
        var hl = isHighlighted(m);

        roundRectPath(ctx, r.x, r.y, r.w, r.h, 5);
        ctx.fillStyle = hexToRgba(color, hl ? 0.45 : 0.16);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(color, 0.9);
        ctx.lineWidth = hl ? 2.5 : 1.2;
        ctx.stroke();

        if (hl) {
          // Vòng tròn lan tỏa (theo thời gian)
          var c = machineCenter(m);
          var base = Math.max(r.w, r.h) * 0.55;
          var prog = (t % 1.4) / 1.4; // 0 -> 1
          var radius = base + prog * 22;
          var alpha = (1 - prog) * 0.6;
          ctx.beginPath();
          ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba(color, alpha);
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Nhãn
        var showThisLabel = state.showLabels && (!smallCanvas || hl);
        if (showThisLabel) {
          var fontSize = Math.max(7, Math.min(10, Math.round(r.h * 0.26)));
          ctx.font = (hl ? '700 ' : '500 ') + fontSize + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = hl ? TEXT : DIM;
          var lines = wrapTwoLines(ctx, m.nameVi || m.id, r.w - 6);
          var cx = r.x + r.w / 2;
          var cy = r.y + r.h / 2;
          if (lines.length === 1) {
            ctx.fillText(lines[0], cx, cy);
          } else {
            ctx.fillText(lines[0], cx, cy - fontSize * 0.58);
            ctx.fillText(lines[1], cx, cy + fontSize * 0.58);
          }
        }
      }
    }

    function drawFromMarker(t) {
      if (!state.fromId || !window.GYM) return;
      var m = window.GYM.byId(state.fromId);
      if (!m || typeof m.x !== 'number') return;
      var c = machineCenter(m);
      ctx.save();
      // Chấm xám "bạn đang ở đây"
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(DIM, 0.95);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(TEXT, 0.9);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Vòng lan tỏa nhẹ
      var prog = (t % 1.6) / 1.6;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 8 + prog * 14, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(DIM, (1 - prog) * 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    function drawRoute(t) {
      if (!state.fromId || !state.toId || !window.GYM || typeof window.GYM.route !== 'function') return;
      var pts = window.GYM.route(state.fromId, state.toId) || [];
      if (pts.length < 2) return;

      ctx.save();
      ctx.strokeStyle = hexToRgba(GOLD, 0.95);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -(t * 30) % 18; // đường chảy về phía đích
      ctx.beginPath();
      ctx.moveTo(px(pts[0].x), py(pts[0].y));
      for (var i = 1; i < pts.length; i++) {
        ctx.lineTo(px(pts[i].x), py(pts[i].y));
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Mũi tên ở cuối
      var a = pts[pts.length - 2];
      var b = pts[pts.length - 1];
      var ax = px(a.x), ay = py(a.y);
      var bx = px(b.x), by = py(b.y);
      var ang = Math.atan2(by - ay, bx - ax);
      var size = 10;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - size * Math.cos(ang - 0.45), by - size * Math.sin(ang - 0.45));
      ctx.lineTo(bx - size * Math.cos(ang + 0.45), by - size * Math.sin(ang + 0.45));
      ctx.closePath();
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.restore();
    }

    function frame() {
      if (stopped) return;
      if (containerEl.clientWidth && containerEl.clientWidth !== cssW) resize();
      var t = nowSec();

      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, cssW, cssH);

      drawGrid();
      drawEntrance();
      drawMachines(t);
      drawRoute(t);
      drawFromMarker(t);

      rafId = requestAnimationFrame(frame);
    }

    function onCanvasClick(ev) {
      if (!state.onClick || !window.GYM) return;
      var rect = canvas.getBoundingClientRect();
      var cx = ev.clientX - rect.left;
      var cy = ev.clientY - rect.top;
      var gx = ux(cx);
      var gy = uy(cy);
      var machines = window.GYM.machines || [];
      // Duyệt ngược để ưu tiên phần tử vẽ sau
      for (var i = machines.length - 1; i >= 0; i--) {
        var m = machines[i];
        // Nới vùng chạm ~1.2 đơn vị để dễ bấm bằng ngón tay
        var slack = 1.2;
        if (gx >= m.x - slack && gx <= m.x + m.w + slack &&
            gy >= m.y - slack && gy <= m.y + m.h + slack) {
          state.onClick(m);
          return;
        }
      }
    }

    canvas.addEventListener('click', onCanvasClick);

    var ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(function () { resize(); });
      ro.observe(containerEl);
    } else {
      window.addEventListener('resize', resize);
    }

    resize();
    rafId = requestAnimationFrame(frame);

    return {
      update: function (newOpts) {
        newOpts = newOpts || {};
        if ('highlightIds' in newOpts) state.highlightIds = Array.isArray(newOpts.highlightIds) ? newOpts.highlightIds.slice() : [];
        if ('fromId' in newOpts) state.fromId = newOpts.fromId || null;
        if ('toId' in newOpts) state.toId = newOpts.toId || null;
        if ('showLabels' in newOpts) state.showLabels = newOpts.showLabels !== false;
        if ('onClick' in newOpts) state.onClick = typeof newOpts.onClick === 'function' ? newOpts.onClick : null;
      },
      stop: function () {
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        canvas.removeEventListener('click', onCanvasClick);
        if (ro) { ro.disconnect(); } else { window.removeEventListener('resize', resize); }
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  window.GymMapCanvas = { mount: mount };
})();

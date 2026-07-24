/* anatomy.js — window.Anatomy
   Anh: hình cơ thể trước/sau cạnh nhau, tô sáng các nhóm cơ theo mức độ.
   Toạ độ chuẩn hoá 100×220 cho mỗi hình. Không phụ thuộc bên ngoài. */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var BODY_FILL = '#3A4454';
  var GRAY = '#8A94A6';
  var LVL_COLOR = { 1: '#FF3B30', 2: '#FF9500', 3: '#4FA3FF' };

  /* ------------------------------------------------------------------
     Vùng cơ. shape: {p:[[x,y],...]} đa giác hoặc {e:[cx,cy,rx,ry,rot]} elip.
     mir: vẽ thêm bản đối xứng qua x = 50.
  ------------------------------------------------------------------ */
  var FRONT = {
    delt_front:  { mir: 1, shapes: [{ e: [28, 36, 4, 5, 0] }] },
    delt_side:   { mir: 1, shapes: [{ e: [23.5, 38, 3, 6, 0.25] }] },
    chest_upper: { mir: 1, shapes: [{ p: [[49, 36], [32, 37], [33, 42], [49, 42]] }] },
    chest_mid:   { mir: 1, shapes: [{ p: [[49, 42], [33, 42], [35, 49], [49, 49]] }] },
    chest_lower: { mir: 1, shapes: [{ p: [[49, 49], [35, 49], [39, 54], [49, 53]] }] },
    biceps:      { mir: 1, shapes: [{ e: [20.5, 52, 3.6, 8, 0.18] }] },
    forearm:     { mir: 1, shapes: [{ e: [15.5, 76, 3.2, 10, 0.1] }] },
    abs:         { mir: 0, shapes: [{ p: [[43, 55], [57, 55], [57, 84], [50, 89], [43, 84]] }] },
    oblique:     { mir: 1, shapes: [{ p: [[37, 60], [42, 58], [42, 84], [36, 78]] }] },
    quad:        { mir: 1, shapes: [{ e: [41, 122, 6, 22, 0.04] }] },
    adductor:    { mir: 1, shapes: [{ e: [46.5, 112, 3, 13, 0.06] }] },
    abductor:    { mir: 1, shapes: [{ e: [34.5, 104, 3.4, 10, -0.08] }] }
  };

  var BACK = {
    trap_upper: { mir: 0, shapes: [{ p: [[44, 25], [56, 25], [66, 34], [50, 40], [34, 34]] }] },
    trap_mid:   { mir: 0, shapes: [{ p: [[50, 38], [59, 41], [50, 56], [41, 41]] }] },
    rhomboid:   { mir: 1, shapes: [{ p: [[43, 43], [48, 45], [48, 54], [43, 52]] }] },
    delt_rear:  { mir: 1, shapes: [{ e: [27, 37, 4.2, 5.2, 0] }] },
    triceps:    { mir: 1, shapes: [{ e: [19.5, 54, 3.8, 9, 0.2] }] },
    lat:        { mir: 1, shapes: [{ p: [[48, 44], [34, 40], [37, 62], [47, 72]] }] },
    lower_back: { mir: 0, shapes: [{ p: [[44, 66], [56, 66], [58, 84], [42, 84]] }] },
    glute:      { mir: 1, shapes: [{ e: [42, 92, 7, 7.5, 0] }] },
    hamstring:  { mir: 1, shapes: [{ e: [41, 128, 5.5, 19, 0.04] }] },
    calf:       { mir: 1, shapes: [{ e: [39, 172, 4.4, 13, 0.03] }] }
  };

  /* Bố cục canvas: hình trước tại offset 4, hình sau tại offset 108 (đơn vị 0–100). */
  var UNITS_W = 212;
  var UNITS_H = 236; /* 220 thân + chỗ cho nhãn */
  var OFF_FRONT = 4;
  var OFF_BACK = 108;

  function poly(ctx, pts, offX, s, mirror) {
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var x = mirror ? 100 - pts[i][0] : pts[i][0];
      var px = (offX + x) * s, py = pts[i][1] * s;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function pathShape(ctx, shape, offX, s, mirror) {
    if (shape.e) {
      var e = shape.e;
      var cx = mirror ? 100 - e[0] : e[0];
      var rot = mirror ? -e[4] : e[4];
      ctx.beginPath();
      ctx.ellipse((offX + cx) * s, e[1] * s, e[2] * s, e[3] * s, rot, 0, TAU);
      ctx.closePath();
    } else {
      poly(ctx, shape.p, offX, s, mirror);
    }
  }

  function strokeLine(ctx, pts, offX, s, lw, mirror) {
    ctx.lineWidth = lw * s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var x = mirror ? 100 - pts[i][0] : pts[i][0];
      var px = (offX + x) * s, py = pts[i][1] * s;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  function drawBody(ctx, offX, s) {
    ctx.fillStyle = BODY_FILL;
    ctx.strokeStyle = BODY_FILL;
    /* đầu */
    ctx.beginPath();
    ctx.arc((offX + 50) * s, 13 * s, 9 * s, 0, TAU);
    ctx.fill();
    /* cổ */
    ctx.fillRect((offX + 45) * s, 19 * s, 10 * s, 12 * s);
    /* thân: vai rộng, eo thon, hông */
    poly(ctx, [[25, 30], [75, 30], [71, 56], [64, 76], [67, 97], [33, 97], [36, 76], [29, 56]], offX, s, false);
    ctx.fill();
    /* tay trái + phải */
    strokeLine(ctx, [[27, 34], [19, 60], [14, 86], [13, 99]], offX, s, 9, false);
    strokeLine(ctx, [[27, 34], [19, 60], [14, 86], [13, 99]], offX, s, 9, true);
    /* chân: đùi, bắp chân, bàn chân */
    strokeLine(ctx, [[41, 98], [39, 148]], offX, s, 15, false);
    strokeLine(ctx, [[41, 98], [39, 148]], offX, s, 15, true);
    strokeLine(ctx, [[39, 148], [38, 192]], offX, s, 10, false);
    strokeLine(ctx, [[39, 148], [38, 192]], offX, s, 10, true);
    strokeLine(ctx, [[38, 192], [36, 206]], offX, s, 8, false);
    strokeLine(ctx, [[38, 192], [36, 206]], offX, s, 8, true);
  }

  function drawMuscle(ctx, def, offX, s, color, alpha, glowAlpha) {
    var passes = def.mir ? [false, true] : [false];
    for (var k = 0; k < passes.length; k++) {
      for (var i = 0; i < def.shapes.length; i++) {
        pathShape(ctx, def.shapes[i], offX, s, passes[k]);
        if (glowAlpha > 0) {
          /* viền phát sáng 3 lớp */
          ctx.strokeStyle = color;
          ctx.lineJoin = 'round';
          ctx.globalAlpha = glowAlpha * 0.10; ctx.lineWidth = 12; ctx.stroke();
          ctx.globalAlpha = glowAlpha * 0.20; ctx.lineWidth = 8;  ctx.stroke();
          ctx.globalAlpha = glowAlpha * 0.36; ctx.lineWidth = 4;  ctx.stroke();
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  function wave(t, period) {
    return 0.5 + 0.5 * Math.sin((t / period) * TAU);
  }

  function renderFrame(ctx, W, H, s, lvlMap, t) {
    ctx.clearRect(0, 0, W, H);
    drawBody(ctx, OFF_FRONT, s);
    drawBody(ctx, OFF_BACK, s);

    var sides = [[FRONT, OFF_FRONT], [BACK, OFF_BACK]];
    for (var si = 0; si < 2; si++) {
      var defs = sides[si][0], offX = sides[si][1];
      for (var m in defs) {
        if (!defs.hasOwnProperty(m)) continue;
        var lvl = lvlMap[m];
        var color, alpha, glow = 0;
        if (lvl === 1) {
          color = LVL_COLOR[1];
          alpha = 0.45 + 0.55 * wave(t, 1.4);
          glow = alpha;
        } else if (lvl === 2) {
          color = LVL_COLOR[2];
          alpha = 0.35 + 0.35 * wave(t, 1.8);
        } else if (lvl === 3) {
          color = LVL_COLOR[3];
          alpha = 0.35;
        } else {
          color = GRAY;
          alpha = 0.18;
        }
        drawMuscle(ctx, defs[m], offX, s, color, alpha, glow);
      }
    }

    /* nhãn TRƯỚC / SAU */
    var fs = Math.max(10, Math.round(8 * s));
    ctx.font = '700 ' + fs + 'px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#98A2B3';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('TRƯỚC', (OFF_FRONT + 50) * s, 231 * s);
    ctx.fillText('SAU', (OFF_BACK + 50) * s, 231 * s);
  }

  window.Anatomy = {
    /* mount(containerEl, muscles [{m,level}]) → {stop()} */
    mount: function (containerEl, muscles) {
      containerEl.innerHTML = '';
      var W = containerEl.clientWidth || 320;
      var H = Math.round(W * UNITS_H / UNITS_W); /* tỉ lệ ≈ 1.11–1.15 : 1 */
      var dpr = Math.min(window.devicePixelRatio || 1, 3);

      var canvas = document.createElement('canvas');
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      containerEl.appendChild(canvas);

      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      var s = W / UNITS_W;

      var lvlMap = {};
      (muscles || []).forEach(function (x) {
        if (x && x.m && !(lvlMap[x.m] < x.level)) lvlMap[x.m] = x.level;
      });

      var raf = 0, stopped = false;
      var t0 = performance.now();
      function loop(now) {
        if (stopped) return;
        renderFrame(ctx, W, H, s, lvlMap, (now - t0) / 1000);
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);

      return {
        stop: function () {
          stopped = true;
          if (raf) cancelAnimationFrame(raf);
        }
      };
    },

    /* legend(containerEl, muscles) — chấm màu + tên cơ tiếng Việt */
    legend: function (containerEl, muscles) {
      containerEl.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px 14px;justify-content:center;padding:4px 2px;';
      (muscles || []).forEach(function (x) {
        if (!x || !x.m) return;
        var item = document.createElement('span');
        item.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#F2F4F8;line-height:1.3;';
        var dot = document.createElement('span');
        dot.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:50%;flex:none;background:' +
          (LVL_COLOR[x.level] || GRAY) + ';';
        var name = document.createElement('span');
        var vi = (window.MUSCLE_VI && window.MUSCLE_VI[x.m]) || x.m;
        name.textContent = vi;
        item.appendChild(dot);
        item.appendChild(name);
        wrap.appendChild(item);
      });
      containerEl.appendChild(wrap);
    }
  };
})();

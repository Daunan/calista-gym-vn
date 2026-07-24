/* motion.js — window.Motion
   Hình người khớp nhìn nghiêng lặp lại động tác, cơ chính phát sáng đỏ.
   Toạ độ chuẩn hoá 100×94. Chu kỳ 2.8 giây, phase 0→1→0 (easeInOut). */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var WHITE = 'rgba(242,244,248,1)';
  var GOLD = 'rgba(245,197,66,1)';
  var WHITE_DIM = 'rgba(242,244,248,0.35)';
  var GOLD_DIM = 'rgba(245,197,66,0.38)';
  var PROP_FILL = '#222A37';
  var PROP_LINE = '#3A4454';
  var PERIOD = 2.8;

  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpPose(A, B, t) {
    var out = {};
    for (var k in A) {
      if (!A.hasOwnProperty(k)) continue;
      var b = B[k] || A[k];
      out[k] = [lerp(A[k][0], b[0], t), lerp(A[k][1], b[1], t)];
    }
    return out;
  }
  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

  /* ---- tiện ích vẽ đạo cụ ---- */
  function rect(ctx, u, x, y, w, h) {
    ctx.fillStyle = PROP_FILL;
    ctx.strokeStyle = PROP_LINE;
    ctx.lineWidth = Math.max(1, u * 0.7);
    ctx.beginPath();
    ctx.rect(x * u, y * u, w * u, h * u);
    ctx.fill();
    ctx.stroke();
  }
  function line(ctx, u, x1, y1, x2, y2, lw, col) {
    ctx.strokeStyle = col || PROP_LINE;
    ctx.lineWidth = lw * u;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1 * u, y1 * u);
    ctx.lineTo(x2 * u, y2 * u);
    ctx.stroke();
  }
  function ground(ctx, u, x1, x2, y) {
    line(ctx, u, x1, y, x2, y, 1.2, '#2C3545');
  }

  /* ------------------------------------------------------------------
     Định nghĩa 14 động tác.
     A: tư thế duỗi (thả lỏng), B: tư thế siết (co cơ).
     Khớp: hd đầu, sh vai, el khuỷu, ha tay, hp hông, kn gối, an cổ chân.
     moving: chi được tô vàng. far: 'same' | 'alt' | 'staticA'.
     glow(pose): các điểm phát sáng đỏ (vị trí cơ chính).
  ------------------------------------------------------------------ */
  var DEFS = {

    press_horizontal: {
      moving: ['arm'], far: 'same',
      A: { hd: [35, 20], sh: [38, 32], el: [32, 42], ha: [46, 40], hp: [40, 58], kn: [58, 60], an: [58, 84] },
      B: { hd: [35, 20], sh: [38, 32], el: [50, 35], ha: [64, 33], hp: [40, 58], kn: [58, 60], an: [58, 84] },
      prop: function (c, u) { rect(c, u, 27, 24, 6, 40); rect(c, u, 30, 60, 26, 5); rect(c, u, 34, 65, 4, 22); ground(c, u, 20, 78, 88); },
      glow: function (p) { return [[p.sh[0] + 6, p.sh[1] + 6]]; }
    },

    press_overhead: {
      moving: ['arm'], far: 'same',
      A: { hd: [37, 24], sh: [40, 36], el: [50, 40], ha: [47, 28], hp: [42, 62], kn: [58, 64], an: [58, 86] },
      B: { hd: [37, 24], sh: [40, 36], el: [45, 22], ha: [43, 10], hp: [42, 62], kn: [58, 64], an: [58, 86] },
      prop: function (c, u) { rect(c, u, 29, 30, 6, 38); rect(c, u, 32, 64, 24, 5); rect(c, u, 36, 69, 4, 20); ground(c, u, 22, 78, 90); },
      glow: function (p) { return [[p.sh[0] + 3, p.sh[1] - 2]]; }
    },

    pulldown: {
      moving: ['arm'], far: 'same',
      A: { hd: [39, 24], sh: [42, 34], el: [50, 22], ha: [54, 10], hp: [44, 60], kn: [60, 62], an: [58, 86] },
      B: { hd: [39, 24], sh: [42, 34], el: [47, 44], ha: [55, 38], hp: [44, 60], kn: [60, 62], an: [58, 86] },
      prop: function (c, u, p) {
        rect(c, u, 36, 64, 22, 4); rect(c, u, 54, 54, 12, 4); rect(c, u, 56, 2, 10, 3);
        line(c, u, 61, 5, p.ha[0], p.ha[1], 0.8, '#5A6577'); ground(c, u, 28, 76, 90);
      },
      glow: function (p) { return [[p.sh[0] - 5, p.sh[1] + 9]]; }
    },

    row: {
      moving: ['arm'], far: 'same',
      A: { hd: [34, 24], sh: [37, 34], el: [48, 40], ha: [61, 38], hp: [39, 60], kn: [57, 62], an: [60, 84] },
      B: { hd: [34, 24], sh: [37, 34], el: [30, 44], ha: [44, 41], hp: [39, 60], kn: [57, 62], an: [60, 84] },
      prop: function (c, u) { rect(c, u, 47, 33, 4, 20); rect(c, u, 28, 64, 24, 4); rect(c, u, 60, 78, 7, 9); ground(c, u, 20, 76, 88); },
      glow: function (p) { return [[p.sh[0] - 6, p.sh[1] + 8]]; }
    },

    lateral_raise: {
      moving: ['arm'], far: 'same',
      A: { hd: [45, 14], sh: [46, 27], el: [47, 39], ha: [48, 50], hp: [47, 55], kn: [46, 72], an: [46, 88] },
      B: { hd: [45, 14], sh: [46, 27], el: [59, 25], ha: [71, 21], hp: [47, 55], kn: [46, 72], an: [46, 88] },
      prop: function (c, u, p) {
        ground(c, u, 28, 68, 90);
        c.fillStyle = '#98A2B3';
        c.beginPath(); c.arc(p.ha[0] * u, p.ha[1] * u, 1.8 * u, 0, TAU); c.fill();
      },
      glow: function (p) { return [[p.sh[0] + 3, p.sh[1] - 1]]; }
    },

    leg_extension: {
      moving: ['leg'], far: 'same',
      A: { hd: [34, 22], sh: [37, 33], el: [43, 43], ha: [46, 52], hp: [40, 57], kn: [58, 58], an: [58, 82] },
      B: { hd: [34, 22], sh: [37, 33], el: [43, 43], ha: [46, 52], hp: [40, 57], kn: [58, 58], an: [80, 56] },
      prop: function (c, u, p) {
        rect(c, u, 27, 27, 6, 34); rect(c, u, 30, 58, 27, 5); rect(c, u, 34, 63, 4, 22);
        c.fillStyle = PROP_FILL; c.strokeStyle = PROP_LINE; c.lineWidth = u * 0.7;
        c.beginPath(); c.arc((p.an[0] + 2) * u, (p.an[1] + 1) * u, 2.2 * u, 0, TAU); c.fill(); c.stroke();
        ground(c, u, 22, 70, 88);
      },
      glow: function (p) { var m = mid(p.hp, p.kn); return [[m[0] + 1, m[1] - 3]]; }
    },

    leg_curl_seated: {
      moving: ['leg'], far: 'same',
      A: { hd: [34, 22], sh: [37, 33], el: [43, 43], ha: [46, 52], hp: [40, 57], kn: [58, 58], an: [80, 55] },
      B: { hd: [34, 22], sh: [37, 33], el: [43, 43], ha: [46, 52], hp: [40, 57], kn: [58, 58], an: [62, 80] },
      prop: function (c, u, p) {
        rect(c, u, 27, 27, 6, 34); rect(c, u, 30, 58, 27, 5); rect(c, u, 34, 63, 4, 22);
        c.fillStyle = PROP_FILL; c.strokeStyle = PROP_LINE; c.lineWidth = u * 0.7;
        c.beginPath(); c.arc((p.an[0] + 1) * u, (p.an[1] + 2) * u, 2.2 * u, 0, TAU); c.fill(); c.stroke();
        ground(c, u, 22, 70, 88);
      },
      glow: function (p) { var m = mid(p.hp, p.kn); return [[m[0] + 1, m[1] + 4]]; }
    },

    leg_curl_lying: {
      moving: ['leg'], far: 'same',
      A: { hd: [15, 60], sh: [23, 63], el: [25, 73], ha: [31, 77], hp: [47, 64], kn: [63, 65], an: [82, 66] },
      B: { hd: [15, 60], sh: [23, 63], el: [25, 73], ha: [31, 77], hp: [47, 64], kn: [63, 65], an: [64, 44] },
      prop: function (c, u) { rect(c, u, 10, 68, 58, 7); rect(c, u, 16, 75, 5, 12); rect(c, u, 56, 75, 5, 12); ground(c, u, 6, 90, 88); },
      glow: function (p) { var m = mid(p.hp, p.kn); return [[m[0], m[1] - 4]]; }
    },

    squat: {
      moving: ['leg'], far: 'same',
      A: { hd: [41, 16], sh: [44, 27], el: [51, 33], ha: [50, 25], hp: [46, 55], kn: [48, 72], an: [46, 88] },
      B: { hd: [44, 30], sh: [47, 41], el: [54, 47], ha: [53, 39], hp: [54, 64], kn: [61, 73], an: [46, 88] },
      prop: function (c, u) { line(c, u, 36, 12, 52, 62, 4.5, PROP_FILL); ground(c, u, 30, 72, 90); },
      glow: function (p) {
        var m = mid(p.hp, p.kn);
        return [[m[0] + 2, m[1] - 2], [p.hp[0] + 3, p.hp[1] + 1]];
      }
    },

    leg_press: {
      moving: ['leg'], far: 'same',
      A: { hd: [19, 44], sh: [26, 51], el: [29, 60], ha: [33, 66], hp: [42, 63], kn: [50, 47], an: [59, 53] },
      B: { hd: [19, 44], sh: [26, 51], el: [29, 60], ha: [33, 66], hp: [42, 63], kn: [58, 40], an: [73, 30] },
      prop: function (c, u, p) {
        line(c, u, 12, 38, 36, 60, 5, PROP_FILL);
        line(c, u, p.an[0] + 4, p.an[1] - 9, p.an[0] - 4, p.an[1] + 8, 3, PROP_FILL);
        ground(c, u, 10, 60, 78);
      },
      glow: function (p) { var m = mid(p.hp, p.kn); return [[m[0], m[1] - 2]]; }
    },

    hip_abduction_standing: {
      moving: ['leg'], far: 'staticA',
      A: { hd: [41, 14], sh: [42, 27], el: [49, 35], ha: [56, 40], hp: [43, 55], kn: [45, 72], an: [46, 88] },
      B: { hd: [41, 14], sh: [42, 27], el: [49, 35], ha: [56, 40], hp: [43, 55], kn: [54, 68], an: [63, 80] },
      prop: function (c, u) { line(c, u, 57, 28, 57, 88, 1.6, '#5A6577'); ground(c, u, 26, 70, 90); },
      glow: function (p) { return [[p.hp[0] + 4, p.hp[1] - 1]]; }
    },

    stair: {
      moving: ['leg'], far: 'alt',
      A: { hd: [45, 16], sh: [46, 29], el: [43, 41], ha: [41, 50], hp: [45, 57], kn: [45, 74], an: [43, 88] },
      B: { hd: [45, 16], sh: [46, 29], el: [51, 38], ha: [55, 45], hp: [45, 57], kn: [58, 63], an: [54, 77] },
      prop: function (c, u) {
        rect(c, u, 48, 82, 12, 8); rect(c, u, 60, 74, 12, 16); rect(c, u, 72, 66, 14, 24);
        ground(c, u, 18, 48, 90);
      },
      glow: function (p) {
        var m = mid(p.hp, p.kn);
        return [[m[0] + 1, m[1] - 2], [p.hp[0] + 3, p.hp[1]]];
      }
    },

    treadmill: {
      moving: ['leg', 'arm'], far: 'alt',
      A: { hd: [43, 14], sh: [44, 27], el: [42, 39], ha: [39, 48], hp: [44, 55], kn: [39, 71], an: [35, 86] },
      B: { hd: [43, 14], sh: [44, 27], el: [48, 37], ha: [53, 43], hp: [44, 55], kn: [52, 69], an: [55, 84] },
      prop: function (c, u) {
        line(c, u, 20, 90, 68, 90, 2.4, PROP_FILL);
        line(c, u, 65, 89, 71, 58, 1.5, '#5A6577');
        rect(c, u, 66, 53, 12, 5);
      },
      glow: function (p) { var m = mid(p.hp, p.kn); return [[m[0], m[1]]]; }
    },

    plank: {
      moving: [], far: 'same', isStatic: true,
      A: { hd: [17, 56], sh: [27, 60], el: [27, 77], ha: [38, 78], hp: [51, 63], kn: [65, 66], an: [79, 70], ft: [85, 77] },
      B: { hd: [17, 56], sh: [27, 60], el: [27, 77], ha: [38, 78], hp: [51, 63], kn: [65, 66], an: [79, 70], ft: [85, 77] },
      prop: function (c, u) { ground(c, u, 10, 90, 79.5); },
      glow: function (p) { return [[44, 65]]; }
    }
  };

  var LABELS = {
    press_horizontal: 'Đẩy tay cầm về phía trước',
    press_overhead: 'Đẩy tay cầm lên trên đầu',
    pulldown: 'Kéo thanh từ trên cao xuống ngang ngực',
    row: 'Kéo tay cầm về phía bụng',
    lateral_raise: 'Nâng hai tay sang ngang đến ngang vai',
    leg_extension: 'Ngồi duỗi thẳng đầu gối lên',
    leg_curl_seated: 'Ngồi gập gối xuống phía dưới',
    leg_curl_lying: 'Nằm sấp, gập gót chân về phía mông',
    squat: 'Tựa lưng vào đệm, ngồi xuống rồi đứng lên',
    leg_press: 'Nằm đạp bàn đạp ra xa bằng hai chân',
    hip_abduction_standing: 'Đứng thẳng, đưa một chân sang ngang',
    stair: 'Bước lên cầu thang từng bước đều',
    treadmill: 'Đi bộ đều trên máy chạy bộ',
    plank: 'Giữ thân thẳng như tấm ván, siết bụng'
  };

  /* ---- vẽ hình người ---- */
  function drawLimbs(ctx, u, pose, armCol, legCol, lw, dx) {
    dx = dx || 0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    /* chân */
    ctx.strokeStyle = legCol;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo((pose.hp[0] + dx) * u, pose.hp[1] * u);
    ctx.lineTo((pose.kn[0] + dx) * u, pose.kn[1] * u);
    ctx.lineTo((pose.an[0] + dx) * u, pose.an[1] * u);
    if (pose.ft) ctx.lineTo((pose.ft[0] + dx) * u, pose.ft[1] * u);
    else ctx.lineTo((pose.an[0] + dx + 3.5) * u, (pose.an[1] + 0.5) * u);
    ctx.stroke();
    /* tay */
    ctx.strokeStyle = armCol;
    ctx.beginPath();
    ctx.moveTo((pose.sh[0] + dx) * u, pose.sh[1] * u);
    ctx.lineTo((pose.el[0] + dx) * u, pose.el[1] * u);
    ctx.lineTo((pose.ha[0] + dx) * u, pose.ha[1] * u);
    ctx.stroke();
  }

  function drawTorso(ctx, u, pose, lw) {
    ctx.strokeStyle = WHITE;
    ctx.lineCap = 'round';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(pose.sh[0] * u, pose.sh[1] * u);
    ctx.lineTo(pose.hp[0] * u, pose.hp[1] * u);
    ctx.stroke();
    /* cổ + đầu */
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.moveTo(pose.sh[0] * u, pose.sh[1] * u);
    ctx.lineTo(pose.hd[0] * u, (pose.hd[1] + 3) * u);
    ctx.stroke();
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.arc(pose.hd[0] * u, pose.hd[1] * u, 3.8 * u, 0, TAU);
    ctx.fill();
  }

  function glowDot(ctx, u, x, y, ph) {
    var r = u * (4.5 + 5 * ph);
    var g = ctx.createRadialGradient(x * u, y * u, 0, x * u, y * u, r);
    g.addColorStop(0, 'rgba(255,59,48,' + (0.32 + 0.55 * ph).toFixed(3) + ')');
    g.addColorStop(0.55, 'rgba(255,59,48,' + (0.14 + 0.3 * ph).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,59,48,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x * u, y * u, r, 0, TAU);
    ctx.fill();
  }

  window.Motion = {
    /* mount(containerEl, motion, muscles) → {stop()} */
    mount: function (containerEl, motion, muscles) {
      var def = DEFS[motion] || DEFS.treadmill;
      containerEl.innerHTML = '';

      var W = containerEl.clientWidth || 320;
      var H = Math.round(W * 0.94);
      var dpr = Math.min(window.devicePixelRatio || 1, 3);

      var canvas = document.createElement('canvas');
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      canvas.style.display = 'block';
      containerEl.appendChild(canvas);
      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      var u = W / 100;

      /* thanh tiến trình + nhãn */
      var barWrap = document.createElement('div');
      barWrap.style.cssText = 'position:relative;height:12px;margin:6px 10px 0;';
      var bar = document.createElement('div');
      bar.style.cssText = 'position:absolute;left:0;right:0;top:4px;height:4px;border-radius:2px;background:#2C3545;';
      var dot = document.createElement('div');
      dot.style.cssText = 'position:absolute;top:1px;width:10px;height:10px;border-radius:50%;' +
        'background:#F5C542;box-shadow:0 0 6px rgba(245,197,66,0.7);transform:translateX(-50%);left:0%;';
      barWrap.appendChild(bar);
      barWrap.appendChild(dot);
      containerEl.appendChild(barWrap);

      var lbl = document.createElement('div');
      lbl.style.cssText = 'text-align:center;font-size:12px;color:#98A2B3;margin-top:4px;letter-spacing:0.5px;';
      lbl.textContent = def.isStatic ? 'Giữ nguyên tư thế' : 'Duỗi ↔ Siết';
      containerEl.appendChild(lbl);

      var armGold = def.moving.indexOf('arm') >= 0;
      var legGold = def.moving.indexOf('leg') >= 0;
      var lw = 3.2 * u, torsoLw = 4.6 * u;

      var raf = 0, stopped = false;
      var t0 = performance.now();

      function loop(now) {
        if (stopped) return;
        var t = (now - t0) / 1000;
        var cyc = (t % PERIOD) / PERIOD;
        var tri = cyc < 0.5 ? cyc * 2 : 2 - cyc * 2;
        var ph = ease(tri);

        var pose = lerpPose(def.A, def.B, ph);
        var farPose;
        if (def.far === 'alt') farPose = lerpPose(def.A, def.B, ease(1 - tri));
        else if (def.far === 'staticA') farPose = def.A;
        else farPose = pose;

        ctx.clearRect(0, 0, W, H);
        if (def.prop) def.prop(ctx, u, pose, ph);

        /* chi phía xa (mờ, lệch nhẹ) */
        drawLimbs(ctx, u, farPose,
          armGold ? GOLD_DIM : WHITE_DIM,
          legGold ? GOLD_DIM : WHITE_DIM,
          lw * 0.85, -1.4);

        drawTorso(ctx, u, pose, torsoLw);

        /* chi phía gần */
        drawLimbs(ctx, u, pose,
          armGold ? GOLD : WHITE,
          legGold ? GOLD : WHITE,
          lw, 0);

        /* phát sáng đỏ ở cơ chính */
        var gph = def.isStatic ? (0.5 + 0.5 * Math.sin((t / 1.4) * TAU)) : ph;
        var pts = def.glow ? def.glow(pose) : [];
        for (var i = 0; i < pts.length; i++) glowDot(ctx, u, pts[i][0], pts[i][1], gph);

        /* chấm vàng trên thanh tiến trình */
        dot.style.left = (ph * 100).toFixed(1) + '%';

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

    labelVi: function (motion) {
      return LABELS[motion] || 'Thực hiện động tác chậm và đều';
    }
  };
})();

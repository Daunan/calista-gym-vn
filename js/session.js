/* ============================================================
   session.js — Screens.session(dow)
   Máy trạng thái buổi tập:
   intro → stairs → (travel → guide → work → rest)×N → treadmill → summary
   Toàn bộ chữ hiển thị bằng tiếng Việt. Không phụ thuộc bên ngoài.
   ============================================================ */
(function () {
  'use strict';

  window.Screens = window.Screens || {};

  var CSS_ID = 'session-css';

  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent = [
      '.sess-header{position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:10px;',
      '  padding:calc(10px + var(--safe-top)) 0 10px;margin:0 -16px 12px;background:rgba(11,14,20,0.94);',
      '  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);',
      '  padding-left:16px;padding-right:16px;}',
      '.sess-exit-btn{flex:0 0 auto;min-height:44px;padding:8px 16px;border-radius:12px;border:1.5px solid var(--line);',
      '  background:var(--surface);color:var(--text-dim);font-size:15px;font-weight:700;}',
      '.sess-big-target{font-size:34px;font-weight:800;color:var(--gold);line-height:1.15;text-align:center;}',
      '.sess-machine-name{font-size:26px;font-weight:800;color:var(--text);line-height:1.2;}',
      '.sess-machine-ko{font-size:16px;color:var(--text-dim);font-weight:600;margin-top:2px;}',
      '.sess-phase{font-size:22px;font-weight:800;color:var(--text);text-align:center;line-height:1.3;}',
      '.sess-dots{display:flex;gap:10px;justify-content:center;font-size:22px;letter-spacing:2px;}',
      '.sess-dot-on{color:var(--gold);}',
      '.sess-dot-off{color:var(--line);}',
      '.sess-landmark{background:rgba(245,197,66,0.1);border:1.5px solid var(--gold);border-radius:14px;',
      '  padding:12px 14px;font-size:16px;line-height:1.45;color:var(--text);}',
      '.sess-sticky-bottom{position:sticky;bottom:calc(10px + var(--safe-bottom));z-index:40;margin-top:14px;}',
      '.sess-weight-val{font-size:40px;font-weight:800;color:var(--text);font-variant-numeric:tabular-nums;',
      '  min-width:120px;text-align:center;line-height:1.1;}',
      '.sess-step-btn{min-height:56px;min-width:64px;border-radius:14px;border:1.5px solid var(--line);',
      '  background:var(--surface-alt);color:var(--gold);font-size:16px;font-weight:800;padding:6px 8px;}',
      '.sess-rep-chip{min-height:52px;min-width:56px;border-radius:14px;border:1.5px solid var(--line);',
      '  background:var(--surface-alt);color:var(--text);font-size:19px;font-weight:800;padding:6px 12px;}',
      '.sess-rep-chip.on{background:var(--gold);color:#0B0E14;border-color:var(--gold);}',
      '.sess-link-btn{display:block;margin:14px auto 0;background:none;border:none;color:var(--text-dim);',
      '  font-size:15px;font-weight:600;text-decoration:underline;min-height:44px;padding:8px 16px;}',
      '.sess-modal-overlay{position:fixed;inset:0;z-index:200;background:rgba(11,14,20,0.75);',
      '  display:flex;align-items:center;justify-content:center;padding:24px;}',
      '.sess-modal{background:var(--surface);border:1px solid var(--line);border-radius:18px;',
      '  padding:22px 18px;max-width:340px;width:100%;}',
      '.sess-modal-text{font-size:18px;font-weight:700;text-align:center;line-height:1.45;margin-bottom:18px;}',
      '.sess-confetti{position:absolute;top:-16px;border-radius:2px;opacity:0.95;',
      '  animation-name:sessConfettiFall;animation-timing-function:linear;animation-fill-mode:forwards;}',
      '@keyframes sessConfettiFall{',
      '  0%{transform:translateY(0) rotate(0deg);}',
      '  100%{transform:translateY(105vh) rotate(680deg);opacity:0.7;}}',
      '.sess-xp-float{font-size:34px;font-weight:800;color:var(--gold);text-align:center;',
      '  animation:sessXpFloat 2.4s ease-out both;}',
      '@keyframes sessXpFloat{',
      '  0%{opacity:0;transform:translateY(18px) scale(0.8);}',
      '  25%{opacity:1;transform:translateY(0) scale(1.06);}',
      '  70%{opacity:1;transform:translateY(-14px) scale(1);}',
      '  100%{opacity:0;transform:translateY(-40px) scale(1.05);}}',
      '@keyframes sessLevelPop{',
      '  0%{transform:scale(0.5);opacity:0;}',
      '  60%{transform:scale(1.12);opacity:1;}',
      '  100%{transform:scale(1);opacity:1;}}',
      '.sess-level-pop{animation:sessLevelPop 0.7s ease-out both;}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function todayIso() {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function phaseTextAt(phases, elapsedMin) {
    if (!phases || !phases.length) return '';
    for (var i = 0; i < phases.length; i++) {
      if (elapsedMin >= phases[i].from && elapsedMin < phases[i].to) return phases[i].textVi;
    }
    return phases[phases.length - 1].textVi;
  }

  /* ============================================================ */

  window.Screens.session = function (dow) {
    injectCss();
    var el = window.UI.el;
    var UI = window.UI;
    var day = window.ROUTINE.forDow(dow);
    var app = document.getElementById('app') || document.body;

    /* ---------- ngày nghỉ / không có dữ liệu ---------- */
    if (!day || day.rest || !day.exercises || !day.exercises.length) {
      var restRoot = el('div', { class: 'screen' },
        UI.topbar('Buổi tập', day ? day.nameVi : '', function () { location.hash = ''; }),
        UI.card('Hôm nay là ngày nghỉ 😴', 'gold',
          el('div', { style: { fontSize: '16px', lineHeight: '1.5' } },
            'Không có buổi tập nào cho hôm nay. Nghỉ ngơi để cơ bắp hồi phục nhé!'),
          el('div', { class: 'mt-16' }, UI.primaryBtn('Về trang chủ', function () { location.hash = ''; }))
        )
      );
      app.innerHTML = '';
      app.appendChild(restRoot);
      return;
    }

    /* ---------- trạng thái buổi tập ---------- */
    var S = {
      stage: 'intro',        // intro|stairs|travel|guide|work|rest|treadmill|summary
      exIndex: 0,
      setIndex: 1,           // hiệp hiện tại (1-based)
      startedAt: Date.now(),
      machineOverride: {},   // exIndex -> machineId thay thế
      records: day.exercises.map(function (ex) {
        return { id: ex.id, nameVi: ex.nameVi, nameKo: ex.nameKo, machineId: ex.machineId, sets: [] };
      }),
      lastSetInfo: null,     // hiển thị ở màn nghỉ
      weightNow: {},         // exIndex -> mức tạ đang chọn
      checkinResult: null,
      xpEarned: 0,
      timers: [],
      timeouts: [],
      mounts: [],
      dead: false
    };

    var weekMode = window.Game.getWeekMode();

    function totalSetsOf(ex) {
      if (weekMode === 'first2') return Math.min(ex.sets, ex.setsFirst2Weeks || ex.sets);
      return ex.sets;
    }
    function effectiveMachineId(i) {
      return S.machineOverride[i] || day.exercises[i].machineId;
    }

    /* ---------- quản lý dọn dẹp ---------- */
    function addInterval(fn, ms) {
      var id = setInterval(fn, ms);
      S.timers.push(id);
      return id;
    }
    function addTimeout(fn, ms) {
      var id = setTimeout(fn, ms);
      S.timeouts.push(id);
      return id;
    }
    function addMount(m) {
      if (m && typeof m.stop === 'function') S.mounts.push(m);
      return m;
    }
    function cleanupStage() {
      for (var i = 0; i < S.timers.length; i++) clearInterval(S.timers[i]);
      for (var j = 0; j < S.timeouts.length; j++) clearTimeout(S.timeouts[j]);
      S.timers = [];
      S.timeouts = [];
      for (var k = 0; k < S.mounts.length; k++) {
        try { S.mounts[k].stop(); } catch (e) {}
      }
      S.mounts = [];
      var layers = document.querySelectorAll('.confetti-layer');
      for (var c = 0; c < layers.length; c++) {
        if (layers[c].parentNode) layers[c].parentNode.removeChild(layers[c]);
      }
    }
    function fullCleanup() {
      if (S.dead) return;
      S.dead = true;
      cleanupStage();
      window.removeEventListener('hashchange', onHashLeave);
    }
    function onHashLeave() { fullCleanup(); }
    window.addEventListener('hashchange', onHashLeave);
    try {
      // App.cleanup là MẢNG các mount có .stop() (xem app.js) — đăng ký để
      // router dọn dẹp timer/mount khi render lại cùng một hash (không có hashchange).
      if (window.App && Array.isArray(window.App.cleanup)) {
        window.App.cleanup.push({ stop: fullCleanup });
      } else if (window.App && typeof window.App.cleanup === 'function') {
        window.App.cleanup(fullCleanup);
      }
    } catch (e) {}

    /* ---------- đồng hồ đếm ngược dùng chung ---------- */
    function countdown(totalSec, cfg) {
      cfg = cfg || {};
      var size = cfg.size || 210;
      var remaining = totalSec;
      var total = totalSec;
      var paused = !!cfg.startPaused;
      var done = false;

      var canvas = el('canvas', {
        width: size, height: size,
        style: { width: size + 'px', height: size + 'px' }
      });
      var numEl = el('div', {
        style: {
          fontSize: '46px', fontWeight: '800', color: 'var(--gold)',
          fontVariantNumeric: 'tabular-nums', lineHeight: '1.05'
        }
      }, UI.fmtTime(remaining));
      var subEl = el('div', {
        style: { fontSize: '13px', color: 'var(--text-dim)', fontWeight: '600', marginTop: '2px' }
      }, cfg.subVi || '');
      var overlay = el('div', {
        style: {
          position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
        }
      }, numEl, cfg.subVi ? subEl : null);
      var wrap = el('div', {
        style: { position: 'relative', width: size + 'px', height: size + 'px', margin: '0 auto' }
      }, canvas, overlay);

      function draw() {
        UI.timerRing(canvas, remaining, total);
        numEl.textContent = UI.fmtTime(remaining);
      }
      addTimeout(draw, 0);

      addInterval(function () {
        if (paused || done) return;
        remaining -= 1;
        if (remaining <= 0) {
          remaining = 0;
          done = true;
          draw();
          if (cfg.onDone) cfg.onDone();
          return;
        }
        draw();
        if (cfg.onTick) cfg.onTick(remaining, total);
      }, 1000);

      return {
        el: wrap,
        pause: function () { paused = true; },
        resume: function () { paused = false; },
        isPaused: function () { return paused; },
        isDone: function () { return done; },
        remaining: function () { return remaining; },
        addSeconds: function (n) {
          if (done) return;
          remaining += n;
          total += n;
          draw();
        }
      };
    }

    /* ---------- thanh tiến trình + nút thoát ---------- */
    var N = day.exercises.length;
    function stageStep() {
      switch (S.stage) {
        case 'intro': return 0;
        case 'stairs': return 1;
        case 'travel':
        case 'guide':
        case 'work':
        case 'rest': return 2 + S.exIndex;
        case 'treadmill': return 2 + N;
        case 'summary': return 3 + N;
        default: return 0;
      }
    }
    function header() {
      var pct = Math.round((stageStep() / (3 + N)) * 100);
      var fill = el('div', { class: 'progress-fill', style: { width: pct + '%' } });
      var bar = el('div', { class: 'progress-bar', style: { flex: '1' } }, fill);
      var exit = el('button', {
        class: 'sess-exit-btn', type: 'button',
        onclick: openExitModal
      }, 'Thoát');
      return el('div', { class: 'sess-header' }, bar, exit);
    }

    function openExitModal() {
      var overlay = el('div', { class: 'sess-modal-overlay' });
      var modal = el('div', { class: 'sess-modal' },
        el('div', { class: 'sess-modal-text' }, 'Dừng buổi tập? Kết quả chưa lưu.'),
        el('div', { class: 'grid-2' },
          el('button', {
            class: 'btn-secondary', type: 'button',
            onclick: function () {
              if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }
          }, 'Không'),
          el('button', {
            class: 'btn-primary', type: 'button',
            onclick: function () {
              if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
              fullCleanup();
              location.hash = '';
            }
          }, 'Có')
        )
      );
      overlay.appendChild(modal);
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      });
      document.body.appendChild(overlay);
    }

    /* ---------- điều hướng trạng thái ---------- */
    var root = el('div', { class: 'screen' });
    app.innerHTML = '';
    app.appendChild(root);

    function render(builder) {
      cleanupStage();
      root.innerHTML = '';
      root.appendChild(header());
      builder(root);
      window.scrollTo(0, 0);
    }

    function goIntro() { S.stage = 'intro'; render(buildIntro); }
    function goStairs() { S.stage = 'stairs'; render(buildStairs); }
    function goTravel(i) {
      S.exIndex = i;
      var fromId = i === 0 ? 'stairs' : effectiveMachineId(i - 1);
      if (fromId === effectiveMachineId(i)) { goGuide(i); return; }
      S.stage = 'travel';
      render(function (rootEl) { buildTravel(rootEl, fromId); });
    }
    function goGuide(i) { S.exIndex = i; S.stage = 'guide'; render(buildGuide); }
    function goWork(i, set) { S.exIndex = i; S.setIndex = set; S.stage = 'work'; render(buildWork); }
    function goRest(i, nextSet) { S.exIndex = i; S.setIndex = nextSet; S.stage = 'rest'; render(buildRest); }
    function goNextExercise() {
      var next = S.exIndex + 1;
      if (next < N) goTravel(next);
      else goTreadmill();
    }
    function goTreadmill() { S.stage = 'treadmill'; render(buildTreadmill); }
    function goSummary() { S.stage = 'summary'; render(buildSummary); }

    /* ============================================================
       INTRO
       ============================================================ */
    function buildIntro(rootEl) {
      var badges = el('div', { class: 'row-wrap', style: { marginBottom: '12px' } },
        UI.chip(day.nameVi, 'var(--gold)'),
        UI.chip(day.focusVi, null),
        weekMode === 'first2' ? UI.chip('2 hiệp mỗi bài (2 tuần đầu)', 'var(--ok)') : null
      );

      var planItems = [
        '10 phút máy leo cầu thang (khởi động)',
        N + ' bài tập máy (khoảng 50 phút)',
        '20 phút đi bộ nhanh trên máy chạy bộ'
      ];

      rootEl.appendChild(el('div', { style: { textAlign: 'center', margin: '6px 0 14px' } },
        el('div', { style: { fontSize: '15px', color: 'var(--text-dim)', fontWeight: '700', letterSpacing: '1px' } },
          'BUỔI TẬP HÔM NAY · 80 PHÚT'),
        el('div', { style: { fontSize: '30px', fontWeight: '800', color: 'var(--gold)', marginTop: '4px' } },
          day.titleVi)
      ));
      rootEl.appendChild(badges);
      rootEl.appendChild(UI.card('Cấu trúc buổi tập', 'gold', UI.numberedList(planItems)));

      var exNames = day.exercises.map(function (ex) {
        return ex.nameVi + ' — ' + totalSetsOf(ex) + ' hiệp × ' + ex.repsLabelVi;
      });
      rootEl.appendChild(UI.card('Các bài hôm nay', 'leg', UI.bulletList(exNames, 'var(--leg)')));

      if (day.tipsVi && day.tipsVi.length) {
        rootEl.appendChild(UI.card('Mẹo hôm nay', 'ok', UI.bulletList(day.tipsVi, 'var(--ok)')));
      }

      rootEl.appendChild(el('div', { class: 'sess-sticky-bottom' },
        UI.primaryBtn('Bắt đầu với máy leo cầu thang', goStairs),
        el('div', { class: 'mt-8' },
          UI.secondaryBtn('Bỏ qua cầu thang', function () { goTravel(0); }))
      ));
    }

    /* ============================================================
       STAIRS — 10 phút máy leo cầu thang
       ============================================================ */
    function buildStairs(rootEl) {
      var st = day.stairs;
      var totalSec = st.minutes * 60;

      rootEl.appendChild(el('div', { style: { textAlign: 'center', marginBottom: '10px' } },
        el('div', { class: 'sess-machine-name' }, 'Máy leo cầu thang'),
        el('div', { class: 'sess-machine-ko' }, '천국의계단 · 10 phút khởi động')
      ));

      var mapBox = el('div', { style: { maxWidth: '260px', margin: '0 auto 14px' } });
      rootEl.appendChild(mapBox);
      addMount(window.GymMapCanvas.mount(mapBox, { toId: 'stairs', highlightIds: ['stairs'], showLabels: true }));

      var phaseEl = el('div', { class: 'sess-phase', style: { margin: '14px 0 10px' } },
        phaseTextAt(st.phases, 0));

      var cd = countdown(totalSec, {
        size: 210,
        subVi: 'còn lại',
        onTick: function (remaining) {
          var elapsedMin = Math.floor((totalSec - remaining) / 60);
          phaseEl.textContent = phaseTextAt(st.phases, elapsedMin);
        },
        onDone: function () { addTimeout(function () { goTravel(0); }, 600); }
      });

      rootEl.appendChild(cd.el);
      rootEl.appendChild(phaseEl);

      var pauseBtn = UI.secondaryBtn('Tạm dừng ⏸', function () {
        if (cd.isPaused()) { cd.resume(); pauseBtn.textContent = 'Tạm dừng ⏸'; }
        else { cd.pause(); pauseBtn.textContent = 'Tiếp tục ▶'; }
      });

      rootEl.appendChild(UI.card('Quy tắc trên máy leo cầu thang', 'cardio',
        UI.bulletList(st.rulesVi, 'var(--cardio)')));

      rootEl.appendChild(el('div', { class: 'sess-sticky-bottom' },
        UI.primaryBtn('Xong cầu thang →', function () { goTravel(0); }),
        el('div', { class: 'mt-8' }, pauseBtn)
      ));
    }

    /* ============================================================
       TRAVEL — di chuyển đến máy tiếp theo
       ============================================================ */
    function buildTravel(rootEl, fromId) {
      var i = S.exIndex;
      var ex = day.exercises[i];
      var toId = effectiveMachineId(i);
      var machine = window.GYM.byId(toId);
      var dist = window.GYM.distanceMeters(fromId, toId);
      var steps = window.GYM.walkSteps(fromId, toId);

      rootEl.appendChild(el('div', { style: { textAlign: 'center', marginBottom: '8px' } },
        el('div', { style: { fontSize: '15px', color: 'var(--text-dim)', fontWeight: '700' } },
          'Di chuyển đến máy tiếp theo · Bài ' + (i + 1) + '/' + N),
        el('div', { class: 'sess-machine-name', style: { marginTop: '4px' } }, machine.nameVi),
        el('div', { class: 'sess-machine-ko' }, machine.nameKo)
      ));

      var mapBox = el('div', { style: { maxWidth: '330px', margin: '0 auto 12px' } });
      rootEl.appendChild(mapBox);
      addMount(window.GymMapCanvas.mount(mapBox, {
        fromId: fromId, toId: toId, highlightIds: [toId], showLabels: true
      }));

      rootEl.appendChild(el('div', {
        style: { textAlign: 'center', fontSize: '17px', fontWeight: '700', color: 'var(--gold)', marginBottom: '10px' }
      }, 'Khoảng ' + dist + ' m'));

      rootEl.appendChild(UI.card('Đường đi', 'gold', UI.numberedList(steps)));

      if (machine.landmarkVi) {
        rootEl.appendChild(el('div', { class: 'sess-landmark', style: { marginBottom: '14px' } },
          '📍 ' + machine.landmarkVi));
      }

      if (ex.altMachineIds && ex.altMachineIds.length) {
        var altBtns = ex.altMachineIds.map(function (altId) {
          var alt = window.GYM.byId(altId);
          return el('button', {
            class: 'sess-rep-chip', type: 'button',
            style: { width: '100%', marginTop: '8px', fontSize: '16px' },
            onclick: function () {
              S.machineOverride[i] = altId;
              S.records[i].machineId = altId;
              render(function (r) { buildTravel(r, fromId); });
            }
          }, '→ ' + alt.nameVi + ' (' + alt.nameKo + ')');
        });
        rootEl.appendChild(UI.card('Nếu máy này quá nặng/bận:', 'facility',
          el('div', { style: { fontSize: '15px', color: 'var(--text-dim)', marginBottom: '4px' } },
            'Chạm vào máy thay thế bên dưới để đổi đường đi.'),
          altBtns));
      }

      if (S.machineOverride[i]) {
        rootEl.appendChild(el('div', { class: 'text-center text-dim', style: { fontSize: '14px', marginBottom: '8px' } },
          'Đang dùng máy thay thế. ',
          el('button', {
            class: 'sess-link-btn', type: 'button', style: { display: 'inline', margin: '0', padding: '4px' },
            onclick: function () {
              delete S.machineOverride[i];
              S.records[i].machineId = ex.machineId;
              goTravel(i);
            }
          }, 'Quay lại máy gốc')));
      }

      rootEl.appendChild(el('div', { class: 'sess-sticky-bottom' },
        UI.primaryBtn('Em đã đến nơi ✅', function () { goGuide(i); })));
    }

    /* ============================================================
       GUIDE — hướng dẫn bài tập
       ============================================================ */
    function buildGuide(rootEl) {
      var i = S.exIndex;
      var ex = day.exercises[i];
      var machine = window.GYM.byId(effectiveMachineId(i));
      var nSets = totalSetsOf(ex);

      rootEl.appendChild(el('div', { style: { textAlign: 'center', marginBottom: '6px' } },
        el('div', { style: { fontSize: '15px', color: 'var(--text-dim)', fontWeight: '700' } },
          'Bài ' + (i + 1) + '/' + N + ' · ' + machine.nameVi),
        el('div', { class: 'sess-machine-name', style: { marginTop: '4px' } }, ex.nameVi),
        el('div', { class: 'sess-machine-ko' }, ex.nameKo)
      ));

      rootEl.appendChild(el('div', { class: 'sess-big-target', style: { margin: '10px 0 14px' } },
        nSets + ' hiệp × ' + ex.repsLabelVi));

      // Hình động tác
      var motionBox = el('div', { style: { width: '240px', margin: '0 auto' } });
      rootEl.appendChild(UI.card('Động tác', 'gold',
        motionBox,
        el('div', { class: 'text-center text-dim', style: { fontSize: '14px', marginTop: '6px' } },
          window.Motion.labelVi(ex.motion))));
      addMount(window.Motion.mount(motionBox, ex.motion, ex.muscles));

      // Cơ bắp hoạt động
      var anaBox = el('div', { style: { width: '300px', maxWidth: '100%', margin: '0 auto' } });
      var legendBox = el('div', { style: { marginTop: '8px' } });
      rootEl.appendChild(UI.card('Cơ bắp hoạt động', 'chest', anaBox, legendBox));
      addMount(window.Anatomy.mount(anaBox, ex.muscles));
      window.Anatomy.legend(legendBox, ex.muscles);

      rootEl.appendChild(UI.card('Chuẩn bị máy', 'back', UI.numberedList(ex.setupVi)));
      rootEl.appendChild(UI.card('Cách thực hiện', 'leg', UI.numberedList(ex.formVi)));
      if (ex.cautionsVi && ex.cautionsVi.length) {
        rootEl.appendChild(UI.card('Tránh những lỗi này ⚠️', 'danger',
          UI.bulletList(ex.cautionsVi, 'var(--danger)')));
      }
      if (ex.noteVi) {
        rootEl.appendChild(el('div', { class: 'sess-landmark', style: { marginBottom: '14px' } },
          '💡 ' + ex.noteVi));
      }

      var lw = window.Game.lastWeight(ex.id);
      if (lw) {
        rootEl.appendChild(el('div', { class: 'text-center', style: { fontSize: '16px', marginBottom: '10px' } },
          'Lần trước em dùng: ',
          el('span', { class: 'text-gold', style: { fontWeight: '800' } }, lw + ' kg')));
      }

      rootEl.appendChild(el('div', { class: 'sess-sticky-bottom' },
        UI.primaryBtn('Bắt đầu hiệp 1', function () { goWork(i, 1); })));
    }

    /* ============================================================
       WORK — thực hiện một hiệp
       ============================================================ */
    function buildWork(rootEl) {
      var i = S.exIndex;
      var set = S.setIndex;
      var ex = day.exercises[i];
      var nSets = totalSetsOf(ex);
      var isPlank = ex.timeSeconds != null;

      // chấm tiến trình hiệp
      var dots = [];
      for (var d = 1; d <= nSets; d++) {
        dots.push(el('span', { class: d <= set ? 'sess-dot-on' : 'sess-dot-off' }, d < set ? '●' : (d === set ? '◉' : '○')));
      }

      rootEl.appendChild(el('div', { style: { textAlign: 'center', marginBottom: '6px' } },
        el('div', { style: { fontSize: '15px', color: 'var(--text-dim)', fontWeight: '700' } },
          ex.nameVi + ' · Hiệp ' + set + '/' + nSets),
        el('div', { class: 'sess-dots', style: { margin: '6px 0' } }, dots)
      ));

      rootEl.appendChild(el('div', { class: 'sess-big-target', style: { margin: '8px 0 16px' } },
        isPlank ? ('Giữ ' + ex.repsLabelVi) : ex.repsLabelVi));

      var recordedSeconds = null;

      if (isPlank) {
        /* --- chế độ plank: đếm ngược giây --- */
        var cd = countdown(ex.timeSeconds, {
          size: 200,
          subVi: 'giữ nguyên tư thế',
          startPaused: true,
          onDone: function () {
            recordedSeconds = ex.timeSeconds;
            plankBtn.textContent = 'Tuyệt vời! 💪';
            plankBtn.disabled = true;
          }
        });
        rootEl.appendChild(cd.el);
        var plankBtn = UI.secondaryBtn('Bắt đầu ▶', function () {
          if (cd.isDone()) return;
          if (cd.isPaused()) { cd.resume(); plankBtn.textContent = 'Dừng ⏸'; }
          else { cd.pause(); plankBtn.textContent = 'Tiếp tục ▶'; }
        });
        rootEl.appendChild(el('div', { style: { margin: '12px 0' } }, plankBtn));
      }

      /* --- nhập mức tạ --- */
      var weightVal;
      if (S.weightNow[i] != null) {
        weightVal = S.weightNow[i];
      } else {
        weightVal = window.Game.lastWeight(ex.id) || 0;
      }
      var weightEl = el('div', { class: 'sess-weight-val' }, formatW(weightVal));
      function formatW(w) { return (Math.round(w * 100) / 100) + ' kg'; }
      function bump(delta) {
        weightVal = Math.max(0, Math.round((weightVal + delta) * 100) / 100);
        S.weightNow[i] = weightVal;
        weightEl.textContent = formatW(weightVal);
      }
      function stepBtn(label, delta) {
        return el('button', { class: 'sess-step-btn', type: 'button', onclick: function () { bump(delta); } }, label);
      }

      if (!isPlank) {
        rootEl.appendChild(UI.card('Mức tạ', 'gold',
          el('div', { class: 'row', style: { justifyContent: 'center', gap: '8px' } },
            stepBtn('−2.5', -2.5), stepBtn('−1.25', -1.25),
            weightEl,
            stepBtn('+1.25', 1.25), stepBtn('+2.5', 2.5))));
      }

      /* --- nhập số lần --- */
      var repsVal = null;
      if (!isPlank && ex.repMin != null) {
        repsVal = ex.repMax;
        var chipEls = [];
        var repsRow = el('div', { class: 'row-wrap', style: { justifyContent: 'center' } });
        for (var r = ex.repMin; r <= ex.repMax; r++) {
          (function (rv) {
            var c = el('button', {
              class: 'sess-rep-chip' + (rv === repsVal ? ' on' : ''), type: 'button',
              onclick: function () {
                repsVal = rv;
                for (var q = 0; q < chipEls.length; q++) chipEls[q].className = 'sess-rep-chip';
                c.className = 'sess-rep-chip on';
              }
            }, String(rv));
            chipEls.push(c);
            repsRow.appendChild(c);
          })(r);
        }
        rootEl.appendChild(UI.card(
          ex.perSide ? 'Số lần đã làm (mỗi chân)' : 'Số lần đã làm', 'leg', repsRow));
      }

      /* --- hoàn thành hiệp --- */
      rootEl.appendChild(el('div', { class: 'sess-sticky-bottom' },
        UI.primaryBtn('Xong hiệp này ✅', function () {
          var rec = { set: set, weight: isPlank ? null : weightVal, reps: isPlank ? null : repsVal, seconds: isPlank ? (recordedSeconds || ex.timeSeconds) : null };
          S.records[i].sets.push(rec);
          S.lastSetInfo = { exIndex: i, rec: rec };
          if (set >= nSets) goNextExercise();
          else goRest(i, set + 1);
        }),
        el('button', {
          class: 'sess-link-btn', type: 'button',
          onclick: function () { goNextExercise(); }
        }, 'Bỏ qua bài này')
      ));
    }

    /* ============================================================
       REST — nghỉ giữa các hiệp
       ============================================================ */
    function buildRest(rootEl) {
      var i = S.exIndex;
      var nextSet = S.setIndex;
      var ex = day.exercises[i];
      var nSets = totalSetsOf(ex);

      rootEl.appendChild(el('div', { style: { textAlign: 'center', marginBottom: '8px' } },
        el('div', { style: { fontSize: '15px', color: 'var(--text-dim)', fontWeight: '700' } }, 'NGHỈ GIỮA HIỆP'),
        el('div', { style: { fontSize: '24px', fontWeight: '800', marginTop: '2px' } },
          'Tiếp theo: Hiệp ' + nextSet + '/' + nSets)
      ));

      var cd = countdown(ex.restSeconds, {
        size: 210,
        subVi: 'nghỉ ngơi',
        onDone: function () { addTimeout(function () { goWork(i, nextSet); }, 400); }
      });
      rootEl.appendChild(cd.el);

      rootEl.appendChild(el('div', { class: 'grid-2', style: { margin: '14px 0' } },
        UI.secondaryBtn('+30 giây', function () { cd.addSeconds(30); }),
        UI.secondaryBtn('Bỏ qua nghỉ', function () { goWork(i, nextSet); })
      ));

      if (S.lastSetInfo && S.lastSetInfo.exIndex === i) {
        var rec = S.lastSetInfo.rec;
        var txt;
        if (rec.seconds != null) txt = 'Giữ ' + rec.seconds + ' giây';
        else txt = (rec.weight || 0) + ' kg × ' + (rec.reps != null ? rec.reps + ' lần' : ex.repsLabelVi);
        rootEl.appendChild(UI.card('Hiệp vừa xong ✅', 'ok',
          el('div', { style: { fontSize: '20px', fontWeight: '800', color: 'var(--ok)' } }, txt)));
      }

      rootEl.appendChild(UI.card('Nhớ lại tư thế đúng', 'gold',
        UI.numberedList(ex.formVi.slice(0, 3))));
    }

    /* ============================================================
       TREADMILL — 20 phút đi bộ
       ============================================================ */
    function buildTreadmill(rootEl) {
      var tm = day.treadmill;
      var totalSec = tm.minutes * 60;

      rootEl.appendChild(el('div', { style: { textAlign: 'center', marginBottom: '10px' } },
        el('div', { class: 'sess-machine-name' }, 'Máy chạy bộ'),
        el('div', { class: 'sess-machine-ko' }, '런닝머신 · 20 phút đi bộ nhanh')
      ));

      var phaseEl = el('div', { class: 'sess-phase', style: { margin: '14px 0 10px' } },
        phaseTextAt(tm.phases, 0));

      var cd = countdown(totalSec, {
        size: 210,
        subVi: 'còn lại',
        onTick: function (remaining) {
          var elapsedMin = Math.floor((totalSec - remaining) / 60);
          phaseEl.textContent = phaseTextAt(tm.phases, elapsedMin);
        },
        onDone: function () { addTimeout(goSummary, 600); }
      });
      rootEl.appendChild(cd.el);
      rootEl.appendChild(phaseEl);

      var pauseBtn = UI.secondaryBtn('Tạm dừng ⏸', function () {
        if (cd.isPaused()) { cd.resume(); pauseBtn.textContent = 'Tạm dừng ⏸'; }
        else { cd.pause(); pauseBtn.textContent = 'Tiếp tục ▶'; }
      });

      rootEl.appendChild(UI.card('Quy tắc trên máy chạy bộ', 'cardio',
        UI.bulletList(tm.rulesVi, 'var(--cardio)')));

      rootEl.appendChild(el('div', { class: 'sess-sticky-bottom' },
        UI.primaryBtn('Xong! →', goSummary),
        el('div', { class: 'mt-8' }, pauseBtn)
      ));
    }

    /* ============================================================
       SUMMARY — kết thúc + điểm danh
       ============================================================ */
    function sessionStats() {
      var durationSec = Math.max(1, Math.round((Date.now() - S.startedAt) / 1000));
      var setsCount = 0;
      var volume = 0;
      for (var i = 0; i < S.records.length; i++) {
        var sets = S.records[i].sets;
        setsCount += sets.length;
        for (var j = 0; j < sets.length; j++) {
          var s = sets[j];
          if (typeof s.weight === 'number' && typeof s.reps === 'number') {
            volume += s.weight * s.reps;
          }
        }
      }
      return { durationSec: durationSec, setsCount: setsCount, volume: Math.round(volume) };
    }

    function buildSummary(rootEl) {
      var stats = sessionStats();
      var xp = stats.setsCount * 10 + 100;
      S.xpEarned = xp;

      if (S.checkinResult) { buildCelebration(rootEl, stats); return; }

      rootEl.appendChild(el('div', { style: { textAlign: 'center', margin: '16px 0' } },
        el('div', { style: { fontSize: '54px', lineHeight: '1' } }, '🎉'),
        el('div', { style: { fontSize: '26px', fontWeight: '800', color: 'var(--gold)', marginTop: '10px' } },
          'Hoàn thành nhiệm vụ hôm nay!'),
        el('div', { class: 'text-dim', style: { fontSize: '16px', marginTop: '4px' } },
          day.nameVi + ' · ' + day.titleVi)
      ));

      rootEl.appendChild(el('div', {
        style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }
      },
        UI.statPill('Thời gian', UI.fmtTime(stats.durationSec)),
        UI.statPill('Hiệp', stats.setsCount),
        UI.statPill('Khối lượng', stats.volume + ' kg')
      ));

      rootEl.appendChild(el('div', { class: 'text-center', style: { fontSize: '18px', fontWeight: '700', marginBottom: '14px' } },
        'Phần thưởng: ', el('span', { class: 'text-gold' }, '+' + xp + ' XP')));

      rootEl.appendChild(UI.primaryBtn('Đóng dấu điểm danh ✅', function () {
        var iso = todayIso();
        S.checkinResult = window.Game.checkIn(iso, xp);
        window.Game.saveSession({
          date: iso,
          dow: dow,
          titleVi: day.titleVi,
          xp: xp,
          durationSec: stats.durationSec,
          sets: flatSets(),
          exercises: S.records.map(function (r) {
            return { id: r.id, nameVi: r.nameVi, machineId: r.machineId, sets: r.sets.slice() };
          })
        });
        render(buildSummary);
      }));

      rootEl.appendChild(el('button', {
        class: 'sess-link-btn', type: 'button',
        onclick: function () { fullCleanup(); location.hash = ''; }
      }, 'Về nhà không điểm danh'));
    }

    function flatSets() {
      var out = [];
      for (var i = 0; i < S.records.length; i++) {
        var r = S.records[i];
        for (var j = 0; j < r.sets.length; j++) {
          var s = r.sets[j];
          out.push({
            exerciseId: r.id, nameVi: r.nameVi, machineId: r.machineId,
            set: s.set, weight: s.weight, reps: s.reps, seconds: s.seconds
          });
        }
      }
      return out;
    }

    /* --- màn chúc mừng sau khi điểm danh --- */
    function buildCelebration(rootEl, stats) {
      var res = S.checkinResult;

      if (!res.already) spawnConfetti();

      var inner = el('div', { style: { textAlign: 'center', margin: '18px 0' } });

      if (res.already) {
        inner.appendChild(el('div', { style: { fontSize: '46px' } }, '😊'));
        inner.appendChild(el('div', { style: { fontSize: '22px', fontWeight: '800', marginTop: '10px' } },
          'Hôm nay đã điểm danh rồi'));
        inner.appendChild(el('div', { class: 'text-dim', style: { fontSize: '15px', marginTop: '4px' } },
          'Buổi tập vẫn được lưu vào lịch sử.'));
      } else {
        inner.appendChild(el('div', { class: 'sess-xp-float' }, '+' + res.xpGained + ' XP'));
        inner.appendChild(el('div', { style: { fontSize: '24px', fontWeight: '800', marginTop: '8px' } },
          '🔥 Chuỗi ' + res.newStreak + ' ngày!'));
        if (res.leveledUp) {
          inner.appendChild(el('div', { class: 'sess-level-pop', style: { marginTop: '14px' } },
            el('div', { style: { fontSize: '30px', fontWeight: '800', color: 'var(--gold)' } },
              'LÊN CẤP! Lv.' + res.newLevel),
            el('div', { style: { fontSize: '17px', fontWeight: '700', color: 'var(--text)' } },
              window.Game.levelTitleVi(res.newLevel))
          ));
        } else {
          inner.appendChild(el('div', { class: 'text-dim', style: { fontSize: '15px', marginTop: '8px' } },
            'Cấp ' + res.newLevel + ' · ' + window.Game.levelTitleVi(res.newLevel)));
        }
      }

      rootEl.appendChild(UI.card(null, 'gold', inner));

      rootEl.appendChild(el('div', {
        style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }
      },
        UI.statPill('Thời gian', UI.fmtTime(stats.durationSec)),
        UI.statPill('Hiệp', stats.setsCount),
        UI.statPill('Khối lượng', stats.volume + ' kg')
      ));

      rootEl.appendChild(UI.primaryBtn('Xem lịch điểm danh', function () {
        fullCleanup();
        location.hash = '#attendance';
      }));
      rootEl.appendChild(el('div', { class: 'mt-8' },
        UI.secondaryBtn('Về trang chủ', function () {
          fullCleanup();
          location.hash = '';
        })));
    }

    function spawnConfetti() {
      var layer = el('div', { class: 'confetti-layer' });
      var colors = ['#F5C542', '#FF6B81', '#4FA3FF', '#4ED09A', '#FF9ED2', '#C9A0FF', '#FF9F45', '#F2F4F8'];
      for (var i = 0; i < 18; i++) {
        var w = 7 + Math.round(Math.random() * 6);
        var h = 10 + Math.round(Math.random() * 8);
        var piece = el('div', {
          class: 'sess-confetti',
          style: {
            left: (3 + Math.random() * 94) + '%',
            width: w + 'px',
            height: h + 'px',
            background: colors[i % colors.length],
            animationDuration: (2.4 + Math.random() * 1.4) + 's',
            animationDelay: (Math.random() * 0.5) + 's'
          }
        });
        layer.appendChild(piece);
      }
      document.body.appendChild(layer);
      addTimeout(function () {
        if (layer.parentNode) layer.parentNode.removeChild(layer);
      }, 4000);
    }

    /* ---------- bắt đầu ---------- */
    goIntro();
  };
})();

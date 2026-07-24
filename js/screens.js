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
  // HOME
  // ==========================================================
  function home() {
    var now = new Date();
    var dow = todayDow();
    var st = window.Game.state();
    var day = window.ROUTINE.forDow(dow);
    var checkedToday = st.attendance.indexOf(todayIso()) !== -1;
    var ms = window.Game.monthStats(now.getFullYear(), now.getMonth() + 1);

    // --- dải trò chơi (game strip) ---
    var xpPct = st.xpForNext > 0 ? Math.round((st.xpIntoLevel / st.xpForNext) * 100) : 0;
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
      checkedToday
        ? el('div', { class: 'text-ok mt-8', style: { fontSize: '14px', fontWeight: '700' } }, '✓ Hôm nay đã điểm danh')
        : el('div', { class: 'text-gold blink mt-8', style: { fontSize: '14px', fontWeight: '700' } }, 'Hôm nay chưa điểm danh')
    );

    // --- thẻ buổi tập hôm nay ---
    var todayCard;
    if (day && day.rest) {
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
      strip,
      todayCard,
      el('div', { class: 'card-title', style: { margin: '18px 2px 10px' } }, 'Lịch tuần này'),
      weekRows,
      el('div', { class: 'card-title', style: { margin: '18px 2px 10px' } }, 'Lối tắt'),
      shortcuts,
      el('div', { class: 'mt-16' }),
      modeCard
    ));
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
      )
    );

    // --- lịch tháng ---
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
      if (attSet[iso]) { cls += ' cal-attended'; content = '💪'; }
      else if (iso < tIso) cls += ' cal-missed';
      else if (iso > tIso) cls += ' cal-dim';
      if (iso === tIso) cls += ' cal-today';
      calGrid.appendChild(el('div', { class: cls }, content));
    }

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
    var calCard = window.UI.card(null, null, navRow, calGrid);

    // --- tủ huy hiệu ---
    var badges = window.Game.badges();
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
    var badgeCard = window.UI.card('Bộ sưu tập huy hiệu', null, badgeGrid);

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

    var summary = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' } },
      window.UI.statPill('Tổng buổi', st.totalSessions),
      window.UI.statPill('Tuần này', thisWeek),
      window.UI.statPill('Gần nhất', lastIso ? fmtIsoVi(lastIso).slice(0, 5) : '—')
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
      sessions.slice(0, 30).forEach(function (s) {
        var iso = sessionDateIso(s);
        var title = s.titleVi || (s.dow ? (window.ROUTINE.forDow(s.dow) || {}).titleVi : '') || 'Buổi tập';
        var exs = Array.isArray(s.exercises) ? s.exercises : [];

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
            el('div', { style: { fontWeight: '800', fontSize: '15.5px' } }, title),
            el('div', { class: 'text-dim', style: { fontSize: '13px' } },
              (iso ? fmtIsoVi(iso) : '') + (exs.length ? ' · ' + exs.length + ' bài' : '') +
              (typeof s.xp === 'number' ? ' · +' + s.xp + ' XP' : ''))
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
})();

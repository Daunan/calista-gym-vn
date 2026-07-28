/* game.js — window.Game
   Điểm danh, chuỗi ngày, XP/cấp độ, huy hiệu, calo, lưu buổi tập (localStorage).
   Khóa: 'gymvn_state', 'gymvn_sessions'

   !!! DỮ LIỆU CŨ LÀ VÔ GIÁ !!!
   Không bao giờ xóa dữ liệu đã lưu. Thiếu trường → điền giá trị mặc định.
   JSON hỏng → cứu từng mục một, không vứt cả kho.
*/
(function () {
  'use strict';

  var STATE_KEY = 'gymvn_state';
  var SESSIONS_KEY = 'gymvn_sessions';
  var MAX_SESSIONS = 300;

  var SCHEMA_VERSION = 3;

  // Cân nặng mặc định của ứng dụng này (người dùng có thể đổi trong phần cài đặt).
  // RULES.DEFAULT_WEIGHT_KG chỉ là chỗ giữ trung tính nên chỉ dùng khi rules.js chưa tải.
  var DEFAULT_WEIGHT_KG = 48;

  // Chiều cao mặc định (cm) — đổi được trong phần cài đặt.
  var DEFAULT_HEIGHT_CM = 160;
  var MIN_HEIGHT_CM = 100;
  var MAX_HEIGHT_CM = 250;

  // Nhật ký cân nặng: { date: 'YYYY-MM-DD', kg: number }, cũ → mới.
  var MAX_WEIGHT_HISTORY = 400;

  // ---------- tiện ích ----------

  function R() { return window.RULES || null; }

  function numOr(v, dflt) {
    return (typeof v === 'number' && isFinite(v)) ? v : dflt;
  }

  function defaultWeightKg() {
    return DEFAULT_WEIGHT_KG;
  }

  function defaultHeightCm() {
    var r = R();
    var h = r ? numOr(r.DEFAULT_HEIGHT_CM, DEFAULT_HEIGHT_CM) : DEFAULT_HEIGHT_CM;
    return (h >= MIN_HEIGHT_CM && h <= MAX_HEIGHT_CM) ? h : DEFAULT_HEIGHT_CM;
  }

  function isIsoDate(v) {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  }

  // Dọn nhật ký cân nặng: bỏ mục hỏng, gộp trùng ngày (mục sau thắng),
  // sắp xếp cũ → mới, giữ tối đa MAX_WEIGHT_HISTORY mục gần nhất.
  function normalizeWeightHistory(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    var byDate = {};
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e || typeof e !== 'object') continue;
      var d = typeof e.date === 'string' ? e.date.substring(0, 10) : '';
      if (!isIsoDate(d)) continue;
      var kg = numOr(parseFloat(e.kg), 0);
      if (!(kg > 0 && kg <= 400)) continue;
      byDate[d] = Math.round(kg * 10) / 10;
    }
    var dates = [];
    for (var k in byDate) { if (Object.prototype.hasOwnProperty.call(byDate, k)) dates.push(k); }
    dates.sort();
    if (dates.length > MAX_WEIGHT_HISTORY) dates = dates.slice(dates.length - MAX_WEIGHT_HISTORY);
    for (var j = 0; j < dates.length; j++) out.push({ date: dates[j], kg: byDate[dates[j]] });
    return out;
  }

  function defaultCycle() {
    var r = R();
    var c = (r && r.CYCLE_DEFAULT) || { lastStartIso: '', cycleDays: 30, periodDays: 7 };
    return { lastStartIso: c.lastStartIso || '', cycleDays: numOr(c.cycleDays, 30), periodDays: numOr(c.periodDays, 7) };
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function toIso(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function todayIso() { return toIso(new Date()); }

  function isoToDate(iso) {
    var p = iso.split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }

  function addDays(iso, delta) {
    var d = isoToDate(iso);
    d.setDate(d.getDate() + delta);
    return toIso(d);
  }

  // JSON hỏng → cứu từng mục còn đọc được (ngày điểm danh, XP, ...).
  function salvageState(raw) {
    var s = {};
    if (typeof raw !== 'string') return s;
    try {
      var att = raw.match(/"attendance"\s*:\s*\[([^\]]*)\]/);
      if (att) {
        var dates = att[1].match(/\d{4}-\d{2}-\d{2}/g);
        if (dates && dates.length) {
          var seen = {}, out = [];
          for (var i = 0; i < dates.length; i++) {
            if (!seen[dates[i]]) { seen[dates[i]] = true; out.push(dates[i]); }
          }
          out.sort();
          s.attendance = out;
        }
      }
      var keys = ['xp', 'bestStreak', 'totalSessions', 'weightKg', 'heightCm', 'schemaVersion'];
      for (var k = 0; k < keys.length; k++) {
        var m = raw.match(new RegExp('"' + keys[k] + '"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)'));
        if (m) s[keys[k]] = parseFloat(m[1]);
      }
      var wm = raw.match(/"weekMode"\s*:\s*"(first2|full)"/);
      if (wm) s.weekMode = wm[1];
      var ws = raw.match(/"weightSet"\s*:\s*(true|false)/);
      if (ws) s.weightSet = (ws[1] === 'true');
      // heightSet phải được cứu riêng, nếu không thẻ "thiết lập chiều cao"
      // sẽ hiện lại dù người dùng đã nhập rồi.
      var hs = raw.match(/"heightSet"\s*:\s*(true|false)/);
      if (hs) s.heightSet = (hs[1] === 'true');
      // nhật ký cân nặng: nhặt từng cặp {date, kg} còn đọc được
      var hist = raw.match(/"date"\s*:\s*"\d{4}-\d{2}-\d{2}"\s*,\s*"kg"\s*:\s*-?\d+(?:\.\d+)?/g);
      if (hist && hist.length) {
        var rec = [];
        for (var h = 0; h < hist.length; h++) {
          var pm = hist[h].match(/"(\d{4}-\d{2}-\d{2})"\s*,\s*"kg"\s*:\s*(-?\d+(?:\.\d+)?)/);
          if (pm) rec.push({ date: pm[1], kg: parseFloat(pm[2]) });
        }
        if (rec.length) s.weightHistory = rec;
      }
      var rs = raw.match(/"reportShown"\s*:\s*"([0-9\-]*)"/);
      if (rs) s.reportShown = rs[1];
      var ls = raw.match(/"lastStartIso"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
      if (ls) s.cycle = { lastStartIso: ls[1] };
    } catch (e) {}
    return s;
  }

  function loadState() {
    var raw = null;
    try { raw = localStorage.getItem(STATE_KEY); } catch (e) {}
    var s = null;
    if (raw) {
      try { s = JSON.parse(raw); } catch (e) { s = salvageState(raw); }
    }
    if (!s || typeof s !== 'object') s = {};

    // --- trường cũ: giữ nguyên, chỉ điền khi thiếu ---
    if (!Array.isArray(s.attendance)) s.attendance = [];
    if (typeof s.xp !== 'number' || s.xp < 0) s.xp = 0;
    if (typeof s.bestStreak !== 'number') s.bestStreak = 0;
    if (typeof s.totalSessions !== 'number') s.totalSessions = 0;
    if (s.weekMode !== 'first2' && s.weekMode !== 'full') s.weekMode = 'first2';

    // --- trường mới (schema 2) ---
    if (typeof s.schemaVersion !== 'number' || !isFinite(s.schemaVersion)) s.schemaVersion = 1;
    // weightSet = người dùng ĐÃ TỰ nhập cân nặng chưa.
    // Phải đọc TRƯỚC khi điền giá trị mặc định cho weightKg, nếu không
    // migrate() sẽ ghi 48kg vào localStorage ngay lần chạy đầu và thẻ
    // "Thiết lập ban đầu" sẽ không bao giờ hiện ra.
    if (typeof s.weightSet !== 'boolean') {
      s.weightSet = (typeof s.weightKg === 'number' && isFinite(s.weightKg) && s.weightKg > 0);
    }
    if (typeof s.weightKg !== 'number' || !isFinite(s.weightKg) || s.weightKg <= 0) s.weightKg = defaultWeightKg();

    // --- trường mới (schema 3): chiều cao + nhật ký cân nặng ---
    // heightSet cũng vậy: PHẢI xác định từ dữ liệu gốc TRƯỚC khi điền 160cm,
    // nếu không lần lưu đầu tiên sẽ khiến app tưởng người dùng đã tự nhập.
    if (typeof s.heightSet !== 'boolean') {
      s.heightSet = (typeof s.heightCm === 'number' && isFinite(s.heightCm) && s.heightCm > 0);
    }
    if (typeof s.heightCm !== 'number' || !isFinite(s.heightCm) ||
        s.heightCm < MIN_HEIGHT_CM || s.heightCm > MAX_HEIGHT_CM) {
      s.heightCm = defaultHeightCm();
    }
    s.weightHistory = normalizeWeightHistory(s.weightHistory);
    // Dữ liệu cũ chưa có nhật ký nhưng đã có cân nặng thật → tạo 1 mục mở đầu.
    if (!s.weightHistory.length && s.weightSet === true && s.weightKg > 0) {
      s.weightHistory = [{ date: todayIso(), kg: Math.round(s.weightKg * 10) / 10 }];
    }

    var dc = defaultCycle();
    if (!s.cycle || typeof s.cycle !== 'object') s.cycle = dc;
    else {
      if (typeof s.cycle.lastStartIso !== 'string') s.cycle.lastStartIso = dc.lastStartIso;
      if (typeof s.cycle.cycleDays !== 'number' || !isFinite(s.cycle.cycleDays)) s.cycle.cycleDays = dc.cycleDays;
      if (typeof s.cycle.periodDays !== 'number' || !isFinite(s.cycle.periodDays)) s.cycle.periodDays = dc.periodDays;
    }
    if (typeof s.reportShown !== 'string') s.reportShown = '';
    return s;
  }

  function saveState(s) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  // JSON hỏng → quét từng object `{...}` ở tầng ngoài cùng, cứu được buổi nào hay buổi đó.
  function salvageSessions(raw) {
    var out = [];
    if (typeof raw !== 'string') return out;
    var depth = 0, start = -1, inStr = false, esc = false;
    for (var i = 0; i < raw.length; i++) {
      var ch = raw.charAt(i);
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '{') { if (depth === 0) start = i; depth++; }
      else if (ch === '}') {
        depth--;
        if (depth <= 0) {
          if (start >= 0) {
            try {
              var o = JSON.parse(raw.substring(start, i + 1));
              if (o && typeof o === 'object') out.push(o);
            } catch (e) {}
          }
          depth = 0; start = -1;
        }
      }
    }
    return out;
  }

  function loadSessions() {
    var raw = null;
    try { raw = localStorage.getItem(SESSIONS_KEY); } catch (e) {}
    if (!raw) return [];
    try {
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
      if (arr && typeof arr === 'object') return [arr];
      return [];
    } catch (e) { return salvageSessions(raw); }
  }

  function saveSessions(arr) {
    try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(arr)); } catch (e) {}
  }

  // ---------- cấp độ ----------
  // Cấp L -> cấp L+1 cần: 300 + (L-1)*150 XP

  function xpForLevel(level) {
    return 300 + (level - 1) * 150;
  }

  function levelFromXp(xp) {
    var level = 1;
    var remain = xp;
    while (remain >= xpForLevel(level)) {
      remain -= xpForLevel(level);
      level++;
    }
    return { level: level, xpIntoLevel: remain, xpForNext: xpForLevel(level) };
  }

  // ---------- chuỗi ngày (streak) ----------
  // Đếm ngược liên tục từ hôm nay (nếu đã điểm danh) hoặc từ hôm qua.

  // Ngày phòng gym đóng cửa: Chủ Nhật tuần 2 và tuần 4.
  function isClosedIso(iso) {
    var r = R();
    if (r && typeof r.isClosedDay === 'function') {
      try { return !!r.isClosedDay(iso); } catch (e) {}
    }
    try {
      var d = new Date(iso + 'T12:00:00');
      if (isNaN(d.getTime()) || d.getDay() !== 0) return false;
      var nth = Math.floor((d.getDate() - 1) / 7) + 1;
      return nth === 2 || nth === 4;
    } catch (e) {}
    return false;
  }

  // Ngày nghỉ trong lịch tập (rest:true trong ROUTINE — Thứ Năm).
  function isRestIso(iso) {
    var r = R();
    if (r && typeof r.isRoutineRestDay === 'function') {
      try { return !!r.isRoutineRestDay(iso); } catch (e) {}
    }
    try {
      var days = (window.ROUTINE && window.ROUTINE.days) || [];
      var jsDay = new Date(iso + 'T12:00:00').getDay(); // 0=CN..6=T7
      for (var i = 0; i < days.length; i++) {
        if (days[i] && days[i].rest && (days[i].dow % 7) === jsDay) return true;
      }
    } catch (e) {}
    return false;
  }

  // "Ngày nghỉ" nói chung = đóng cửa HOẶC nghỉ theo lịch.
  // Những ngày này KHÔNG làm đứt chuỗi và KHÔNG tính là bỏ tập.
  function isSkipIso(iso) {
    var r = R();
    if (r && typeof r.isSkipDay === 'function') {
      try { return !!r.isSkipDay(iso); } catch (e) {}
    }
    return isClosedIso(iso) || isRestIso(iso);
  }

  // Đếm ngược từ hôm nay (nếu đã điểm danh) hoặc từ hôm qua.
  // Gặp ngày nghỉ (đóng cửa / nghỉ theo lịch) thì BỎ QUA và đi tiếp — chuỗi không đứt.
  // Ví dụ: T2·T3·T4 có tập → T5 nghỉ → T6 có tập ⇒ chuỗi = 4.
  function computeStreak(attendance) {
    if (!attendance || !attendance.length) return 0;
    var set = {};
    for (var i = 0; i < attendance.length; i++) set[attendance[i]] = true;

    var earliest = attendance[0];
    for (var e = 1; e < attendance.length; e++) {
      if (attendance[e] < earliest) earliest = attendance[e];
    }

    var today = todayIso();
    var cursor = set[today] ? today : addDays(today, -1);
    var streak = 0;
    var guard = 0;
    while (guard++ < 3660) {
      if (!cursor || cursor < earliest) break;   // đã đi quá bản ghi cũ nhất
      if (set[cursor]) {
        streak++;
      } else if (isSkipIso(cursor)) {
        // ngày nghỉ: bỏ qua, chuỗi vẫn tiếp tục
      } else {
        break;
      }
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  // ---------- API ----------

  function state() {
    var s = loadState();
    var lv = levelFromXp(s.xp);
    return {
      attendance: s.attendance.slice(),
      streak: computeStreak(s.attendance),
      bestStreak: s.bestStreak,
      xp: s.xp,
      level: lv.level,
      xpIntoLevel: lv.xpIntoLevel,
      xpForNext: lv.xpForNext,
      totalSessions: s.totalSessions
    };
  }

  function checkIn(isoDate, xpGained) {
    var s = loadState();
    isoDate = isoDate || todayIso();
    xpGained = typeof xpGained === 'number' && xpGained > 0 ? xpGained : 0;

    if (s.attendance.indexOf(isoDate) !== -1) {
      var lvA = levelFromXp(s.xp);
      return {
        already: true,
        newStreak: computeStreak(s.attendance),
        xpGained: 0,
        leveledUp: false,
        newLevel: lvA.level
      };
    }

    var before = levelFromXp(s.xp);
    s.attendance.push(isoDate);
    s.attendance.sort();
    s.xp += xpGained;
    s.totalSessions += 1;

    var newStreak = computeStreak(s.attendance);
    if (newStreak > s.bestStreak) s.bestStreak = newStreak;

    var after = levelFromXp(s.xp);
    saveState(s);

    return {
      already: false,
      newStreak: newStreak,
      xpGained: xpGained,
      leveledUp: after.level > before.level,
      newLevel: after.level
    };
  }

  // daysElapsed = số ngày CÓ THỂ ĐI TẬP đã trôi qua
  //              = ngày đã qua − ngày đóng cửa − ngày nghỉ theo lịch (Thứ Năm).
  function monthStats(year, month1to12) {
    var s = loadState();
    var now = new Date();
    var isCurrent = (now.getFullYear() === year && (now.getMonth() + 1) === month1to12);
    var lastDay = new Date(year, month1to12, 0).getDate();
    var limitDay;
    if (isCurrent) {
      limitDay = now.getDate();
    } else if (new Date(year, month1to12 - 1, 1) > now) {
      limitDay = 0; // tháng tương lai
    } else {
      limitDay = lastDay;
    }
    if (limitDay > lastDay) limitDay = lastDay;

    var prefix = year + '-' + pad2(month1to12) + '-';
    var limitIso = prefix + pad2(limitDay > 0 ? limitDay : 1);

    // Ngày đóng cửa (RULES lo phần này) và ngày nghỉ theo lịch.
    var r = R();
    var closedDays = 0, restDays = 0;
    for (var d = 1; d <= limitDay; d++) {
      var isoD = prefix + pad2(d);
      if (isClosedIso(isoD)) closedDays++;
      else if (isRestIso(isoD)) restDays++;
    }

    var openDays;
    if (r && typeof r.openDaysInMonthUpTo === 'function' && limitDay > 0) {
      try { openDays = r.openDaysInMonthUpTo(year, month1to12, limitIso); } catch (e) { openDays = limitDay - closedDays; }
    } else {
      openDays = limitDay - closedDays;
    }
    if (typeof openDays !== 'number' || !isFinite(openDays)) openDays = limitDay - closedDays;
    var daysElapsed = Math.max(0, openDays - restDays); // trừ thêm ngày nghỉ theo lịch

    var attended = 0;
    for (var i = 0; i < s.attendance.length; i++) {
      var iso = s.attendance[i];
      if (iso.indexOf(prefix) === 0) {
        var day = parseInt(iso.substring(8, 10), 10);
        if (day >= 1 && day <= limitDay) attended++;
      }
    }
    var missed = Math.max(0, daysElapsed - attended);
    var ratePercent = daysElapsed > 0 ? Math.min(100, Math.round((attended / daysElapsed) * 100)) : 0;
    return {
      attended: attended,
      missed: missed,
      ratePercent: ratePercent,
      daysElapsed: daysElapsed,
      closedDays: closedDays,
      restDays: restDays
    };
  }

  // ---------- calo ----------

  // Buổi tập cũ không có kcal → tính ngược bằng RULES.backfillKcal.
  function sessionKcal(sess, weightKg) {
    if (!sess || typeof sess !== 'object') return 0;
    var stored = numOr(sess.kcal, 0);
    if (stored > 0) return Math.round(stored);
    var r = R();
    if (r && typeof r.backfillKcal === 'function') {
      try { return Math.round(numOr(r.backfillKcal(sess, weightKg), 0)) || 0; } catch (e) {}
    }
    return 0;
  }

  function totalKcal() {
    var w = getWeight();
    var arr = loadSessions();
    var sum = 0;
    for (var i = 0; i < arr.length; i++) sum += sessionKcal(arr[i], w);
    return Math.round(sum);
  }

  function totalKcalOfMonth(year, month1to12) {
    var w = getWeight();
    var prefix = year + '-' + pad2(month1to12) + '-';
    var arr = loadSessions();
    var sum = 0;
    for (var i = 0; i < arr.length; i++) {
      var sess = arr[i];
      var iso = (sess && typeof sess.date === 'string') ? sess.date : '';
      if (iso.indexOf(prefix) === 0) sum += sessionKcal(sess, w);
    }
    return Math.round(sum);
  }

  function badges() {
    var s = loadState();
    var st = computeStreak(s.attendance);
    var best = Math.max(s.bestStreak, st);
    var total = s.totalSessions;
    var level = levelFromXp(s.xp).level;
    var kcal = totalKcal();

    return [
      { id: 'first_session', emoji: '🌱', nameVi: 'Buổi đầu tiên', descVi: 'Hoàn thành buổi tập đầu tiên', earned: total >= 1 },
      { id: 'streak_3', emoji: '🔥', nameVi: '3 ngày liên tiếp', descVi: 'Đi tập 3 ngày liên tiếp', earned: best >= 3 },
      { id: 'streak_7', emoji: '⚡', nameVi: '7 ngày liên tiếp', descVi: 'Đi tập 7 ngày liên tiếp', earned: best >= 7 },
      { id: 'streak_14', emoji: '💪', nameVi: '14 ngày liên tiếp', descVi: 'Đi tập 14 ngày liên tiếp', earned: best >= 14 },
      { id: 'streak_30', emoji: '👑', nameVi: '30 ngày liên tiếp', descVi: 'Đi tập 30 ngày liên tiếp', earned: best >= 30 },
      { id: 'sessions_10', emoji: '🥉', nameVi: '10 buổi tập', descVi: 'Hoàn thành tổng cộng 10 buổi tập', earned: total >= 10 },
      { id: 'sessions_30', emoji: '🥈', nameVi: '30 buổi tập', descVi: 'Hoàn thành tổng cộng 30 buổi tập', earned: total >= 30 },
      { id: 'sessions_50', emoji: '🥇', nameVi: '50 buổi tập', descVi: 'Hoàn thành tổng cộng 50 buổi tập', earned: total >= 50 },
      { id: 'sessions_100', emoji: '🏆', nameVi: '100 buổi tập', descVi: 'Hoàn thành tổng cộng 100 buổi tập', earned: total >= 100 },
      { id: 'level_5', emoji: '⭐', nameVi: 'Cấp 5', descVi: 'Đạt cấp độ 5', earned: level >= 5 },
      { id: 'level_10', emoji: '🌟', nameVi: 'Cấp 10', descVi: 'Đạt cấp độ 10', earned: level >= 10 },
      { id: 'level_20', emoji: '💎', nameVi: 'Cấp 20', descVi: 'Đạt cấp độ 20', earned: level >= 20 },
      { id: 'kcal_5000', emoji: '🔥', nameVi: 'Đốt 5.000 kcal', descVi: 'Tổng cộng đã đốt khoảng 5.000 kcal', earned: kcal >= 5000 },
      { id: 'kcal_20000', emoji: '💥', nameVi: 'Đốt 20.000 kcal', descVi: 'Tổng cộng đã đốt khoảng 20.000 kcal', earned: kcal >= 20000 },
      { id: 'kcal_50000', emoji: '☄️', nameVi: 'Đốt 50.000 kcal', descVi: 'Tổng cộng đã đốt khoảng 50.000 kcal', earned: kcal >= 50000 }
    ];
  }

  function levelTitleVi(level) {
    if (level >= 20) return 'Huyền thoại sống';
    if (level >= 15) return 'Chủ nhân CALISTA';
    if (level >= 11) return 'Bậc thầy máy tập';
    if (level >= 8) return 'Kỷ luật thép';
    if (level >= 5) return 'Vị ngọt của sự kiên trì';
    if (level >= 3) return 'Đang tạo thói quen';
    return 'Mầm non phòng gym';
  }

  function getWeekMode() {
    return loadState().weekMode;
  }

  function setWeekMode(mode) {
    var s = loadState();
    s.weekMode = (mode === 'full') ? 'full' : 'first2';
    saveState(s);
    return s.weekMode;
  }

  // ---------- cài đặt cá nhân (chỉ nằm trong localStorage của máy này) ----------

  function getWeight() {
    var s = loadState();
    var w = numOr(s.weightKg, 0);
    return w > 0 ? w : defaultWeightKg();
  }

  function setWeight(kg) {
    var s = loadState();
    var w = numOr(parseFloat(kg), 0);
    if (!(w >= 25 && w <= 250)) w = defaultWeightKg();
    s.weightKg = Math.round(w * 10) / 10;
    s.weightSet = true;
    // ghi vào nhật ký: cùng ngày thì ghi đè, tối đa MAX_WEIGHT_HISTORY mục.
    try {
      var hist = normalizeWeightHistory(s.weightHistory);
      var today = todayIso();
      var found = false;
      for (var i = 0; i < hist.length; i++) {
        if (hist[i].date === today) { hist[i].kg = s.weightKg; found = true; break; }
      }
      if (!found) hist.push({ date: today, kg: s.weightKg });
      if (hist.length > MAX_WEIGHT_HISTORY) hist = hist.slice(hist.length - MAX_WEIGHT_HISTORY);
      s.weightHistory = hist;
    } catch (e) {}
    saveState(s);
    return s.weightKg;
  }

  // Người dùng đã tự nhập cân nặng chưa? (dùng để quyết định hiện thẻ thiết lập)
  function isWeightSet() {
    return loadState().weightSet === true;
  }

  // Nhật ký cân nặng, cũ → mới. Luôn trả về mảng (có thể rỗng).
  function weightHistory() {
    try {
      var hist = normalizeWeightHistory(loadState().weightHistory);
      var out = [];
      for (var i = 0; i < hist.length; i++) out.push({ date: hist[i].date, kg: hist[i].kg });
      return out;
    } catch (e) { return []; }
  }

  // ---------- chiều cao (cm) ----------

  function getHeight() {
    try {
      var h = numOr(loadState().heightCm, 0);
      return (h >= MIN_HEIGHT_CM && h <= MAX_HEIGHT_CM) ? h : defaultHeightCm();
    } catch (e) { return defaultHeightCm(); }
  }

  function setHeight(cm) {
    var s = loadState();
    var h = numOr(parseFloat(cm), 0);
    if (!(h > 0)) h = defaultHeightCm();
    if (h < MIN_HEIGHT_CM) h = MIN_HEIGHT_CM;
    if (h > MAX_HEIGHT_CM) h = MAX_HEIGHT_CM;
    s.heightCm = Math.round(h * 10) / 10;
    s.heightSet = true;
    saveState(s);
    return s.heightCm;
  }

  // Người dùng đã tự nhập chiều cao chưa?
  function isHeightSet() {
    try { return loadState().heightSet === true; } catch (e) { return false; }
  }

  function getCycle() {
    var s = loadState();
    var dc = defaultCycle();
    var c = s.cycle || dc;
    return {
      lastStartIso: typeof c.lastStartIso === 'string' ? c.lastStartIso : '',
      cycleDays: numOr(c.cycleDays, dc.cycleDays),
      periodDays: numOr(c.periodDays, dc.periodDays)
    };
  }

  function setCycle(cfg) {
    var s = loadState();
    var dc = defaultCycle();
    var c = cfg || {};
    var iso = (typeof c.lastStartIso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.lastStartIso))
      ? c.lastStartIso.substring(0, 10) : '';
    var cd = Math.round(numOr(parseFloat(c.cycleDays), dc.cycleDays));
    if (!(cd >= 20 && cd <= 45)) cd = dc.cycleDays;
    var pd = Math.round(numOr(parseFloat(c.periodDays), dc.periodDays));
    if (!(pd >= 1 && pd <= 10)) pd = dc.periodDays;
    s.cycle = { lastStartIso: iso, cycleDays: cd, periodDays: pd };
    saveState(s);
    return { lastStartIso: s.cycle.lastStartIso, cycleDays: s.cycle.cycleDays, periodDays: s.cycle.periodDays };
  }

  // Báo cáo tháng chỉ hiện một lần cho mỗi tháng. ym = 'YYYY-MM'
  function getReportShown() {
    return loadState().reportShown || '';
  }

  function markReportShown(ym) {
    var s = loadState();
    s.reportShown = (typeof ym === 'string' && /^\d{4}-\d{2}$/.test(ym)) ? ym : '';
    saveState(s);
    return s.reportShown;
  }

  // ---------- lưu buổi tập ----------

  function saveSession(sessionObj) {
    if (!sessionObj || typeof sessionObj !== 'object') return null;

    // sao chép để không sửa object của bên gọi, giữ nguyên mọi trường sẵn có
    var obj = {};
    for (var k in sessionObj) {
      if (Object.prototype.hasOwnProperty.call(sessionObj, k)) obj[k] = sessionObj[k];
    }

    if (typeof obj.date !== 'string' || !obj.date) obj.date = todayIso();

    var w = numOr(obj.weightKg, 0);
    if (w <= 0) w = getWeight();
    obj.weightKg = w;

    obj.stairsEasySec = Math.max(0, Math.round(numOr(obj.stairsEasySec, 0)));
    obj.stairsHardSec = Math.max(0, Math.round(numOr(obj.stairsHardSec, 0)));
    obj.treadmillSec = Math.max(0, Math.round(numOr(obj.treadmillSec, 0)));
    obj.treadmillSlowSec = Math.max(0, Math.round(numOr(obj.treadmillSlowSec, 0)));
    obj.periodMode = !!obj.periodMode;

    var kcal = numOr(obj.kcal, 0);
    if (!(kcal > 0)) kcal = sessionKcal(obj, w);
    obj.kcal = Math.max(0, Math.round(kcal));

    obj.schemaVersion = SCHEMA_VERSION;

    var arr = loadSessions();
    arr.unshift(obj);
    if (arr.length > MAX_SESSIONS) arr = arr.slice(0, MAX_SESSIONS);
    saveSessions(arr);
    return obj;
  }

  function sessions() {
    return loadSessions();
  }

  // Tìm mức tạ gần nhất của một bài tập trong các buổi đã lưu
  function lastWeight(exerciseId) {
    var arr = loadSessions();
    for (var i = 0; i < arr.length; i++) {
      var sess = arr[i];
      var exs = sess && Array.isArray(sess.exercises) ? sess.exercises : null;
      if (!exs) continue;
      for (var j = 0; j < exs.length; j++) {
        var ex = exs[j];
        if (!ex || ex.id !== exerciseId) continue;
        if (typeof ex.weight === 'number' && ex.weight > 0) return ex.weight;
        if (Array.isArray(ex.sets)) {
          for (var k = ex.sets.length - 1; k >= 0; k--) {
            var set = ex.sets[k];
            if (set && typeof set.weight === 'number' && set.weight > 0) return set.weight;
          }
        }
      }
    }
    return null;
  }

  // ---------- chuyển đổi dữ liệu giữa các phiên bản ----------
  // Nguyên tắc: KHÔNG bao giờ xóa. Chỉ thêm trường còn thiếu rồi lưu lại.

  function migrateSessions(weightKg) {
    var raw = null;
    try { raw = localStorage.getItem(SESSIONS_KEY); } catch (e) {}
    if (!raw) return 0;
    var arr = loadSessions();
    if (!arr.length) return 0;

    var changed = false;
    for (var i = 0; i < arr.length; i++) {
      var sess = arr[i];
      if (!sess || typeof sess !== 'object') continue;
      if (!(numOr(sess.kcal, 0) > 0)) {
        var k = sessionKcal(sess, weightKg);
        if (k > 0) { sess.kcal = k; changed = true; }
      }
      if (typeof sess.weightKg !== 'number' || !isFinite(sess.weightKg) || sess.weightKg <= 0) {
        sess.weightKg = weightKg; changed = true;
      }
      if (typeof sess.periodMode !== 'boolean') { sess.periodMode = false; changed = true; }
      if (typeof sess.schemaVersion !== 'number') { sess.schemaVersion = SCHEMA_VERSION; changed = true; }
    }
    if (changed) saveSessions(arr);
    return arr.length;
  }

  function migrate() {
    var s;
    try { s = loadState(); } catch (e) { return; }
    var from = numOr(s.schemaVersion, 1);
    if (from >= SCHEMA_VERSION) return;

    // loadState() đã điền sẵn weightKg / cycle / reportShown mà vẫn giữ nguyên
    // attendance, xp, bestStreak, totalSessions, weekMode của bản cũ.
    s.schemaVersion = SCHEMA_VERSION;
    saveState(s);

    try { migrateSessions(getWeight()); } catch (e) {}
  }

  // chạy đúng một lần khi tải file
  try { migrate(); } catch (e) {}

  window.Game = {
    // API cũ — giữ nguyên tên và hình dạng trả về
    state: state,
    checkIn: checkIn,
    monthStats: monthStats,
    badges: badges,
    levelTitleVi: levelTitleVi,
    getWeekMode: getWeekMode,
    setWeekMode: setWeekMode,
    saveSession: saveSession,
    sessions: sessions,
    lastWeight: lastWeight,

    // mới
    getWeight: getWeight,
    setWeight: setWeight,
    isWeightSet: isWeightSet,
    weightHistory: weightHistory,
    getHeight: getHeight,
    setHeight: setHeight,
    isHeightSet: isHeightSet,
    getCycle: getCycle,
    setCycle: setCycle,
    markReportShown: markReportShown,
    getReportShown: getReportShown,
    totalKcal: totalKcal,
    totalKcalOfMonth: totalKcalOfMonth,
    sessionKcal: sessionKcal,
    isRestIso: isRestIso,
    isClosedIso: isClosedIso,
    isSkipIso: isSkipIso,
    migrate: migrate,
    SCHEMA_VERSION: SCHEMA_VERSION
  };
})();

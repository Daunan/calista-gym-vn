/* game.js — window.Game
   Điểm danh, chuỗi ngày, XP/cấp độ, huy hiệu, lưu buổi tập (localStorage).
   Khóa: 'gymvn_state', 'gymvn_sessions'
*/
(function () {
  'use strict';

  var STATE_KEY = 'gymvn_state';
  var SESSIONS_KEY = 'gymvn_sessions';
  var MAX_SESSIONS = 300;

  // ---------- tiện ích ----------

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

  function loadState() {
    var raw = null;
    try { raw = localStorage.getItem(STATE_KEY); } catch (e) {}
    var s = null;
    if (raw) {
      try { s = JSON.parse(raw); } catch (e) { s = null; }
    }
    if (!s || typeof s !== 'object') s = {};
    if (!Array.isArray(s.attendance)) s.attendance = [];
    if (typeof s.xp !== 'number' || s.xp < 0) s.xp = 0;
    if (typeof s.bestStreak !== 'number') s.bestStreak = 0;
    if (typeof s.totalSessions !== 'number') s.totalSessions = 0;
    if (s.weekMode !== 'first2' && s.weekMode !== 'full') s.weekMode = 'first2';
    return s;
  }

  function saveState(s) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function loadSessions() {
    var raw = null;
    try { raw = localStorage.getItem(SESSIONS_KEY); } catch (e) {}
    if (!raw) return [];
    try {
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
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

  // Ngày nghỉ trong lịch (rest:true trong ROUTINE) không làm đứt chuỗi.
  function isRestIso(iso) {
    try {
      var days = (window.ROUTINE && window.ROUTINE.days) || [];
      var jsDay = new Date(iso + 'T12:00:00').getDay(); // 0=CN..6=T7
      for (var i = 0; i < days.length; i++) {
        if (days[i].rest && (days[i].dow % 7) === jsDay) return true;
      }
    } catch (e) {}
    return false;
  }

  function computeStreak(attendance) {
    if (!attendance.length) return 0;
    var set = {};
    for (var i = 0; i < attendance.length; i++) set[attendance[i]] = true;
    var today = todayIso();
    var cursor = set[today] ? today : addDays(today, -1);
    var streak = 0;
    var guard = 0;
    while (guard++ < 3660) {
      if (set[cursor]) {
        streak++;
      } else if (isRestIso(cursor) && streak + (set[today] ? 0 : 1) > 0) {
        // 휴식일은 그냥 건너뛴다 (출석해도 물론 인정)
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

  function monthStats(year, month1to12) {
    var s = loadState();
    var now = new Date();
    var isCurrent = (now.getFullYear() === year && (now.getMonth() + 1) === month1to12);
    var lastDay = new Date(year, month1to12, 0).getDate();
    var daysElapsed;
    if (isCurrent) {
      daysElapsed = now.getDate();
    } else if (new Date(year, month1to12 - 1, 1) > now) {
      daysElapsed = 0; // tháng tương lai
    } else {
      daysElapsed = lastDay;
    }

    var prefix = year + '-' + pad2(month1to12) + '-';
    var attended = 0;
    for (var i = 0; i < s.attendance.length; i++) {
      var iso = s.attendance[i];
      if (iso.indexOf(prefix) === 0) {
        var day = parseInt(iso.substring(8, 10), 10);
        if (day <= daysElapsed) attended++;
      }
    }
    var missed = Math.max(0, daysElapsed - attended);
    var ratePercent = daysElapsed > 0 ? Math.round((attended / daysElapsed) * 100) : 0;
    return { attended: attended, missed: missed, ratePercent: ratePercent, daysElapsed: daysElapsed };
  }

  function badges() {
    var s = loadState();
    var st = computeStreak(s.attendance);
    var best = Math.max(s.bestStreak, st);
    var total = s.totalSessions;
    var level = levelFromXp(s.xp).level;

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
      { id: 'level_20', emoji: '💎', nameVi: 'Cấp 20', descVi: 'Đạt cấp độ 20', earned: level >= 20 }
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

  function saveSession(sessionObj) {
    if (!sessionObj || typeof sessionObj !== 'object') return;
    var arr = loadSessions();
    arr.unshift(sessionObj);
    if (arr.length > MAX_SESSIONS) arr = arr.slice(0, MAX_SESSIONS);
    saveSessions(arr);
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

  window.Game = {
    state: state,
    checkIn: checkIn,
    monthStats: monthStats,
    badges: badges,
    levelTitleVi: levelTitleVi,
    getWeekMode: getWeekMode,
    setWeekMode: setWeekMode,
    saveSession: saveSession,
    sessions: sessions,
    lastWeight: lastWeight
  };
})();

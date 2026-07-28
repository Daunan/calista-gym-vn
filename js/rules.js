/* rules.js — window.RULES
   Quy tắc dùng chung: ngày đóng cửa, ước tính calo, báo cáo tháng, chu kỳ kinh nguyệt.
   Thuần JS (ES5+), không phụ thuộc thư viện ngoài, hoạt động hoàn toàn offline.

   !!! RIÊNG TƯ !!!
   Kho mã này là công khai. TUYỆT ĐỐI không hardcode ngày kinh nguyệt thật hay cân nặng thật.
   Giá trị thật chỉ được nhập trong ứng dụng và lưu trong localStorage của máy người dùng.
*/
(function () {
  'use strict';

  /* ============================================================
     0. Tiện ích ngày tháng ('YYYY-MM-DD')
     ============================================================ */

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function isValidIso(iso) {
    return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso);
  }

  function normIso(iso) {
    return isValidIso(iso) ? iso.substring(0, 10) : '';
  }

  // Luôn parse ở 12:00 trưa để không bị lệch múi giờ / giờ mùa hè.
  function parseIso(iso) {
    var s = normIso(iso);
    if (!s) return null;
    var d = new Date(s + 'T12:00:00');
    if (isNaN(d.getTime())) {
      var p = s.split('-');
      d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 12, 0, 0);
    }
    return isNaN(d.getTime()) ? null : d;
  }

  function toIso(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function todayIso() { return toIso(new Date()); }

  function addDays(iso, delta) {
    var d = parseIso(iso);
    if (!d) return '';
    d.setDate(d.getDate() + delta);
    return toIso(d);
  }

  function daysBetween(isoA, isoB) { // isoB - isoA (số ngày)
    var a = parseIso(isoA), b = parseIso(isoB);
    if (!a || !b) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function daysInMonth(y, m1to12) {
    return new Date(y, m1to12, 0).getDate();
  }

  function ymd(iso) {
    var s = normIso(iso);
    if (!s) return null;
    return {
      y: parseInt(s.substring(0, 4), 10),
      m: parseInt(s.substring(5, 7), 10),
      d: parseInt(s.substring(8, 10), 10)
    };
  }

  function num(v, dflt) {
    return (typeof v === 'number' && isFinite(v)) ? v : (dflt || 0);
  }

  /* ============================================================
     1. Ngày phòng gym đóng cửa — Chủ Nhật tuần 2 và tuần 4
     ============================================================ */

  function isClosedDay(iso) {
    var d = parseIso(iso);
    if (!d) return false;
    if (d.getDay() !== 0) return false;            // 0 = Chủ Nhật
    var nth = Math.floor((d.getDate() - 1) / 7) + 1; // Chủ Nhật thứ mấy trong tháng
    return nth === 2 || nth === 4;
  }

  function closedDaysOfMonth(y, m1to12) {
    var out = [];
    var last = daysInMonth(y, m1to12);
    for (var day = 1; day <= last; day++) {
      var iso = y + '-' + pad2(m1to12) + '-' + pad2(day);
      if (isClosedDay(iso)) out.push(iso);
    }
    return out;
  }

  function nextClosedDay(iso) {
    var base = normIso(iso) || todayIso();
    var cur = base;
    for (var i = 0; i < 70; i++) {
      cur = addDays(cur, 1);
      if (!cur) return '';
      if (isClosedDay(cur)) return cur;
    }
    return '';
  }

  // Số ngày phòng gym MỞ CỬA trong tháng, tính đến hết ngày `iso`.
  function openDaysInMonthUpTo(y, m1to12, iso) {
    var last = daysInMonth(y, m1to12);
    var limit = last;
    var t = ymd(iso);
    if (t) {
      if (t.y < y || (t.y === y && t.m < m1to12)) limit = 0;
      else if (t.y === y && t.m === m1to12) limit = Math.min(t.d, last);
    }
    var n = 0;
    for (var day = 1; day <= limit; day++) {
      if (!isClosedDay(y + '-' + pad2(m1to12) + '-' + pad2(day))) n++;
    }
    return n;
  }

  function isLastDayOfMonth(iso) {
    var t = ymd(iso);
    if (!t) return false;
    return t.d === daysInMonth(t.y, t.m);
  }

  // Ngày nghỉ theo lịch tập (rest:true trong ROUTINE) — ví dụ Thứ Năm.
  function isRoutineRestDay(iso) {
    var d = parseIso(iso);
    if (!d) return false;
    try {
      var days = (window.ROUTINE && window.ROUTINE.days) || [];
      var jsDay = d.getDay(); // 0=CN .. 6=T7
      for (var i = 0; i < days.length; i++) {
        if (days[i] && days[i].rest && (num(days[i].dow, 0) % 7) === jsDay) return true;
      }
    } catch (e) {}
    return false;
  }

  // "Ngày nghỉ" nói chung: đóng cửa HOẶC nghỉ theo lịch → không làm đứt chuỗi, không tính là bỏ tập.
  function isSkipDay(iso) {
    return isClosedDay(iso) || isRoutineRestDay(iso);
  }

  /* ============================================================
     2. Ước tính calo
     ============================================================ */

  var DEFAULT_WEIGHT_KG = 48; // mặc định của ứng dụng; đổi được trong phần cài đặt.

  var MET = {
    stairsEasy: 4.0,     // leo cầu thang mức nhẹ (mức 1–3)
    stairsHard: 6.5,     // leo cầu thang mức nặng (thở gấp)
    treadmillWalk: 3.8,  // máy chạy bộ — đi bộ nhanh
    treadmillSlow: 3.0,  // máy chạy bộ — đi rất chậm (chế độ kỳ kinh)
    set: 6.0,            // đang thực hiện set tạ
    rest: 2.5,           // nghỉ giữa các set
    transition: 3.0      // di chuyển / chỉnh máy
  };

  var TRANSITION_SEC_PER_EXERCISE = 60;
  var DEFAULT_REST_SEC = 60;
  var ASSUMED_STAIRS_EASY_SEC = 600;   // 10 phút
  var ASSUMED_TREADMILL_SEC = 1200;    // 20 phút

  function kcalOf(weightKg, met, seconds) {
    var w = num(weightKg, 0);
    var m = num(met, 0);
    var s = num(seconds, 0);
    if (w <= 0 || m <= 0 || s <= 0) return 0;
    return m * w * (s / 3600);
  }

  // Thời gian thực hiện 1 set (giây).
  function setSeconds(reps, perSide, timeSeconds) {
    var sec;
    var t = num(timeSeconds, 0);
    if (t > 0) sec = t + 6;
    else sec = num(reps, 0) * 4 + 6;
    if (perSide) sec = sec * 2;
    return sec;
  }

  // setReps chấp nhận:
  //   - mảng số:            [12, 12, 10]            → mỗi phần tử là số reps của 1 set
  //   - mảng object:        [{reps, perSide, timeSeconds, seconds}, ...]
  //   - số:                 tổng số GIÂY thực hiện set
  function setRepsToSeconds(setReps) {
    if (typeof setReps === 'number') return Math.max(0, setReps);
    if (!setReps || !setReps.length) return 0;
    var total = 0;
    for (var i = 0; i < setReps.length; i++) {
      var s = setReps[i];
      if (typeof s === 'number') { total += setSeconds(s, false, 0); continue; }
      if (!s || typeof s !== 'object') continue;
      var given = num(s.seconds, 0);
      if (given > 0 && !s.perSide) { total += given; continue; }
      if (given > 0 && s.perSide) { total += given * 2; continue; }
      total += setSeconds(s.reps, s.perSide, s.timeSeconds);
    }
    return total;
  }

  // Trả về tổng số giây của buổi tập theo cùng bộ tham số của estimateWorkoutKcal.
  function estimateWorkoutSeconds(opts) {
    var o = opts || {};
    return num(o.stairsEasySec, 0) + num(o.stairsHardSec, 0) +
      num(o.treadmillSec, 0) + num(o.treadmillSlowSec, 0) +
      setRepsToSeconds(o.setReps) + num(o.totalRestSec, 0) +
      num(o.transitionCount, 0) * TRANSITION_SEC_PER_EXERCISE;
  }

  function estimateWorkoutKcal(opts) {
    var o = opts || {};
    var w = num(o.weightKg, 0);
    if (w <= 0) w = DEFAULT_WEIGHT_KG;

    var total = 0;
    total += kcalOf(w, MET.stairsEasy, num(o.stairsEasySec, 0));
    total += kcalOf(w, MET.stairsHard, num(o.stairsHardSec, 0));
    total += kcalOf(w, MET.treadmillWalk, num(o.treadmillSec, 0));
    total += kcalOf(w, MET.treadmillSlow, num(o.treadmillSlowSec, 0));
    total += kcalOf(w, MET.set, setRepsToSeconds(o.setReps));
    total += kcalOf(w, MET.rest, num(o.totalRestSec, 0));
    total += kcalOf(w, MET.transition, num(o.transitionCount, 0) * TRANSITION_SEC_PER_EXERCISE);

    return Math.round(total);
  }

  // ---- đọc dữ liệu buổi tập cũ ----

  function exerciseMeta(exerciseId) {
    try {
      if (window.ROUTINE && typeof window.ROUTINE.exerciseById === 'function') {
        return window.ROUTINE.exerciseById(exerciseId) || null;
      }
    } catch (e) {}
    return null;
  }

  // Gom tất cả set của 1 buổi tập thành mảng phẳng.
  function flattenSets(session) {
    var out = [];
    if (!session || typeof session !== 'object') return out;

    if (Array.isArray(session.sets) && session.sets.length) {
      for (var i = 0; i < session.sets.length; i++) {
        var s = session.sets[i];
        if (!s || typeof s !== 'object') continue;
        out.push({
          exerciseId: s.exerciseId || s.id || '',
          nameVi: s.nameVi || s.name || '',
          reps: num(s.reps, 0),
          weight: num(s.weight, 0),
          seconds: num(s.seconds, 0)
        });
      }
      if (out.length) return out;
    }

    if (Array.isArray(session.exercises)) {
      for (var j = 0; j < session.exercises.length; j++) {
        var ex = session.exercises[j];
        if (!ex || typeof ex !== 'object') continue;
        var list = Array.isArray(ex.sets) ? ex.sets : [];
        for (var k = 0; k < list.length; k++) {
          var st = list[k];
          if (!st || typeof st !== 'object') continue;
          out.push({
            exerciseId: ex.id || '',
            nameVi: ex.nameVi || ex.name || '',
            reps: num(st.reps, 0),
            weight: num(st.weight, 0),
            seconds: num(st.seconds, 0)
          });
        }
      }
    }
    return out;
  }

  // Dựng lại tham số ước tính từ một buổi tập đã lưu (kể cả bản ghi cũ thiếu trường).
  function sessionOpts(session, weightKg) {
    var sess = session || {};
    var sets = flattenSets(sess);

    var setReps = [];
    var byExercise = {};
    var exOrder = [];
    var restTotal = 0;

    for (var i = 0; i < sets.length; i++) {
      var s = sets[i];
      var meta = s.exerciseId ? exerciseMeta(s.exerciseId) : null;
      var perSide = !!(meta && meta.perSide);
      var timeSeconds = meta ? num(meta.timeSeconds, 0) : 0;

      var sec;
      if (s.seconds > 0) sec = perSide ? s.seconds * 2 : s.seconds;
      else sec = setSeconds(s.reps, perSide, timeSeconds);
      setReps.push({ seconds: sec });

      var key = s.exerciseId || s.nameVi || ('#' + i);
      if (!byExercise[key]) { byExercise[key] = { count: 0, rest: meta ? num(meta.restSeconds, DEFAULT_REST_SEC) : DEFAULT_REST_SEC }; exOrder.push(key); }
      byExercise[key].count++;
    }

    var storedRest = num(sess.totalRestSec, 0);
    if (storedRest > 0) {
      restTotal = storedRest;
    } else {
      for (var e = 0; e < exOrder.length; e++) {
        var info = byExercise[exOrder[e]];
        restTotal += Math.max(0, info.count - 1) * info.rest;
      }
    }

    var transitionCount = exOrder.length;
    if (!transitionCount) transitionCount = num(sess.transitionCount, 0);

    var stairsEasy = num(sess.stairsEasySec, 0);
    var stairsHard = num(sess.stairsHardSec, 0);
    var tread = num(sess.treadmillSec, 0);
    var treadSlow = num(sess.treadmillSlowSec, 0);
    var hasCardio = (stairsEasy + stairsHard + tread + treadSlow) > 0;

    // Không có dữ liệu cardio → giả định theo lịch chuẩn: cầu thang 10 phút nhẹ + máy chạy 20 phút đi bộ.
    if (!hasCardio && (sets.length > 0 || sess.date)) {
      stairsEasy = ASSUMED_STAIRS_EASY_SEC;
      if (sess.periodMode) treadSlow = ASSUMED_TREADMILL_SEC;
      else tread = ASSUMED_TREADMILL_SEC;
    }

    var w = num(weightKg, 0);
    if (w <= 0) w = num(sess.weightKg, 0);
    if (w <= 0) w = DEFAULT_WEIGHT_KG;

    return {
      weightKg: w,
      stairsEasySec: stairsEasy,
      stairsHardSec: stairsHard,
      treadmillSec: tread,
      treadmillSlowSec: treadSlow,
      setReps: setReps,
      totalRestSec: restTotal,
      transitionCount: transitionCount
    };
  }

  function backfillKcal(session, weightKg) {
    if (!session || typeof session !== 'object') return 0;
    var stored = num(session.kcal, 0);
    if (stored > 0) return Math.round(stored);
    var kcal = estimateWorkoutKcal(sessionOpts(session, weightKg));
    return kcal > 0 ? kcal : 0;
  }

  function sessionSeconds(session) {
    var stored = num(session && session.durationSec, 0);
    if (stored > 0) return stored;
    return Math.round(estimateWorkoutSeconds(sessionOpts(session, 0)));
  }

  // ---- quy đổi cho dễ hình dung (tiếng Việt, dấu thập phân là dấu phẩy) ----

  function viDecimal(x) {
    var v = Math.round(x * 10) / 10;
    return v.toFixed(1).replace('.', ',');
  }

  function kcalCompareVi(kcal) {
    var k = num(kcal, 0);
    if (k <= 0) return '';
    var refs = [
      { nameVi: 'bát cơm', kcal: 250 },
      { nameVi: 'ly trà sữa', kcal: 350 },
      { nameVi: 'ổ bánh mì', kcal: 400 }
    ];
    var pick = refs[0];
    var bestRatio = k / refs[0].kcal;
    for (var i = 0; i < refs.length; i++) {
      var r = k / refs[i].kcal;
      if (r >= 1 && r < bestRatio) { bestRatio = r; pick = refs[i]; }
      else if (bestRatio < 1 && r >= 1) { bestRatio = r; pick = refs[i]; }
    }
    if (bestRatio < 1) { pick = refs[0]; bestRatio = k / refs[0].kcal; }
    return 'khoảng ' + viDecimal(bestRatio) + ' ' + pick.nameVi;
  }

  /* ============================================================
     3. Báo cáo tháng
     ============================================================ */

  function sessionDate(sess) {
    if (!sess) return '';
    return normIso(sess.date || sess.iso || sess.dateIso || '');
  }

  function inMonth(iso, y, m1to12) {
    var t = ymd(iso);
    return !!t && t.y === y && t.m === m1to12;
  }

  function bestStreakInMonth(attendedSet, y, m1to12, limitDay) {
    var best = 0, cur = 0;
    for (var day = 1; day <= limitDay; day++) {
      var iso = y + '-' + pad2(m1to12) + '-' + pad2(day);
      if (attendedSet[iso]) {
        cur++;
        if (cur > best) best = cur;
      } else if (isSkipDay(iso)) {
        // ngày nghỉ: bỏ qua, chuỗi không đứt và cũng không tăng
      } else {
        cur = 0;
      }
    }
    return best;
  }

  function monthlyReport(sessions, y, m1to12, todayIsoStr, weightKg) {
    var list = Array.isArray(sessions) ? sessions : [];
    var today = normIso(todayIsoStr) || todayIso();
    var w = num(weightKg, 0) || DEFAULT_WEIGHT_KG;

    var last = daysInMonth(y, m1to12);
    var closedAll = closedDaysOfMonth(y, m1to12);

    // giới hạn ngày đã trôi qua trong tháng
    var t = ymd(today);
    var limitDay = last;
    if (t) {
      if (t.y < y || (t.y === y && t.m < m1to12)) limitDay = 0;
      else if (t.y === y && t.m === m1to12) limitDay = Math.min(t.d, last);
    }

    // Ngày TẬP ĐƯỢC = ngày đã trôi qua − ngày phòng gym đóng cửa − ngày nghỉ
    // theo lịch (Thứ Năm). Cả hai loại đều KHÔNG tính là bỏ tập (yêu cầu của chủ app).
    var openDays = 0, closedElapsed = 0, restElapsed = 0;
    for (var dOpen = 1; dOpen <= limitDay; dOpen++) {
      var isoOpen = y + '-' + pad2(m1to12) + '-' + pad2(dOpen);
      if (isClosedDay(isoOpen)) closedElapsed++;
      else if (isRoutineRestDay(isoOpen)) restElapsed++;
      else openDays++;
    }

    var prev = { y: (m1to12 === 1 ? y - 1 : y), m: (m1to12 === 1 ? 12 : m1to12 - 1) };

    var sessionCount = 0;
    var totalKcal = 0;
    var totalSets = 0;
    var totalVolumeKg = 0;
    var totalSeconds = 0;
    var attendedSet = {};
    var exAgg = {};
    var exOrder = [];
    var dailyKcalMap = {};
    var prevMonthKcal = 0;
    var prevMonthSessions = 0;

    for (var i = 0; i < list.length; i++) {
      var sess = list[i];
      var iso = sessionDate(sess);
      if (!iso) continue;

      if (inMonth(iso, prev.y, prev.m)) {
        prevMonthSessions++;
        prevMonthKcal += backfillKcal(sess, w);
        continue;
      }
      if (!inMonth(iso, y, m1to12)) continue;

      sessionCount++;
      attendedSet[iso] = true;

      var kcal = backfillKcal(sess, w);
      totalKcal += kcal;
      var dayNum = ymd(iso).d;
      dailyKcalMap[dayNum] = num(dailyKcalMap[dayNum], 0) + kcal;

      totalSeconds += sessionSeconds(sess);

      var sets = flattenSets(sess);
      totalSets += sets.length;
      for (var j = 0; j < sets.length; j++) {
        var s = sets[j];
        if (s.weight > 0 && s.reps > 0) totalVolumeKg += s.weight * s.reps;
        var meta = s.exerciseId ? exerciseMeta(s.exerciseId) : null;
        var name = (meta && (meta.nameVi || meta.name)) || s.nameVi || s.exerciseId || '—';
        if (!exAgg[name]) { exAgg[name] = 0; exOrder.push(name); }
        exAgg[name]++;
      }
    }

    var attendedDays = 0;
    for (var kAtt in attendedSet) { if (attendedSet.hasOwnProperty(kAtt)) attendedDays++; }

    var missedDays = Math.max(0, openDays - attendedDays);
    var ratePercent = openDays > 0 ? Math.round((attendedDays / openDays) * 100) : 0;
    if (ratePercent > 100) ratePercent = 100;

    var topExercises = exOrder.slice().sort(function (a, b) {
      if (exAgg[b] !== exAgg[a]) return exAgg[b] - exAgg[a];
      return a < b ? -1 : (a > b ? 1 : 0);
    }).slice(0, 5).map(function (n) { return { name: n, sets: exAgg[n] }; });

    var dailyKcal = [];
    for (var d = 1; d <= last; d++) {
      dailyKcal.push({ day: d, kcal: Math.round(num(dailyKcalMap[d], 0)) });
    }

    return {
      year: y,
      month: m1to12,
      sessionCount: sessionCount,
      openDays: openDays,
      closedDays: closedElapsed,          // ngày đóng cửa ĐÃ trôi qua
      closedDaysInMonth: closedAll.length, // tổng ngày đóng cửa cả tháng
      restDays: restElapsed,               // ngày nghỉ theo lịch đã trôi qua
      attendedDays: attendedDays,
      missedDays: missedDays,
      ratePercent: ratePercent,
      totalKcal: Math.round(totalKcal),
      avgKcalPerSession: sessionCount > 0 ? Math.round(totalKcal / sessionCount) : 0,
      totalSets: totalSets,
      totalVolumeKg: Math.round(totalVolumeKg),
      totalMinutes: Math.round(totalSeconds / 60),
      bestStreak: bestStreakInMonth(attendedSet, y, m1to12, limitDay),
      topExercises: topExercises,
      dailyKcal: dailyKcal,
      prevMonthKcal: Math.round(prevMonthKcal),
      prevMonthSessions: prevMonthSessions
    };
  }

  function monthlyMessageVi(report) {
    var r = report || {};
    var rate = num(r.ratePercent, 0);
    var n = num(r.sessionCount, 0);

    if (n === 0) {
      return 'Tháng này chưa có buổi tập nào được ghi lại. Không sao cả — tháng mới bắt đầu lại từ một buổi nhẹ nhàng nhé! 🌱';
    }
    if (rate >= 90) {
      return 'Tuyệt vời! ' + rate + '% ngày mở cửa bạn đều có mặt. Sự kiên trì này thật đáng nể — cứ giữ nhịp như vậy nhé! 👑';
    }
    if (rate >= 70) {
      return 'Rất tốt! Bạn đã tập ' + n + ' buổi trong tháng. Chỉ cần thêm một chút nữa là hoàn hảo. Tháng sau cố lên nhé! 🔥';
    }
    if (rate >= 50) {
      return 'Bạn đã đi tập hơn một nửa số ngày mở cửa. Thói quen đang hình thành rồi đó — tháng sau thêm 2–3 buổi nữa thôi! 💪';
    }
    if (rate >= 30) {
      return 'Đã có ' + n + ' buổi tập rồi, tốt hơn nhiều so với việc không tập. Hãy chọn những ngày cố định trong tuần để dễ duy trì hơn nhé. 🌿';
    }
    return 'Tháng này hơi bận đúng không? Chỉ cần bắt đầu lại là được — mỗi buổi tập đều đáng giá. Tháng sau mình đi cùng nhau nhé! 🌸';
  }

  /* ============================================================
     4. Chu kỳ kinh nguyệt
     ============================================================
     Giá trị mặc định để TRỐNG. Dữ liệu thật do người dùng nhập,
     chỉ lưu trong localStorage — không bao giờ nằm trong mã nguồn.
  */

  var CYCLE_DEFAULT = { lastStartIso: '', cycleDays: 30, periodDays: 7 };

  function cycleInfo(iso, cfg) {
    var c = cfg || {};
    var lastStart = normIso(c.lastStartIso);
    if (!lastStart) return { configured: false };

    var target = normIso(iso) || todayIso();
    if (!parseIso(target)) return { configured: false };

    var cycleDays = Math.round(num(c.cycleDays, CYCLE_DEFAULT.cycleDays));
    if (!(cycleDays >= 20 && cycleDays <= 45)) cycleDays = CYCLE_DEFAULT.cycleDays;
    var periodDays = Math.round(num(c.periodDays, CYCLE_DEFAULT.periodDays));
    if (!(periodDays >= 1 && periodDays <= 10)) periodDays = CYCLE_DEFAULT.periodDays;
    if (periodDays > cycleDays - 4) periodDays = Math.max(1, cycleDays - 4);

    var diff = daysBetween(lastStart, target);
    var mod = diff % cycleDays;
    if (mod < 0) mod += cycleDays;              // bù cho ngày trước lastStart
    var dayOfCycle = mod + 1;

    var half = cycleDays / 2;
    var ovStart = Math.round(half) - 1;
    var ovEnd = Math.round(half) + 1;
    if (ovStart <= periodDays) ovStart = periodDays + 1;
    if (ovEnd < ovStart) ovEnd = ovStart;
    var pmsStart = cycleDays - 2;               // 3 ngày cuối
    if (pmsStart <= ovEnd) pmsStart = ovEnd + 1;

    var phase, phaseVi, emoji, adviceVi;
    var isPms = false;

    if (dayOfCycle <= periodDays) {
      phase = 'period';
      phaseVi = 'Kỳ kinh nguyệt';
      emoji = '🌹';
      adviceVi = 'Hôm nay hãy tập nhẹ thôi. Có chế độ riêng cho ngày này — giảm tạ, đi bộ thật chậm và nghỉ nhiều hơn.';
    } else if (dayOfCycle < ovStart) {
      phase = 'follicular';
      phaseVi = 'Giai đoạn nang trứng';
      emoji = '🌱';
      adviceVi = 'Đây là lúc cơ thể sung sức nhất. Bạn có thể thử tăng tạ lên một chút và tập với năng lượng cao hơn.';
    } else if (dayOfCycle <= ovEnd) {
      phase = 'ovulation';
      phaseVi = 'Giai đoạn rụng trứng';
      emoji = '☀️';
      adviceVi = 'Sức mạnh đang tốt nhưng khớp lỏng lẻo hơn bình thường. Hãy chú ý tư thế thật chuẩn và khởi động kỹ.';
    } else if (dayOfCycle < pmsStart) {
      phase = 'luteal';
      phaseVi = 'Giai đoạn hoàng thể';
      emoji = '🌙';
      adviceVi = 'Cơ thể có thể cảm thấy nặng nề hơn. Đừng chạy theo mức tạ — hãy tập trung vào tư thế và số lần.';
    } else {
      phase = 'luteal';
      phaseVi = 'Giai đoạn hoàng thể';
      emoji = '🌙';
      isPms = true;
      adviceVi = 'Sắp tới kỳ kinh nên dễ bị đầy hơi và nhạy cảm. Tập với tạ nhẹ, chỉ cần giữ đều đặn là đủ tốt rồi.';
    }

    var daysUntilNext = cycleDays - dayOfCycle + 1;
    var nextStartIso = addDays(target, daysUntilNext);

    return {
      configured: true,
      dayOfCycle: dayOfCycle,
      cycleDays: cycleDays,
      periodDays: periodDays,
      phase: phase,
      phaseVi: phaseVi,
      emoji: emoji,
      adviceVi: adviceVi,
      isPeriod: phase === 'period',
      isPms: isPms,
      nextStartIso: nextStartIso,
      daysUntilNext: daysUntilNext
    };
  }

  /* ============================================================
     5. Xuất API
     ============================================================ */

  window.RULES = {
    // ngày đóng cửa / ngày nghỉ
    isClosedDay: isClosedDay,
    closedDaysOfMonth: closedDaysOfMonth,
    nextClosedDay: nextClosedDay,
    openDaysInMonthUpTo: openDaysInMonthUpTo,
    isLastDayOfMonth: isLastDayOfMonth,
    isRoutineRestDay: isRoutineRestDay,
    isSkipDay: isSkipDay,

    // calo
    DEFAULT_WEIGHT_KG: DEFAULT_WEIGHT_KG,
    MET: MET,
    kcalOf: kcalOf,
    setSeconds: setSeconds,
    estimateWorkoutKcal: estimateWorkoutKcal,
    estimateWorkoutSeconds: estimateWorkoutSeconds,
    backfillKcal: backfillKcal,
    kcalCompareVi: kcalCompareVi,

    // báo cáo tháng
    monthlyReport: monthlyReport,
    monthlyMessageVi: monthlyMessageVi,

    // chu kỳ kinh nguyệt (không hardcode dữ liệu thật)
    CYCLE_DEFAULT: CYCLE_DEFAULT,
    cycleInfo: cycleInfo,

    // tiện ích ngày tháng dùng chung
    todayIso: todayIso,
    toIso: toIso,
    parseIso: parseIso,
    addDays: addDays,
    daysBetween: daysBetween,
    daysInMonth: daysInMonth,
    viDecimal: viDecimal
  };
})();

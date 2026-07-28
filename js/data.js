/* ============================================================
 * data.js — FITNESS CALISTA (베트남어 운동 웹앱)
 * window.GYM, window.ROUTINE, window.MUSCLE_VI 정의.
 * 좌표·경로 로직: GymMap.kt 포팅 (숫자 그대로).
 * 운동 설명 베트남어: "와이프 운동 루틴.txt" 원문 그대로.
 * ES2020, 모듈 아님. UTF-8.
 * ============================================================ */
(function () {
  'use strict';

  /* ============================================================
   * MUSCLE_VI — 근육 베트남어 명칭 22개
   * ============================================================ */
  window.MUSCLE_VI = {
    chest_upper: 'Cơ ngực trên',
    chest_mid: 'Cơ ngực giữa',
    chest_lower: 'Cơ ngực dưới',
    delt_front: 'Cơ vai trước',
    delt_side: 'Cơ vai bên',
    delt_rear: 'Cơ vai sau',
    biceps: 'Cơ tay trước (bắp tay)',
    triceps: 'Cơ tay sau',
    forearm: 'Cơ cẳng tay',
    lat: 'Cơ xô',
    trap_upper: 'Cơ cầu vai trên',
    trap_mid: 'Cơ cầu vai giữa',
    rhomboid: 'Cơ trám (giữa hai bả vai)',
    lower_back: 'Cơ lưng dưới',
    abs: 'Cơ bụng',
    oblique: 'Cơ bụng xiên',
    glute: 'Cơ mông',
    quad: 'Cơ đùi trước',
    hamstring: 'Cơ đùi sau',
    adductor: 'Cơ đùi trong (khép)',
    abductor: 'Cơ đùi ngoài (dạng)',
    calf: 'Cơ bắp chân'
  };

  /* ============================================================
   * GYM — FITNESS CALISTA 배치도 (GymMap.kt 포팅)
   * 좌표계: x 왼쪽→오른쪽 0~100, y 위(입구)→아래 0~100
   * ============================================================ */

  // 통로 좌표 (경로 계산용) — Kotlin corridorXs/corridorYs 그대로
  const CORRIDOR_XS = [14.4, 28.0, 42.0, 47.8];
  const CORRIDOR_YS = [4.5, 48.0, 90.5, 99.0];

  // 존 이름 (베트남어)
  const Z_CARDIO_L = 'Khu cardio bên trái';
  const Z_ROW2 = 'Khu máy hàng 2';
  const Z_ROW3 = 'Khu máy hàng 3';
  const Z_CENTER = 'Tiện ích giữa phòng';
  const Z_LOCKER = 'Khu thay đồ / tiện ích';
  const Z_FREE_R = 'Khu tạ tự do bên phải';
  const Z_LEG_R = 'Khu chân góc dưới bên phải';
  const Z_LEG_BOTTOM = 'Hàng máy chân dưới cùng';

  function M(id, nameVi, nameKo, brand, category, x, y, w, h, zoneVi, landmarkVi) {
    return { id, nameVi, nameKo, brand, category, x, y, w, h, zoneVi, landmarkVi };
  }

  const MACHINES = [
    // ── 왼쪽 1열 — 유산소/케이블 존 ─────────────────────────
    M('info_desk', 'Quầy lễ tân / InBody / Máy lọc nước', '인포데스크/인바디/정수기', '', 'facility',
      2, 3, 28, 3.5, Z_CARDIO_L, 'Quầy ngay phía trước, trên cùng, khi vừa bước vào cửa'),
    M('cycle', 'Xe đạp ngồi (2 máy)', '좌식사이클 2대', '', 'cardio',
      2, 8, 12, 7, Z_CARDIO_L, 'Ngay dưới quầy lễ tân, máy cardio đầu tiên sát tường trái'),
    M('stairs', 'Máy leo cầu thang (5 máy)', '천국의계단 5대', '', 'cardio',
      2, 16, 12, 11, Z_CARDIO_L, 'Phía trên tường trái, 5 máy xếp cạnh nhau ngay dưới xe đạp ngồi'),
    M('treadmill_1', 'Máy chạy bộ', '런닝머신', '', 'cardio',
      2, 28, 12, 9, Z_CARDIO_L, 'Sát tường trái, máy chạy bộ đầu tiên ngay dưới máy leo cầu thang'),
    M('mymountain_1', 'Máy leo núi My Mountain', '마이마운틴', '', 'cardio',
      2, 38, 12, 7, Z_CARDIO_L, 'Giữa tường trái, ngay dưới máy chạy bộ thứ nhất'),
    M('treadmill_2', 'Máy chạy bộ', '런닝머신', '', 'cardio',
      2, 46, 12, 9, Z_CARDIO_L, 'Giữa tường trái, máy chạy bộ thứ hai ngay dưới máy My Mountain thứ nhất'),
    M('mymountain_2', 'Máy leo núi My Mountain', '마이마운틴', '', 'cardio',
      2, 56, 12, 7, Z_CARDIO_L, 'Sát tường trái, ngay dưới máy chạy bộ thứ hai'),
    M('dual_cable_cross', 'Dual Cable Cross', '듀얼케이블 크로스라이트', 'FREEMOTION', 'free',
      2, 76, 12, 7, Z_CARDIO_L, 'Phía dưới tường trái, máy cáp nằm sau các máy My Mountain'),
    M('dual_pulley', 'Dual Pulley (Ròng rọc đôi)', '듀얼풀리', '', 'free',
      2, 84, 12, 5, Z_CARDIO_L, 'Cuối tường trái, ngay dưới Dual Cable Cross'),
    M('dumbbell_zone_left', 'Khu tạ đơn Force', '포스덤벨존', 'Force', 'free',
      8, 92, 22, 6, Z_CARDIO_L, 'Góc dưới cùng bên trái, kệ tạ đơn ngay dưới Dual Pulley'),

    // ── 2열 머신존 (x=15, w=12, h=5) ────────────────────────
    M('pullover', 'Pullover', '풀오버', 'Atlantis', 'back',
      15, 7.0, 12, 5.0, Z_ROW2, 'Trên cùng hàng 2, máy đầu tiên khi đi xuống từ quầy lễ tân'),
    M('triceps_pushdown', 'Triceps Pushdown', '트라이셉스 푸시다운', '', 'arm',
      15, 12.3, 12, 5.0, Z_ROW2, 'Phía trên hàng 2, ngay dưới máy Pullover'),
    M('hip_add_abductor', 'Hip Adductor · Abductor', '힙어덕터·힙어브덕터', 'Watson', 'leg',
      15, 17.6, 12, 5.0, Z_ROW2, 'Phía trên hàng 2, ngay dưới Triceps Pushdown'),
    M('monster_glute', 'Monster Glute', '몬스터 글루트', 'Lexco', 'leg',
      15, 22.9, 12, 5.0, Z_ROW2, 'Phía trên hàng 2, ngay dưới Hip Adductor · Abductor'),
    M('hip_thrust', 'Hip Thrust', '힙 쓰러스트', 'Booty Builder', 'leg',
      15, 28.2, 12, 5.0, Z_ROW2, 'Giữa-trên hàng 2, ngay dưới Monster Glute'),
    M('standing_outthigh', 'Standing Hip Abduction', '스탠딩 아웃싸이', 'Lexco', 'leg',
      15, 33.5, 12, 5.0, Z_ROW2, 'Giữa-trên hàng 2, ngay dưới Hip Thrust'),
    M('tbar_row', 'T-Bar Row', '티바 로우', 'Paramount', 'back',
      15, 38.8, 12, 5.0, Z_ROW2, 'Giữa hàng 2, ngay dưới Standing Hip Abduction'),
    M('seated_row', 'Seated Row', '시티드 로우', 'Newtech', 'back',
      15, 44.1, 12, 5.0, Z_ROW2, 'Giữa hàng 2, ngay dưới T-Bar Row'),
    M('assist_chin_dip', 'Assist Chin / Dip', '어시스트 친딥', '', 'arm',
      15, 49.4, 12, 5.0, Z_ROW2, 'Chính giữa hàng 2, máy cao ngay dưới Seated Row'),
    M('linear_row', 'Linear Row', '리니어 로우', 'Watson', 'back',
      15, 54.7, 12, 5.0, Z_ROW2, 'Giữa-dưới hàng 2, ngay dưới Assist Chin / Dip'),
    M('mid_row_row', 'Mid Row', '미드 로우로우', 'Watson', 'back',
      15, 60.0, 12, 5.0, Z_ROW2, 'Giữa-dưới hàng 2, ngay dưới Linear Row'),
    M('lat_pulldown', 'Lat Pulldown', '랫풀다운', 'Newtech', 'back',
      15, 65.3, 12, 5.0, Z_ROW2, 'Phía dưới hàng 2, ngay dưới Mid Row'),
    M('side_lateral_raise', 'Side Lateral Raise', '사이드 레터럴레이즈', 'Newtech', 'shoulder',
      15, 70.6, 12, 5.0, Z_ROW2, 'Phía dưới hàng 2, ngay dưới Lat Pulldown'),
    M('front_pulldown', 'Front Pulldown', '프론트 풀다운', 'Atlantis', 'back',
      15, 75.9, 12, 5.0, Z_ROW2, 'Cuối hàng 2, ngay bên phải Dual Cable Cross'),

    // ── 3열 머신존 (x=29, w=12, h=4.6) ──────────────────────
    M('diverging_seated_row', 'Diverging Seated Row', '다이버징 시티드 로우', '', 'back',
      29, 6.0, 12, 4.6, Z_ROW3, 'Máy đầu tiên trên cùng hàng 3'),
    M('chest_press_a', 'Chest Press', '체스트 프레스', '', 'chest',
      29, 10.9, 12, 4.6, Z_ROW3, 'Phía trên hàng 3, ngay trên máy Pec · Rear Delt Fly'),
    M('pec_rear_delt_fly', 'Pec / Rear Delt Fly Combo', '펙·리어델트 플라이 콤보', '', 'chest',
      29, 15.8, 12, 4.6, Z_ROW3, 'Phía trên hàng 3, nằm giữa Chest Press và Shoulder Press'),
    M('shoulder_press_a', 'Shoulder Press', '숄더 프레스', '', 'shoulder',
      29, 20.7, 12, 4.6, Z_ROW3, 'Phía trên hàng 3, ngay dưới Pec / Rear Delt Fly'),
    M('lying_leg_curl', 'Lying Leg Curl', '라잉 레그컬', '', 'leg',
      29, 25.6, 12, 4.6, Z_ROW3, 'Giữa-trên hàng 3, ngay dưới Shoulder Press phía trên'),
    M('seated_leg_curl', 'Seated Leg Curl', '시티드 레그컬', '', 'leg',
      29, 30.5, 12, 4.6, Z_ROW3, 'Giữa-trên hàng 3, ngay dưới Lying Leg Curl'),
    M('vertical_row', 'Vertical Row', '버티컬 로우', '', 'back',
      29, 35.4, 12, 4.6, Z_ROW3, 'Giữa hàng 3, ngay dưới Seated Leg Curl'),
    M('arm_curl', 'Arm Curl', '암컬', 'Newtech', 'arm',
      29, 40.3, 12, 4.6, Z_ROW3, 'Giữa hàng 3, ngay dưới Vertical Row'),
    M('leg_extension', 'Leg Extension', '레그 익스텐션', 'Newtech', 'leg',
      29, 45.2, 12, 4.6, Z_ROW3, 'Chính giữa hàng 3, ngay dưới Arm Curl'),
    M('multi_row', 'Multi Row', '멀티 로우', 'Arsenal Strength', 'back',
      29, 50.1, 12, 4.6, Z_ROW3, 'Giữa hàng 3, ngay dưới Leg Extension'),
    M('chest_press_b', 'Chest Press (Watson)', '체스트 프레스', 'Watson', 'chest',
      29, 55.0, 12, 4.6, Z_ROW3, 'Giữa hàng 3, ngay dưới Multi Row (máy hãng Watson)'),
    M('incline_chest_press', 'Incline Chest Press', '인클라인 체스트프레스', 'Arsenal Strength', 'chest',
      29, 59.9, 12, 4.6, Z_ROW3, 'Giữa-dưới hàng 3, ngay dưới Chest Press (Watson)'),
    M('decline_chest_press', 'Decline Chest Press', '디클라인 체스트프레스', 'Atlantis', 'chest',
      29, 64.8, 12, 4.6, Z_ROW3, 'Giữa-dưới hàng 3, ngay dưới Incline Chest Press'),
    M('vertical_chest_press', 'Vertical Chest Press', '버티컬 체스트프레스', 'Atlantis', 'chest',
      29, 69.7, 12, 4.6, Z_ROW3, 'Phía dưới hàng 3, ngay dưới Decline Chest Press'),
    M('incline_bench_press', 'Incline Bench Press', '인클라인 벤치프레스', 'Atlantis', 'chest',
      29, 74.6, 12, 4.6, Z_ROW3, 'Phía dưới hàng 3, ngay dưới Vertical Chest Press'),
    M('shoulder_press_b', 'Shoulder Press (Atlantis)', '숄더 프레스', 'Atlantis', 'shoulder',
      29, 79.5, 12, 4.6, Z_ROW3, 'Gần cuối hàng 3, ngay dưới Incline Bench Press (máy hãng Atlantis)'),
    M('incline_tbar_row', 'Incline T-Bar Row', '인클라인 티바로우', 'Atlantis', 'back',
      29, 84.4, 12, 4.6, Z_ROW3, 'Máy cuối cùng, dưới cùng hàng 3'),

    // ── 가운데 세로 통로 옆 편의시설 ─────────────────────────
    M('charger', 'Chỗ sạc điện thoại', '충전기', '', 'facility',
      43, 55, 4, 5, Z_CENTER, 'Cạnh lối đi giữa, ngay trên kệ để túi'),
    M('bag_rack', 'Kệ để túi', '가방보관랙', '', 'facility',
      43, 61, 4, 9, Z_CENTER, 'Cạnh lối đi giữa, nằm giữa chỗ sạc và máy lọc nước'),
    M('water_purifier', 'Máy lọc nước', '정수기', '', 'facility',
      43, 72, 4, 8, Z_CENTER, 'Cạnh lối đi giữa phía dưới, ngay dưới kệ để túi'),

    // ── 오른쪽 위 — 탈의/편의 ───────────────────────────────
    M('restroom_m', 'Nhà vệ sinh nam', '화장실(남)', '', 'facility',
      49, 3, 11, 5, Z_LOCKER, 'Trên cùng bên phải, cửa đầu tiên sau lối đi ngang gần cửa vào'),
    M('restroom_f', 'Nhà vệ sinh nữ', '화장실(여)', '', 'facility',
      49, 8.5, 11, 5, Z_LOCKER, 'Phía trên bên phải, ngay dưới nhà vệ sinh nam'),
    M('locker_m', 'Phòng thay đồ nam', '탈의실(남)', '', 'facility',
      49, 20, 21, 13, Z_LOCKER, 'Phía trên bên phải, khoảng rộng ngay dưới nhà vệ sinh'),
    M('locker_f', 'Phòng thay đồ nữ', '탈의실(여)', '', 'facility',
      49, 34, 21, 12, Z_LOCKER, 'Phía trên bên phải, ngay dưới phòng thay đồ nam'),

    // ── 오른쪽 프리웨이트존 ─────────────────────────────────
    M('half_rack', 'Half Rack (2 cái)', '하프랙 2대', 'IKK Sports', 'free',
      49, 50, 26, 6, Z_FREE_R, 'Trên cùng khu tạ tự do bên phải, ngay dưới phòng thay đồ nữ'),
    M('vertical_bench', 'Ghế Vertical · Máy đảo ngược · Tạ đòn cố định', '버티컬 벤치·거꾸리·고정식 바벨', '', 'free',
      49, 57, 26, 5, Z_FREE_R, 'Khu tạ tự do bên phải, hàng ngay dưới Half Rack'),
    M('dumbbell_zone', 'Khu tạ đơn Force', '포스덤벨존', 'Force', 'free',
      49, 63, 12, 12, Z_FREE_R, 'Giữa khu tạ tự do bên phải, kệ tạ đơn cạnh Bench Press'),
    M('bench_press', 'Bench Press (2 cái)', '벤치프레스 2대', '', 'free',
      62, 63, 13, 12, Z_FREE_R, 'Giữa khu tạ tự do bên phải, ngay bên phải khu tạ đơn'),
    M('cable_machine', 'Máy cáp', '케이블머신', '', 'free',
      49, 76, 26, 6, Z_FREE_R, 'Phía dưới khu tạ tự do bên phải, máy dài ngay dưới khu tạ đơn và Bench Press'),
    M('situp_roman', 'Ghế gập bụng · Roman Chair', '싯업보드·로만체어', '', 'free',
      77, 50, 13, 7, Z_FREE_R, 'Sát tường phải phía trên, ngay trên Smith Machine (Atlantis)'),
    M('smith_press_a', 'Smith Machine (Atlantis)', '스미스프레스', 'Atlantis', 'free',
      77, 58, 13, 6, Z_FREE_R, 'Sát tường phải, ngay dưới ghế gập bụng · Roman Chair (máy Atlantis)'),
    M('power_rack', 'Power Rack', '파워랙', '', 'free',
      77, 65, 13, 6, Z_FREE_R, 'Sát tường phải, nằm giữa hai máy Smith'),
    M('smith_press_b', 'Smith Machine (Cybex)', '스미스프레스', 'Cybex', 'free',
      77, 72, 13, 7, Z_FREE_R, 'Sát tường phải phía dưới, ngay dưới Power Rack (máy Cybex)'),

    // ── 오른쪽 아래 하체존 ──────────────────────────────────
    M('pivot_press', 'Pivot Press', '피봇프레스', 'Atlantis', 'leg',
      49, 84, 9, 7, Z_LEG_R, 'Máy đầu tiên của khu chân góc dưới bên phải, ngay dưới máy cáp'),
    M('hack_squat_pro', 'Hack Squat Pro', '핵스쿼트 프로', 'Atlantis', 'leg',
      59, 84, 8, 7, Z_LEG_R, 'Giữa khu chân góc dưới bên phải, máy nằm cạnh Pivot Press'),
    M('power_squat', 'Power Squat (Squat Press)', '파워 스쿼트', 'Atlantis', 'leg',
      68, 84, 8, 7, Z_LEG_R, 'Khu chân góc dưới bên phải, ngay bên phải Hack Squat Pro'),
    M('stretching_zone', 'Khu giãn cơ (thảm)', '스트레칭존', '', 'facility',
      78, 84, 14, 13, Z_LEG_R, 'Góc dưới cùng bên phải, khoảng thảm rộng bên phải Power Squat'),

    // ── 맨 아래 하체 머신 줄 ────────────────────────────────
    M('hip_press', 'Hip Press', '힙 프레스', 'Rogers Strength', 'leg',
      33, 92, 8, 6, Z_LEG_BOTTOM, 'Máy đầu tiên bên trái của hàng máy chân dưới cùng'),
    M('leg_press_40', 'Leg Press 40 độ', '40도 레그프레스', 'Atlantis', 'leg',
      42, 92, 9, 6, Z_LEG_BOTTOM, 'Hàng máy chân dưới cùng, ngay bên phải Hip Press'),
    M('power_leg_press', 'Power Leg Press', '파워 레그프레스', 'Cybex', 'leg',
      52, 92, 9, 6, Z_LEG_BOTTOM, 'Giữa hàng máy chân dưới cùng, ngay bên phải Leg Press 40 độ'),
    M('hack_squat', 'Hack Squat', '핵 스쿼트', 'Gymso', 'leg',
      62, 92, 8, 6, Z_LEG_BOTTOM, 'Hàng máy chân dưới cùng, ngay bên phải Power Leg Press'),
    M('v_squat', 'V-Squat', '브이 스쿼트', 'FREEMOTION', 'leg',
      71, 92, 9, 6, Z_LEG_BOTTOM, 'Máy cuối cùng bên phải của hàng máy chân dưới cùng')
  ];

  const BY_ID = {};
  for (const m of MACHINES) BY_ID[m.id] = m;

  function gymById(id) {
    return BY_ID[id] || {
      id: id, nameVi: '?', nameKo: '?', brand: '', category: 'facility',
      x: 48, y: 48, w: 4, h: 4, zoneVi: '?', landmarkVi: ''
    };
  }

  function cx(m) { return m.x + m.w / 2; }
  function cy(m) { return m.y + m.h / 2; }

  function nearest(arr, v) {
    let best = arr[0], bestD = Math.abs(arr[0] - v);
    for (const a of arr) {
      const d = Math.abs(a - v);
      if (d < bestD) { bestD = d; best = a; }
    }
    return best;
  }

  /**
   * 출발 기구 중심 → 가장 가까운 세로통로 → 가로통로 → 목표 세로통로 → 목표 기구 중심.
   * 맨해튼 방식 웨이포인트 3~6개. (GymMap.kt route 포팅)
   */
  function gymRoute(fromId, toId) {
    const from = gymById(fromId);
    const to = gymById(toId);
    const start = { x: cx(from), y: cy(from) };
    const end = { x: cx(to), y: cy(to) };
    if (fromId === toId) return [start];

    const vx1 = nearest(CORRIDOR_XS, start.x);
    const vx2 = nearest(CORRIDOR_XS, end.x);

    const raw = [start, { x: vx1, y: start.y }];
    if (vx1 !== vx2) {
      // 두 세로통로를 잇는 가로통로: 출발/도착 y에 합산 거리가 가장 가까운 것
      let hy = CORRIDOR_YS[0];
      let bestD = Math.abs(CORRIDOR_YS[0] - start.y) + Math.abs(CORRIDOR_YS[0] - end.y);
      for (const h of CORRIDOR_YS) {
        const d = Math.abs(h - start.y) + Math.abs(h - end.y);
        if (d < bestD) { bestD = d; hy = h; }
      }
      raw.push({ x: vx1, y: hy });
      raw.push({ x: vx2, y: hy });
    }
    raw.push({ x: vx2, y: end.y });
    raw.push(end);

    // 연속 중복 점 제거
    const cleaned = [];
    for (const p of raw) {
      const last = cleaned[cleaned.length - 1];
      if (!last || Math.abs(last.x - p.x) > 0.01 || Math.abs(last.y - p.y) > 0.01) cleaned.push(p);
    }
    return cleaned;
  }

  /** 베트남어 이동 안내 문장 3~5개. 방향은 좌표 차이로 계산. */
  function gymWalkSteps(fromId, toId) {
    const from = gymById(fromId);
    const to = gymById(toId);
    if (from.id === to.id) return ['Đứng yên trước máy ' + from.nameVi + ' là được.'];

    const dx = cx(to) - cx(from);
    const dy = cy(to) - cy(from);
    const steps = [];

    steps.push('Từ ' + from.nameVi + ' đi ra lối đi.');

    let vertMsg = null;
    if (dy < -4) vertMsg = 'Đi theo lối đi lên phía trên (hướng cửa ra vào).';
    else if (dy > 4) vertMsg = 'Đi theo lối đi xuống phía dưới.';

    let horizMsg = null;
    if (dx > 4) horizMsg = 'Ở lối đi ngang, đi về phía bên phải.';
    else if (dx < -4) horizMsg = 'Ở lối đi ngang, đi về phía bên trái.';

    if (vertMsg) steps.push(vertMsg);
    if (horizMsg) steps.push(horizMsg);

    if (steps.length < 3) steps.push('Cùng một khu nên chỉ cần đi vài bước là thấy ngay.');

    if (from.zoneVi !== to.zoneVi && to.zoneVi !== '?') steps.push('Đi vào ' + to.zoneVi + '.');

    if (to.landmarkVi) steps.push(to.landmarkVi + ' — đứng trước máy ' + to.nameVi + '.');
    else steps.push('Đứng trước máy ' + to.nameVi + '.');

    return steps.slice(0, 5);
  }

  /** 웨이포인트 경로 길이 합계 × 0.32m (맵 1단위 ≈ 0.32m), 최소 1m. */
  function gymDistanceMeters(fromId, toId) {
    const pts = gymRoute(fromId, toId);
    let units = 0;
    for (let i = 1; i < pts.length; i++) {
      units += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
    }
    return Math.max(1, Math.round(units * 0.32));
  }

  window.GYM = {
    machines: MACHINES,
    byId: gymById,
    route: gymRoute,
    walkSteps: gymWalkSteps,
    distanceMeters: gymDistanceMeters
  };

  /* ============================================================
   * ROUTINE — 주 6일 (목요일 휴식), 매일 약 90~100분
   * 운동 설명 베트남어는 루틴 txt 원문 그대로.
   * ============================================================ */

  // ── 계단·러닝머신 (매 운동일 공통) ──────────────────────────
  function stairsBlock() {
    return {
      minutes: 10,
      phases: [
        { from: 0, to: 2, textVi: 'Mức 1' },
        { from: 2, to: 8, textVi: 'Mức 1–3' },
        { from: 8, to: 10, textVi: 'Mức 1 (thả lỏng)' }
      ],
      rulesVi: [
        'Đặt toàn bộ bàn chân lên bậc thang.',
        'Chỉ chạm nhẹ vào tay cầm để giữ thăng bằng, không đè toàn bộ trọng lượng cơ thể lên tay cầm.',
        'Giữ lưng thẳng, không cúi người quá nhiều về phía trước.',
        'Nếu thở dốc đến mức khó nói chuyện, hãy giảm mức xuống. Tuần đầu có thể chia: 5 phút tập → nghỉ 1 phút → 5 phút còn lại.'
      ]
    };
  }

  function treadmillBlock() {
    return {
      minutes: 20,
      phases: [
        { from: 0, to: 1, textVi: 'Bắt đầu ở tốc độ chậm' },
        { from: 1, to: 18, textVi: 'Đi bộ 4.0–5.2 km/h, độ dốc 0–2%' },
        { from: 18, to: 20, textVi: 'Giảm tốc độ từ từ trong 2 phút cuối' }
      ],
      rulesVi: [
        'Trong 4 tuần đầu chỉ đi bộ nhanh, không cần chạy.',
        'Hơi thở hơi gấp nhưng vẫn nói chuyện được là cường độ vừa.',
        'Đi ở giữa băng tải, nhìn về phía trước, đánh tay tự nhiên, không bám chặt tay cầm.',
        'Nếu đau đầu gối hoặc ống chân, giảm tốc độ và độ dốc ngay.'
      ]
    };
  }

  // ── 기구별 베이스 정의 (베트남어 사용법은 txt 원문 그대로) ──
  const EXDB = {
    leg_press_40: {
      nameVi: 'Leg Press 40 độ', nameKo: '40도 레그프레스', machineId: 'leg_press_40',
      motion: 'leg_press', restSeconds: 90,
      muscles: [{ m: 'quad', level: 1 }, { m: 'glute', level: 2 }, { m: 'hamstring', level: 2 }],
      setupVi: [
        'Ngồi sao cho lưng và mông áp sát vào đệm.',
        'Đặt hai bàn chân trên bàn đạp, rộng bằng vai.',
        'Mũi chân hơi hướng ra ngoài.',
        'Duỗi chân gần thẳng rồi mở chốt an toàn.'
      ],
      formVi: [
        'Hít vào và từ từ hạ bàn đạp.',
        'Chỉ hạ đến khi mông vẫn còn áp sát vào ghế.',
        'Dùng toàn bộ bàn chân để đẩy bàn đạp lên.',
        'Thở ra khi đẩy.',
        'Không khóa cứng đầu gối ở vị trí trên cùng.',
        'Kết thúc bài tập bằng cách duỗi chân gần thẳng và khóa lại chốt an toàn.'
      ],
      cautionsVi: [
        'Đầu gối chụm vào trong.',
        'Gót chân nhấc khỏi bàn đạp.',
        'Mông bị nâng khỏi ghế.',
        'Hạ tạ quá sâu.',
        'Khóa cứng đầu gối.'
      ],
      noteVi: 'Trong những buổi đầu, chồng phải kiểm tra chốt an toàn trước khi tập. Nếu bàn trượt quá nặng ngay cả khi chưa gắn tạ, đổi sang Power Squat (Squat Press) hoặc Power Leg Press.'
    },

    power_leg_press: {
      nameVi: 'Power Leg Press', nameKo: '파워 레그프레스', machineId: 'power_leg_press',
      motion: 'leg_press', restSeconds: 90,
      muscles: [{ m: 'quad', level: 1 }, { m: 'glute', level: 2 }, { m: 'hamstring', level: 2 }],
      setupVi: [
        'Ngồi sao cho lưng và mông áp sát vào đệm.',
        'Đặt hai bàn chân trên bàn đạp, rộng bằng vai.',
        'Mũi chân hơi hướng ra ngoài.',
        'Duỗi chân gần thẳng rồi mở chốt an toàn.'
      ],
      formVi: [
        'Hít vào và từ từ hạ bàn đạp.',
        'Chỉ hạ đến khi mông vẫn còn áp sát vào ghế.',
        'Dùng toàn bộ bàn chân để đẩy bàn đạp lên.',
        'Thở ra khi đẩy.',
        'Không khóa cứng đầu gối ở vị trí trên cùng.',
        'Kết thúc bài tập bằng cách duỗi chân gần thẳng và khóa lại chốt an toàn.'
      ],
      cautionsVi: [
        'Đầu gối chụm vào trong.',
        'Gót chân nhấc khỏi bàn đạp.',
        'Mông bị nâng khỏi ghế.',
        'Hạ tạ quá sâu.',
        'Khóa cứng đầu gối.'
      ],
      noteVi: 'Đặt bàn chân hơi cao hơn bình thường trên bàn đạp để dễ cảm nhận mông và mặt sau đùi. Nhưng không hạ đầu gối sâu đến mức mông rời khỏi ghế. Có thể thay bằng Power Squat (Squat Press).'
    },

    hack_squat: {
      nameVi: 'Hack Squat', nameKo: '핵스쿼트', machineId: 'hack_squat',
      motion: 'squat', restSeconds: 90,
      muscles: [{ m: 'quad', level: 1 }, { m: 'glute', level: 2 }],
      setupVi: [
        'Đặt lưng sát vào đệm.',
        'Đặt hai vai dưới phần đệm vai.',
        'Hai chân rộng bằng vai và hơi đưa về phía trước.',
        'Mũi chân hơi hướng ra ngoài.',
        'Duỗi chân gần thẳng rồi mở khóa an toàn.'
      ],
      formVi: [
        'Hít vào và từ từ gập đầu gối.',
        'Đầu gối di chuyển cùng hướng với mũi chân.',
        'Hạ xuống đến mức thoải mái, không cần squat thật sâu.',
        'Đẩy toàn bộ bàn chân xuống bàn đạp để đứng lên.',
        'Thở ra khi đứng lên.',
        'Khóa máy lại trước khi bước ra.'
      ],
      cautionsVi: [
        'Để đầu gối chụm vào nhau.',
        'Nhấc gót chân.',
        'Cong hoặc tách lưng khỏi đệm.',
        'Khóa mạnh đầu gối khi đứng lên.'
      ],
      noteVi: 'Trong 2–3 buổi đầu, chồng phải trực tiếp kiểm tra khóa an toàn ở bên cạnh trước khi tập.'
    },

    seated_leg_curl: {
      nameVi: 'Seated Leg Curl', nameKo: '시티드 레그컬', machineId: 'seated_leg_curl',
      motion: 'leg_curl_seated', restSeconds: 60,
      muscles: [{ m: 'hamstring', level: 1 }, { m: 'calf', level: 2 }],
      setupVi: [
        'Điều chỉnh ghế để đầu gối thẳng hàng với trục xoay của máy.',
        'Đệm dưới đặt ở phía sau cổ chân, ngay trên gót chân.',
        'Điều chỉnh đệm trên giữ chắc đùi.',
        'Giữ lưng và mông sát ghế.'
      ],
      formVi: [
        'Kéo gót chân xuống và ra phía sau.',
        'Thở ra khi gập chân.',
        'Giữ 1 giây ở vị trí dưới.',
        'Hít vào và từ từ đưa chân trở lại.'
      ],
      cautionsVi: [
        'Không để tạ rơi hoặc va mạnh.'
      ],
      noteVi: 'Bài này tập mặt sau đùi.'
    },

    lying_leg_curl: {
      nameVi: 'Lying Leg Curl', nameKo: '라잉 레그컬', machineId: 'lying_leg_curl',
      motion: 'leg_curl_lying', restSeconds: 60,
      muscles: [{ m: 'hamstring', level: 1 }, { m: 'calf', level: 2 }],
      setupVi: [
        'Nằm sấp trên máy.',
        'Đầu gối nằm gần mép của đệm.',
        'Đệm chân đặt ngay phía trên gót chân.',
        'Giữ hông áp sát vào đệm.'
      ],
      formVi: [
        'Gập đầu gối và kéo gót chân về phía mông.',
        'Thở ra khi gập chân.',
        'Hạ chân xuống từ từ.'
      ],
      cautionsVi: [
        'Không nâng hông lên khỏi đệm.',
        'Không cong lưng dưới.'
      ],
      noteVi: 'Nếu bị chuột rút, giảm mức tạ và không kéo gót chân quá gần mông.'
    },

    leg_extension: {
      nameVi: 'Leg Extension', nameKo: '레그익스텐션', machineId: 'leg_extension',
      motion: 'leg_extension', restSeconds: 60,
      muscles: [{ m: 'quad', level: 1 }],
      setupVi: [
        'Điều chỉnh ghế để đầu gối thẳng hàng với trục máy.',
        'Đệm chân đặt ở phía trước cổ chân, không đặt trên bàn chân.',
        'Lưng và mông áp sát ghế.',
        'Hai tay giữ tay cầm.'
      ],
      formVi: [
        'Duỗi chân lên từ từ.',
        'Thở ra khi duỗi chân.',
        'Dừng trước khi đầu gối bị khóa cứng.',
        'Giữ khoảng 1 giây.',
        'Hạ chân xuống trong 2–3 giây.'
      ],
      cautionsVi: [
        'Nếu đau ở khớp gối, giảm tạ và không duỗi chân quá cao.'
      ],
      noteVi: 'Bài này tập mặt trước đùi.'
    },

    standing_outthigh: {
      nameVi: 'Standing Hip Abduction', nameKo: '스탠딩 아웃타이', machineId: 'standing_outthigh',
      motion: 'hip_abduction_standing', restSeconds: 60, perSide: true,
      muscles: [{ m: 'abductor', level: 1 }, { m: 'glute', level: 1 }],
      setupVi: [
        'Đứng thẳng và giữ tay cầm của máy.',
        'Đặt phần đệm vào phía ngoài của đùi.',
        'Chân trụ hơi cong.'
      ],
      formVi: [
        'Giữ bụng chắc và cơ thể không nghiêng.',
        'Đưa chân có đệm sang bên.',
        'Không cần đưa chân lên quá cao.',
        'Giữ khoảng 1 giây.',
        'Từ từ đưa chân trở lại.',
        'Hoàn thành một bên rồi đổi chân.'
      ],
      cautionsVi: [
        'Không xoay bàn chân quá nhiều.',
        'Không dùng toàn bộ cơ thể để đẩy máy.'
      ],
      noteVi: 'Bài này tập phần mông bên.'
    },

    chest_press: {
      nameVi: 'Chest Press', nameKo: '체스트프레스', machineId: 'chest_press_b',
      motion: 'press_horizontal', restSeconds: 75,
      muscles: [
        { m: 'chest_mid', level: 1 }, { m: 'chest_lower', level: 1 },
        { m: 'delt_front', level: 2 }, { m: 'triceps', level: 2 }
      ],
      setupVi: [
        'Điều chỉnh ghế để tay cầm ngang với giữa ngực.',
        'Lưng và đầu áp sát đệm.',
        'Hai chân đặt chắc trên sàn.',
        'Cầm tay cầm và giữ cổ tay thẳng.',
        'Khuỷu tay hơi thấp hơn vai.'
      ],
      formVi: [
        'Đẩy tay cầm về phía trước.',
        'Thở ra khi đẩy.',
        'Không khóa cứng khuỷu tay.',
        'Hít vào và từ từ đưa tay cầm trở lại.'
      ],
      cautionsVi: [
        'Không hạ quá sâu nếu vai bị khó chịu.'
      ],
      noteVi: null
    },

    lat_pulldown: {
      nameVi: 'Lat Pulldown', nameKo: '랫풀다운', machineId: 'lat_pulldown',
      motion: 'pulldown', restSeconds: 75,
      muscles: [{ m: 'lat', level: 1 }, { m: 'biceps', level: 2 }, { m: 'rhomboid', level: 2 }],
      setupVi: [
        'Điều chỉnh đệm giữ đùi sao cho cơ thể không bị nâng lên.',
        'Cầm thanh rộng hơn vai một chút.',
        'Ngồi xuống và đặt hai chân chắc trên sàn.',
        'Nâng ngực nhẹ và hạ vai xuống.'
      ],
      formVi: [
        'Kéo thanh về phía phần trên của ngực.',
        'Nghĩ đến việc đưa khuỷu tay xuống dưới.',
        'Thở ra khi kéo.',
        'Từ từ duỗi tay lên, không thả tạ đột ngột.'
      ],
      cautionsVi: [
        'Không kéo thanh ra sau cổ.',
        'Không ngả người quá xa về phía sau.'
      ],
      noteVi: 'Bài này tập cơ lưng và cơ xô.'
    },

    seated_row: {
      nameVi: 'Seated Row', nameKo: '시티드로우', machineId: 'seated_row',
      motion: 'row', restSeconds: 75,
      muscles: [
        { m: 'lat', level: 1 }, { m: 'rhomboid', level: 1 }, { m: 'trap_mid', level: 1 },
        { m: 'biceps', level: 2 }, { m: 'delt_rear', level: 2 }
      ],
      setupVi: [
        'Điều chỉnh ghế để tay cầm hướng về phần bụng trên hoặc ngực dưới.',
        'Giữ ngực mở và lưng thẳng.',
        'Hạ vai xuống, không nhún vai.'
      ],
      formVi: [
        'Kéo tay cầm về phía bụng.',
        'Đưa hai khuỷu tay về phía sau.',
        'Siết nhẹ hai xương bả vai.',
        'Thở ra khi kéo.',
        'Hít vào và từ từ duỗi tay.'
      ],
      cautionsVi: [
        'Không đung đưa thân người về trước và sau.'
      ],
      noteVi: null
    },

    shoulder_press: {
      nameVi: 'Shoulder Press', nameKo: '숄더프레스', machineId: 'shoulder_press_b',
      motion: 'press_overhead', restSeconds: 75,
      muscles: [
        { m: 'delt_front', level: 1 }, { m: 'delt_side', level: 1 },
        { m: 'triceps', level: 2 }, { m: 'trap_upper', level: 2 }
      ],
      setupVi: [
        'Điều chỉnh ghế để tay cầm ngang với vai hoặc tai.',
        'Lưng và đầu áp sát đệm.',
        'Hai chân đặt chắc trên sàn.',
        'Giữ cổ tay thẳng.'
      ],
      formVi: [
        'Đẩy tay cầm lên trên.',
        'Thở ra khi đẩy.',
        'Từ từ hạ xuống đến vị trí thoải mái.'
      ],
      cautionsVi: [
        'Không khóa cứng khuỷu tay.',
        'Không cong lưng dưới.',
        'Nếu vai bị đau hoặc có cảm giác bị kẹt, dừng bài tập.'
      ],
      noteVi: 'Bài này phải bắt đầu bằng mức tạ rất nhẹ.'
    },

    side_lateral_raise: {
      nameVi: 'Side Lateral Raise', nameKo: '사이드 레터럴레이즈', machineId: 'side_lateral_raise',
      motion: 'lateral_raise', restSeconds: 60,
      muscles: [{ m: 'delt_side', level: 1 }, { m: 'trap_upper', level: 2 }],
      setupVi: [
        'Điều chỉnh ghế để vai gần với trục xoay của máy.',
        'Đặt cánh tay hoặc khuỷu tay đúng vào phần đệm.',
        'Giữ lưng sát ghế.',
        'Hạ vai xuống, không nhún vai.'
      ],
      formVi: [
        'Nâng hai cánh tay sang hai bên.',
        'Chỉ nâng đến ngang vai.',
        'Thở ra khi nâng.',
        'Hạ xuống thật chậm.'
      ],
      cautionsVi: [
        'Không dùng lực quán tính.'
      ],
      noteVi: 'Máy này phải sử dụng mức tạ nhẹ hơn các máy khác.'
    },

    plank: {
      nameVi: 'Plank', nameKo: '플랭크', machineId: 'stretching_zone',
      motion: 'plank', restSeconds: 60,
      muscles: [
        { m: 'abs', level: 1 }, { m: 'oblique', level: 2 },
        { m: 'lower_back', level: 2 }, { m: 'glute', level: 3 }
      ],
      setupVi: [
        'Chống hai khuỷu tay xuống thảm.',
        'Khuỷu tay nằm ngay dưới vai.',
        'Duỗi hai chân về phía sau.'
      ],
      formVi: [
        'Giữ đầu, lưng và hông thành một đường thẳng.',
        'Siết nhẹ bụng và mông.',
        'Hít thở bình thường.'
      ],
      cautionsVi: [
        'Không nâng mông quá cao.',
        'Không để lưng bị võng.'
      ],
      noteVi: 'Nếu quá khó, có thể đặt đầu gối xuống thảm.'
    },

    /* ── 추가 종목 (운동량 확대) ───────────────────────────── */

    hip_add_abductor: {
      nameVi: 'Hip Abduction (ngồi)', nameKo: '힙어브덕터', machineId: 'hip_add_abductor',
      motion: 'hip_abduction_standing', restSeconds: 60,
      muscles: [{ m: 'abductor', level: 1 }, { m: 'glute', level: 1 }],
      setupVi: [
        'Ngồi thẳng, lưng và mông áp sát vào đệm lưng.',
        'Chỉnh máy sang chế độ dạng — hai tấm đệm nằm ở mặt ngoài của đùi.',
        'Đặt hai bàn chân lên bệ để chân, đầu gối gập khoảng 90 độ.',
        'Khép hai đùi lại làm vị trí bắt đầu.',
        'Hai tay nắm nhẹ tay cầm hai bên ghế.'
      ],
      formVi: [
        'Siết nhẹ bụng, giữ lưng luôn áp sát đệm.',
        'Từ từ mở hai đùi sang hai bên.',
        'Thở ra khi mở chân.',
        'Chỉ mở đến mức còn thấy thoải mái, không cần mở hết cỡ.',
        'Giữ 1 giây và siết cơ mông.',
        'Hít vào và khép chân lại trong 2–3 giây.'
      ],
      cautionsVi: [
        'Không ngả người ra sau để lấy đà.',
        'Không mở chân quá rộng làm căng háng.',
        'Không để tạ rơi mạnh khi khép chân.'
      ],
      noteVi: 'Máy này có hai chế độ. Hôm nay chỉ dùng chế độ dạng (đẩy đùi ra ngoài) để tập mông bên.'
    },

    monster_glute: {
      nameVi: 'Monster Glute', nameKo: '몬스터 글루트', machineId: 'monster_glute',
      motion: 'hip_abduction_standing', restSeconds: 60, perSide: true,
      muscles: [{ m: 'glute', level: 1 }, { m: 'hamstring', level: 2 }],
      setupVi: [
        'Đứng đối diện máy, hai tay nắm chắc tay cầm phía trước.',
        'Đặt bàn chân trụ lên bệ đứng.',
        'Đặt chân tập lên bàn đạp, đầu gối gập lại.',
        'Chỉnh đệm ngực để thân trên tựa vào và không bị lắc.',
        'Bắt đầu bằng mức tạ nhẹ nhất trong buổi đầu.'
      ],
      formVi: [
        'Siết bụng, giữ lưng thẳng, không ưỡn lưng dưới.',
        'Đạp bàn đạp ra phía sau bằng cả bàn chân.',
        'Thở ra khi đạp và siết chặt cơ mông.',
        'Duỗi chân đến mức thoải mái, không khóa cứng đầu gối.',
        'Hít vào và thu chân về thật chậm.',
        'Hoàn thành đủ số lần một bên rồi mới đổi chân.'
      ],
      cautionsVi: [
        'Không ưỡn lưng dưới để đẩy tạ.',
        'Không xoay hông sang một bên.',
        'Không đá chân nhanh bằng lực quán tính.'
      ],
      noteVi: 'Bài này tập trực tiếp cơ mông. Cảm nhận mông siết lại quan trọng hơn mức tạ.'
    },

    pec_rear_delt_fly: {
      nameVi: 'Rear Delt Fly', nameKo: '리어델트 플라이', machineId: 'pec_rear_delt_fly',
      motion: 'row', restSeconds: 60,
      muscles: [{ m: 'delt_rear', level: 1 }, { m: 'rhomboid', level: 2 }, { m: 'trap_mid', level: 2 }],
      setupVi: [
        'Chỉnh máy sang chế độ Rear Delt — hai tay cầm nằm ở phía trước mặt.',
        'Chỉnh ghế để tay cầm ngang với vai.',
        'Ngồi quay mặt vào đệm ngực, ngực áp sát đệm.',
        'Hai chân đặt chắc trên sàn.',
        'Nắm tay cầm với hai tay gần thẳng, khuỷu tay chỉ hơi cong.'
      ],
      formVi: [
        'Hạ vai xuống, không nhún vai lên tai.',
        'Mở hai tay ra sau theo đường vòng cung.',
        'Nghĩ đến việc siết nhẹ hai xương bả vai lại.',
        'Thở ra khi mở tay.',
        'Chỉ mở đến ngang thân người, không cố ra xa hơn.',
        'Hít vào và đưa tay về phía trước thật chậm.'
      ],
      cautionsVi: [
        'Không dùng lực quán tính để hất tay ra sau.',
        'Không nhấc ngực khỏi đệm.',
        'Không gập khuỷu tay lại thành động tác kéo.'
      ],
      noteVi: 'Bài này tập vai sau nên phải dùng mức tạ nhẹ.'
    },

    // motion.js 에 'curl' 이 없어 가장 가까운 'row' 로 대체함.
    arm_curl: {
      nameVi: 'Arm Curl', nameKo: '암컬', machineId: 'arm_curl',
      motion: 'row', restSeconds: 60,
      muscles: [{ m: 'biceps', level: 1 }, { m: 'forearm', level: 2 }],
      setupVi: [
        'Chỉnh ghế để nách tì vừa lên mép trên của đệm dốc.',
        'Ngồi thẳng, ngực hơi mở, hai chân đặt chắc trên sàn.',
        'Đặt trọn phần sau cánh tay lên đệm.',
        'Nắm hai tay cầm, lòng bàn tay hướng lên trên.',
        'Duỗi tay gần thẳng làm vị trí bắt đầu.'
      ],
      formVi: [
        'Giữ khuỷu tay cố định trên đệm, không nhấc lên.',
        'Gập tay cầm lên phía vai.',
        'Thở ra khi gập tay.',
        'Giữ 1 giây ở vị trí trên và siết bắp tay.',
        'Hít vào và hạ xuống trong 2–3 giây.',
        'Dừng trước khi khuỷu tay bị duỗi khóa cứng.'
      ],
      cautionsVi: [
        'Không ngả thân người ra sau để kéo tạ.',
        'Không bẻ gập cổ tay.',
        'Nếu khuỷu tay đau, giảm tạ ngay.'
      ],
      noteVi: 'Bài này tập bắp tay trước, dùng mức tạ nhẹ.'
    },

    // motion.js 에 'hip_thrust' 가 없어 가장 가까운 'leg_press' 로 대체함.
    hip_thrust: {
      nameVi: 'Hip Thrust', nameKo: '힙 쓰러스트', machineId: 'hip_thrust',
      motion: 'leg_press', restSeconds: 75,
      muscles: [{ m: 'glute', level: 1 }, { m: 'hamstring', level: 2 }],
      setupVi: [
        'Ngồi vào máy, tựa phần lưng trên vào đệm lưng.',
        'Chỉnh đệm hông sao cho nó nằm trên nếp bẹn, không nằm trên bụng.',
        'Đặt hai bàn chân lên bệ, rộng bằng hông.',
        'Đầu gối gập khoảng 90 độ khi hông đã đẩy lên.',
        'Hai tay giữ tay cầm hai bên.'
      ],
      formVi: [
        'Siết bụng và thu nhẹ xương chậu về phía sau.',
        'Đạp bằng gót chân và đẩy hông lên trên.',
        'Thở ra khi đẩy lên, siết chặt cơ mông 1 giây.',
        'Chỉ đẩy đến khi thân và đùi thành một đường thẳng.',
        'Hít vào và hạ hông xuống thật chậm.',
        'Không để tạ chạm hẳn xuống giữa các lần.'
      ],
      cautionsVi: [
        'Không ưỡn lưng dưới ở vị trí trên cùng.',
        'Không đẩy hông lên quá cao.',
        'Không nhấc gót chân khỏi bệ.',
        'Nếu đệm đè đau xương hông, lót thêm khăn.'
      ],
      noteVi: 'Bài mông mạnh nhất trong ngày. Bắt đầu nhẹ và tăng dần từng nấc.'
    },

    hip_press: {
      nameVi: 'Hip Press', nameKo: '힙 프레스', machineId: 'hip_press',
      motion: 'leg_press', restSeconds: 60, perSide: true,
      muscles: [{ m: 'glute', level: 1 }, { m: 'hamstring', level: 2 }],
      setupVi: [
        'Đứng vào máy, hai tay nắm tay cầm phía trước.',
        'Đặt chân trụ chắc lên bệ đứng.',
        'Đặt bàn chân tập lên bàn đạp, cả bàn chân áp sát.',
        'Chỉnh đệm tựa để thân trên không bị lắc.',
        'Hông và vai hướng thẳng về phía trước.'
      ],
      formVi: [
        'Siết bụng, giữ lưng thẳng.',
        'Đạp bàn đạp ra phía sau bằng gót chân.',
        'Thở ra khi đạp và siết cơ mông.',
        'Dừng trước khi đầu gối bị khóa cứng.',
        'Hít vào và thu chân về từ từ trong 2–3 giây.',
        'Hoàn thành một bên rồi đổi chân.'
      ],
      cautionsVi: [
        'Không ưỡn lưng dưới để đẩy thêm tạ.',
        'Không xoay hông sang bên.',
        'Không thả tạ rơi khi thu chân về.'
      ],
      noteVi: 'Nếu máy đang có người dùng, có thể thay bằng Monster Glute.'
    },

    pullover: {
      nameVi: 'Pullover', nameKo: '풀오버', machineId: 'pullover',
      motion: 'pulldown', restSeconds: 60,
      muscles: [{ m: 'lat', level: 1 }, { m: 'triceps', level: 2 }, { m: 'chest_lower', level: 2 }],
      setupVi: [
        'Chỉnh ghế để vai ngang với trục xoay của máy.',
        'Ngồi thẳng, lưng áp sát đệm.',
        'Cài đai bụng (nếu máy có) để thân không bị nâng lên.',
        'Đặt hai cẳng tay hoặc hai tay lên thanh đòn phía trên.',
        'Hai chân đặt chắc trên sàn hoặc trên bệ để chân.'
      ],
      formVi: [
        'Hạ vai xuống và mở nhẹ ngực.',
        'Kéo thanh đòn xuống theo vòng cung về phía bụng.',
        'Nghĩ đến việc dùng cơ xô, không dùng sức tay.',
        'Thở ra khi kéo xuống.',
        'Giữ 1 giây ở vị trí dưới.',
        'Hít vào và để thanh đòn đi lên thật chậm.'
      ],
      cautionsVi: [
        'Không để thân người bị nhấc khỏi ghế.',
        'Không cong lưng dưới.',
        'Không đưa tay lên quá cao nếu vai thấy khó chịu.'
      ],
      noteVi: 'Bài này tập cơ xô theo hướng khác với Lat Pulldown.'
    },

    triceps_pushdown: {
      nameVi: 'Triceps Pushdown', nameKo: '트라이셉스 푸시다운', machineId: 'triceps_pushdown',
      motion: 'pulldown', restSeconds: 60,
      muscles: [{ m: 'triceps', level: 1 }, { m: 'abs', level: 3 }],
      setupVi: [
        'Chỉnh ròng rọc lên vị trí cao ngang mặt.',
        'Đứng đối diện máy, hai chân rộng bằng vai, một chân hơi lùi.',
        'Nắm thanh cầm rộng bằng vai.',
        'Kéo hai khuỷu tay sát vào hai bên sườn.',
        'Thân người hơi nghiêng về trước, lưng thẳng.'
      ],
      formVi: [
        'Siết bụng và giữ khuỷu tay cố định sát sườn.',
        'Duỗi cẳng tay đẩy thanh xuống dưới.',
        'Thở ra khi đẩy xuống.',
        'Giữ 1 giây và siết cơ tay sau.',
        'Hít vào và đưa thanh lên từ từ đến khi khuỷu tay gập khoảng 90 độ.',
        'Chỉ có cẳng tay chuyển động, phần trên cánh tay đứng yên.'
      ],
      cautionsVi: [
        'Không nhún vai lên.',
        'Không dùng cả thân người để đè thanh xuống.',
        'Không để khuỷu tay bung ra xa sườn.'
      ],
      noteVi: 'Bài này tập cơ tay sau, dùng mức tạ nhẹ và tốc độ chậm.'
    },

    situp_roman: {
      nameVi: 'Gập bụng trên ghế', nameKo: '싯업보드', machineId: 'situp_roman',
      motion: 'plank', restSeconds: 60,
      muscles: [{ m: 'abs', level: 1 }, { m: 'oblique', level: 2 }],
      setupVi: [
        'Chọn ghế gập bụng ở độ dốc thấp nhất.',
        'Ngồi lên ghế và móc hai bàn chân vào đệm giữ chân.',
        'Nằm ngả lưng xuống từ từ.',
        'Bắt chéo hai tay trước ngực, không đan tay sau gáy.',
        'Cằm hơi thu vào, không ép cằm sát ngực.'
      ],
      formVi: [
        'Siết bụng trước khi bắt đầu.',
        'Cuộn phần thân trên lên bằng cơ bụng.',
        'Chỉ nâng lên khoảng một nửa, không cần ngồi dậy hẳn.',
        'Thở ra khi cuộn lên.',
        'Giữ 1 giây ở vị trí trên.',
        'Hít vào và hạ lưng xuống thật chậm.'
      ],
      cautionsVi: [
        'Không kéo cổ bằng hai tay.',
        'Không dùng lực quán tính để bật lên.',
        'Nếu lưng dưới đau, dừng ngay và chuyển sang Plank.'
      ],
      noteVi: 'Nếu ghế quá dốc hoặc thấy đau lưng, có thể thay bằng Plank ở khu giãn cơ.'
    }
  };

  /**
   * 운동 항목 생성.
   * ov: { sets, repsLabelVi, repMin, repMax, timeSeconds, altMachineIds, restSeconds, noteVi }
   */
  function EX(dow, key, ov) {
    const base = EXDB[key];
    return {
      id: 'd' + dow + '_' + key,
      nameVi: base.nameVi,
      nameKo: base.nameKo,
      machineId: base.machineId,
      sets: ov.sets,
      setsFirst2Weeks: 2,
      repsLabelVi: ov.repsLabelVi,
      repMin: ov.repMin !== undefined ? ov.repMin : null,
      repMax: ov.repMax !== undefined ? ov.repMax : null,
      timeSeconds: ov.timeSeconds !== undefined ? ov.timeSeconds : null,
      restSeconds: ov.restSeconds !== undefined ? ov.restSeconds : base.restSeconds,
      perSide: base.perSide === true,
      setupVi: base.setupVi.slice(),
      formVi: base.formVi.slice(),
      cautionsVi: base.cautionsVi.slice(),
      noteVi: ov.noteVi !== undefined ? ov.noteVi : base.noteVi,
      altMachineIds: ov.altMachineIds ? ov.altMachineIds.slice() : [],
      muscles: base.muscles.map(mu => ({ m: mu.m, level: mu.level })),
      motion: base.motion
    };
  }

  const DAYS = [
    // ── 월 — CHÂN A ────────────────────────────────────────
    {
      dow: 1, nameVi: 'Thứ Hai', titleVi: 'CHÂN A', focusVi: 'Đùi trước · Mông', rest: false,
      stairs: stairsBlock(),
      treadmill: treadmillBlock(),
      exercises: [
        EX(1, 'leg_press_40', { sets: 3, repsLabelVi: '10–12 lần', repMin: 10, repMax: 12, altMachineIds: ['power_squat', 'power_leg_press'] }),
        EX(1, 'seated_leg_curl', { sets: 3, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15 }),
        EX(1, 'hack_squat', { sets: 2, repsLabelVi: '10 lần', repMin: 10, repMax: 10 }),
        EX(1, 'leg_extension', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15 }),
        EX(1, 'standing_outthigh', { sets: 2, repsLabelVi: 'mỗi chân 12–15 lần', repMin: 12, repMax: 15 }),
        EX(1, 'hip_add_abductor', { sets: 2, repsLabelVi: '15–20 lần', repMin: 15, repMax: 20, restSeconds: 60 }),
        EX(1, 'monster_glute', { sets: 2, repsLabelVi: 'mỗi chân 12–15 lần', repMin: 12, repMax: 15, restSeconds: 60, altMachineIds: ['hip_press'] })
      ],
      tipsVi: [
        'Nếu bàn trượt của Leg Press 40 độ quá nặng ngay cả khi chưa gắn tạ, đổi sang Power Squat hoặc Power Leg Press.',
        'Buổi đầu tiên, ghi lại số ghế và vị trí chốt an toàn của từng máy quan trọng hơn cả mức tạ.'
      ]
    },

    // ── 화 — THÂN TRÊN + CHÂN NHẸ ─────────────────────────
    {
      dow: 2, nameVi: 'Thứ Ba', titleVi: 'THÂN TRÊN + CHÂN NHẸ', focusVi: 'Lưng · Ngực · Chân nhẹ', rest: false,
      stairs: stairsBlock(),
      treadmill: treadmillBlock(),
      exercises: [
        EX(2, 'lat_pulldown', { sets: 3, repsLabelVi: '10–12 lần', repMin: 10, repMax: 12 }),
        EX(2, 'chest_press', { sets: 3, repsLabelVi: '10–12 lần', repMin: 10, repMax: 12 }),
        EX(2, 'seated_row', { sets: 2, repsLabelVi: '10–12 lần', repMin: 10, repMax: 12 }),
        EX(2, 'lying_leg_curl', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15 }),
        EX(2, 'standing_outthigh', { sets: 2, repsLabelVi: 'mỗi chân 15 lần', repMin: 15, repMax: 15 }),
        EX(2, 'pec_rear_delt_fly', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15, restSeconds: 60 }),
        EX(2, 'arm_curl', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15, restSeconds: 60 })
      ],
      tipsVi: [
        'Các bài chân hôm nay dùng mức tạ nhẹ hơn Thứ Hai.',
        'Nếu chân còn đau cơ nhiều từ Thứ Hai, bỏ bài 4 và 5, chỉ tập thân trên.'
      ]
    },

    // ── 수 — CHÂN B ────────────────────────────────────────
    {
      dow: 3, nameVi: 'Thứ Tư', titleVi: 'CHÂN B', focusVi: 'Mông · Mặt sau đùi', rest: false,
      stairs: stairsBlock(),
      treadmill: treadmillBlock(),
      exercises: [
        EX(3, 'hack_squat', { sets: 3, repsLabelVi: '10 lần', repMin: 10, repMax: 10 }),
        EX(3, 'power_leg_press', { sets: 3, repsLabelVi: '10–12 lần', repMin: 10, repMax: 12, altMachineIds: ['power_squat'] }),
        EX(3, 'lying_leg_curl', { sets: 3, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15 }),
        EX(3, 'leg_extension', { sets: 2, repsLabelVi: '15 lần', repMin: 15, repMax: 15 }),
        EX(3, 'standing_outthigh', { sets: 2, repsLabelVi: 'mỗi chân 12–15 lần', repMin: 12, repMax: 15 }),
        EX(3, 'hip_thrust', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15, restSeconds: 75 }),
        EX(3, 'hip_press', { sets: 2, repsLabelVi: 'mỗi chân 12–15 lần', repMin: 12, repMax: 15, restSeconds: 60, altMachineIds: ['monster_glute'] })
      ],
      tipsVi: [
        'Ở máy Leg Press, đặt bàn chân hơi cao hơn bình thường để dễ cảm nhận mông và mặt sau đùi.',
        'Không hạ đầu gối sâu đến mức mông rời khỏi ghế.'
      ]
    },

    // ── 목 — 휴식 ──────────────────────────────────────────
    {
      dow: 4, nameVi: 'Thứ Năm', titleVi: 'Ngày nghỉ', focusVi: 'Nghỉ ngơi và hồi phục', rest: true,
      stairs: null,
      treadmill: null,
      exercises: [],
      tipsVi: [
        'Có thể đi bộ nhẹ hoặc giãn cơ. Không tập tạ.',
        'Ngủ đủ giấc và uống đủ nước để cơ bắp hồi phục.'
      ]
    },

    // ── 금 — THÂN TRÊN B ───────────────────────────────────
    {
      dow: 5, nameVi: 'Thứ Sáu', titleVi: 'THÂN TRÊN B', focusVi: 'Lưng · Ngực · Vai', rest: false,
      stairs: stairsBlock(),
      treadmill: treadmillBlock(),
      exercises: [
        EX(5, 'lat_pulldown', { sets: 3, repsLabelVi: '10–12 lần', repMin: 10, repMax: 12 }),
        EX(5, 'chest_press', { sets: 3, repsLabelVi: '10–12 lần', repMin: 10, repMax: 12 }),
        EX(5, 'seated_row', { sets: 3, repsLabelVi: '10–12 lần', repMin: 10, repMax: 12 }),
        EX(5, 'shoulder_press', { sets: 2, repsLabelVi: '10 lần', repMin: 10, repMax: 10 }),
        EX(5, 'side_lateral_raise', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15 }),
        EX(5, 'pullover', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15, restSeconds: 60 }),
        EX(5, 'triceps_pushdown', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15, restSeconds: 60 })
      ],
      tipsVi: [
        'Shoulder Press phải bắt đầu bằng mức tạ rất nhẹ.',
        'Side Lateral Raise dùng mức tạ nhẹ hơn các máy khác.'
      ]
    },

    // ── 토 — TOÀN THÂN NHẸ ────────────────────────────────
    {
      dow: 6, nameVi: 'Thứ Bảy', titleVi: 'TOÀN THÂN NHẸ', focusVi: 'Toàn thân, tạ nhẹ hơn 20–30%', rest: false,
      stairs: stairsBlock(),
      treadmill: treadmillBlock(),
      exercises: [
        EX(6, 'leg_press_40', { sets: 2, repsLabelVi: '15 lần', repMin: 15, repMax: 15, altMachineIds: ['power_squat'] }),
        EX(6, 'seated_leg_curl', { sets: 2, repsLabelVi: '15 lần', repMin: 15, repMax: 15 }),
        EX(6, 'leg_extension', { sets: 2, repsLabelVi: '15 lần', repMin: 15, repMax: 15 }),
        EX(6, 'standing_outthigh', { sets: 2, repsLabelVi: 'mỗi chân 15 lần', repMin: 15, repMax: 15 }),
        EX(6, 'chest_press', { sets: 2, repsLabelVi: '12 lần', repMin: 12, repMax: 12 }),
        EX(6, 'lat_pulldown', { sets: 2, repsLabelVi: '12 lần', repMin: 12, repMax: 12 }),
        EX(6, 'seated_row', { sets: 2, repsLabelVi: '12 lần', repMin: 12, repMax: 12, restSeconds: 60 }),
        EX(6, 'side_lateral_raise', { sets: 2, repsLabelVi: '15 lần', repMin: 15, repMax: 15, restSeconds: 60 })
      ],
      tipsVi: [
        'Sử dụng mức tạ nhẹ hơn Thứ Hai và Thứ Tư khoảng 20–30%.',
        'Hôm nay không phải ngày tăng tạ — là ngày luyện lại tư thế cho thật đúng.'
      ]
    },

    // ── 일 — THÂN TRÊN + BỤNG ─────────────────────────────
    {
      dow: 7, nameVi: 'Chủ Nhật', titleVi: 'THÂN TRÊN + BỤNG', focusVi: 'Ngực · Lưng · Vai · Bụng', rest: false,
      stairs: stairsBlock(),
      treadmill: treadmillBlock(),
      exercises: [
        EX(7, 'chest_press', { sets: 3, repsLabelVi: '10–12 lần', repMin: 10, repMax: 12 }),
        EX(7, 'lat_pulldown', { sets: 3, repsLabelVi: '10–12 lần', repMin: 10, repMax: 12 }),
        EX(7, 'seated_row', { sets: 2, repsLabelVi: '10–12 lần', repMin: 10, repMax: 12 }),
        EX(7, 'shoulder_press', { sets: 2, repsLabelVi: '10 lần', repMin: 10, repMax: 10 }),
        EX(7, 'side_lateral_raise', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15 }),
        EX(7, 'plank', { sets: 2, repsLabelVi: '20–30 giây', repMin: null, repMax: null, timeSeconds: 25 }),
        EX(7, 'situp_roman', { sets: 2, repsLabelVi: '15 lần', repMin: 15, repMax: 15, restSeconds: 60, altMachineIds: ['stretching_zone'] }),
        EX(7, 'arm_curl', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15, restSeconds: 60 })
      ],
      tipsVi: [
        'Plank tập trên thảm ở khu giãn cơ. Nếu quá khó, có thể đặt đầu gối xuống thảm.',
        'Ghế gập bụng để ở độ dốc thấp nhất. Nếu lưng dưới đau thì bỏ bài này.'
      ]
    }
  ];

  /* ============================================================
   * PERIOD_DAY — 생리 중 대체 루틴 (ROUTINE.periodDay)
   * 계단 대신 러닝머신 아주 천천히 15분, 전 종목 2세트 (평소 무게의 40~50%).
   * 복압이 크게 걸리는 종목(핵스쿼트·레그프레스·파워스쿼트·플랭크·힙쓰러스트)은 제외.
   * dow: 0 → 운동 id 는 'd0_' 접두사라 기존 id 와 겹치지 않는다.
   * ============================================================ */
  const PERIOD_DAY = {
    dow: 0,
    nameVi: 'Ngày đèn đỏ',
    titleVi: 'CHẾ ĐỘ NHẸ NHÀNG',
    focusVi: 'Vận động nhẹ, giữ thói quen',
    rest: false,
    periodMode: true,
    stairs: null,
    treadmill: {
      minutes: 15,
      phases: [
        { from: 0, to: 2, textVi: 'Đi thật chậm để khởi động' },
        { from: 2, to: 13, textVi: 'Đi bộ rất chậm 2.5–3.5 km/h, độ dốc 0%' },
        { from: 13, to: 15, textVi: 'Giảm tốc độ và thả lỏng trong 2 phút cuối' }
      ],
      rulesVi: [
        'Hôm nay bỏ máy leo cầu thang, chỉ đi bộ thật chậm trên máy chạy bộ.',
        'Phải nói chuyện được thoải mái trong lúc đi. Nếu thấy mệt, giảm tốc độ ngay.',
        'Không chỉnh độ dốc.',
        'Nếu bụng đau hoặc thấy chóng mặt, dừng lại và ngồi nghỉ.'
      ]
    },
    exercises: [
      EX(0, 'lat_pulldown', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15, restSeconds: 75, noteVi: 'Dùng khoảng 40–50% mức tạ bình thường.' }),
      EX(0, 'chest_press', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15, restSeconds: 75, noteVi: 'Dùng khoảng 40–50% mức tạ bình thường.' }),
      EX(0, 'seated_row', { sets: 2, repsLabelVi: '12–15 lần', repMin: 12, repMax: 15, restSeconds: 75, noteVi: 'Dùng khoảng 40–50% mức tạ bình thường.' }),
      EX(0, 'side_lateral_raise', { sets: 2, repsLabelVi: '15 lần', repMin: 15, repMax: 15, restSeconds: 60, noteVi: 'Tạ thật nhẹ, chỉ cần cảm nhận cơ vai.' }),
      EX(0, 'arm_curl', { sets: 2, repsLabelVi: '15 lần', repMin: 15, repMax: 15, restSeconds: 60, noteVi: 'Tạ thật nhẹ, làm chậm và đều.' }),
      EX(0, 'leg_extension', { sets: 2, repsLabelVi: '15 lần', repMin: 15, repMax: 15, restSeconds: 60, noteVi: 'Hôm nay tập thật nhẹ, chỉ để máu lưu thông.' }),
      EX(0, 'seated_leg_curl', { sets: 2, repsLabelVi: '15 lần', repMin: 15, repMax: 15, restSeconds: 60, noteVi: 'Hôm nay tập thật nhẹ, chỉ để máu lưu thông.' })
    ],
    tipsVi: [
      'Nếu bụng đau, chỉ cần ra khu giãn cơ (thảm) giãn vùng chậu thôi cũng được tính là đã đi tập.',
      'Nếu thấy chóng mặt hoặc mệt hơn bình thường, dừng ngay và uống nước.',
      'Thời gian này không cố tăng mức tạ. Đến phòng tập được là đã đủ tốt rồi.',
      'Hôm nay bỏ qua các máy chân gây nhiều áp lực lên bụng: Hack Squat, Leg Press, Power Squat, Hip Thrust và cả Plank.'
    ]
  };

  // 인덱스 — 요일 루틴 + 생리 중 대체 루틴 전부 포함
  const ALL_DAYS = DAYS.concat([PERIOD_DAY]);

  const EX_BY_ID = {};
  for (const d of ALL_DAYS) {
    for (const e of d.exercises) EX_BY_ID[e.id] = e;
  }

  window.ROUTINE = {
    days: DAYS,
    periodDay: PERIOD_DAY,

    forDow(dow) {
      if (dow === 0) return PERIOD_DAY;
      return DAYS.find(d => d.dow === dow) || null;
    },

    exerciseById(id) {
      return EX_BY_ID[id] || null;
    },

    exercisesUsing(machineId) {
      const out = [];
      for (const d of ALL_DAYS) {
        for (const e of d.exercises) {
          if (e.machineId === machineId || e.altMachineIds.includes(machineId)) out.push(e);
        }
      }
      return out;
    },

    // ── Cách chọn mức tạ (txt 원문) ─────────────────────────
    weightRulesVi: [
      'Mức tạ phù hợp là mức có thể thực hiện đúng tư thế từ 10–15 lần.',
      'Những lần cuối hơi khó.',
      'Sau khi hoàn thành vẫn có thể làm thêm khoảng 3 lần.',
      'Không cần tập đến mức không thể làm thêm một lần nào.',
      'Trước hiệp đầu tiên, tập thử 8 lần với mức tạ nhẹ nhất.',
      'Nghỉ từ 60–90 giây giữa các hiệp. Hack Squat và Leg Press nghỉ tối đa khoảng 90 giây.'
    ],

    // ── 진행 규칙 ───────────────────────────────────────────
    progressionRulesVi: [
      'Khi nâng tạ dùng khoảng 1–2 giây, khi hạ xuống dùng khoảng 2–3 giây.',
      'Nếu hai buổi liên tiếp hoàn thành đủ số lần mục tiêu một cách thoải mái với cùng mức tạ, buổi sau chỉ tăng lên đúng một nấc.',
      'Trong 2 tuần đầu tiên, tất cả các bài chỉ tập 2 hiệp. Từ tuần thứ 3 mới tăng bài thứ nhất và thứ hai lên 3 hiệp.'
    ],

    // ── Quy tắc an toàn (txt 원문 5개 + 기록 습관) ──────────
    safetyRulesVi: [
      'Dừng bài tập ngay nếu bị đau nhói ở đầu gối, lưng, vai hoặc cổ.',
      'Dừng bài tập ngay nếu bị chóng mặt hoặc buồn nôn.',
      'Dừng bài tập ngay nếu bị tê tay hoặc tê chân.',
      'Dừng bài tập ngay nếu bị khó thở bất thường.',
      'Dừng bài tập ngay nếu đau khớp tăng dần qua từng lần tập.',
      'Sau mỗi buổi nên ghi lại tên máy, vị trí ghế, mức tạ và số lần. Ví dụ: Leg Press – ghế số 3 – 10kg – 12 lần × 2 hiệp – mức độ vừa.'
    ],

    // ── 전체 구조 규칙 ──────────────────────────────────────
    generalRulesVi: [
      'Mỗi buổi khoảng 90–100 phút: 10 phút máy leo cầu thang → 60–70 phút tập máy → 20 phút đi bộ nhẹ trên máy chạy bộ.',
      'Tập 6 ngày mỗi tuần, nghỉ vào Thứ Năm.',
      'Trong 2 tuần đầu tiên, tất cả các bài chỉ tập 2 hiệp.',
      'Máy leo cầu thang chỉ là khởi động (mức 1–3), không cần tập thật nặng.',
      'Trong 4 tuần đầu, máy chạy bộ chỉ đi bộ nhanh 4.0–5.2 km/h, độ dốc 0–2%, không cần chạy.',
      'Cơ bắp mỏi là bình thường, nhưng nếu khớp gối, lưng hoặc vai đau nhói thì phải dừng ngay.'
    ]
  };

})();

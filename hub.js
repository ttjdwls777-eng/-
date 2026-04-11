(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const starVal = document.getElementById("starVal");
  const rankVal = document.getElementById("rankVal");
  const levelVal = document.getElementById("levelVal");
  const bonusVal = document.getElementById("bonusVal");

  const toast = document.getElementById("toast");
  const menuOverlay = document.getElementById("menuOverlay");
  const menuBtn = document.getElementById("menuBtn");
  const resetBtn = document.getElementById("resetBtn");
  const nameMenuBtn = document.getElementById("nameMenuBtn");
  const bgmBtn = document.getElementById("bgmBtn");
  const startBtn = document.getElementById("startBtn");
  const upgradeBtn = document.getElementById("upgradeBtn");

  const tabPlay = document.getElementById("tabPlay");
  const tabName = document.getElementById("tabName");
  const tabShop = document.getElementById("tabShop");
  const tabBoard = document.getElementById("tabBoard");
  const tabWeeklyBoard = document.getElementById("tabWeeklyBoard");
  const playSection = document.getElementById("playSection");
  const nameSection = document.getElementById("nameSection");
  const shopSection = document.getElementById("shopSection");
  const boardSection = document.getElementById("boardSection");
  const weeklyBoardSection = document.getElementById("weeklyBoardSection");

  const playerNameText = document.getElementById("playerNameText");
  const nameMenuCurrentText = document.getElementById("nameMenuCurrentText");
  const menuStarText = document.getElementById("menuStarText");
  const bestRankText = document.getElementById("bestRankText");
  const menuLevelText = document.getElementById("menuLevelText");

  const shopLevelText = document.getElementById("shopLevelText");
  const shopStarText = document.getElementById("shopStarText");
  const shopBonusText = document.getElementById("shopBonusText");
  const upgradeCostText = document.getElementById("upgradeCostText");

  const lbList = document.getElementById("lbList");
  const lbMode = document.getElementById("lbMode");
  const wlbList = document.getElementById("wlbList");
  const wlbMode = document.getElementById("wlbMode");
  const weeklyResetText = document.getElementById("weeklyResetText");
  const tabPrevWeeklyBoard = document.getElementById("tabPrevWeeklyBoard");
  const prevWeeklyBoardSection = document.getElementById("prevWeeklyBoardSection");
  const pwlbList = document.getElementById("pwlbList");
  const pwlbMode = document.getElementById("pwlbMode");
  const prevWeeklyText = document.getElementById("prevWeeklyText");

  const previewLv10 = document.getElementById("previewLv10");
  const previewLv20 = document.getElementById("previewLv20");
  const previewLv30 = document.getElementById("previewLv30");
  const previewLv40 = document.getElementById("previewLv40");
  const previewLv50 = document.getElementById("previewLv50");

  const nicknameModal = document.getElementById("nicknameModal");
  const nicknameInput = document.getElementById("nicknameInput");
  const nicknameSaveBtn = document.getElementById("nicknameSaveBtn");
  const reviveModal = document.getElementById("reviveModal");
  const reviveCancelBtn = document.getElementById("reviveCancelBtn");
  const reviveConfirmBtn = document.getElementById("reviveConfirmBtn");

  const W = canvas.width;
  const H = canvas.height;

  if (!document.getElementById("tabPrevWeeklyBoard") && tabWeeklyBoard && weeklyBoardSection && weeklyBoardSection.parentElement) {
    const prevTab = document.createElement("button");
    prevTab.id = "tabPrevWeeklyBoard";
    prevTab.className = tabWeeklyBoard.className;
    prevTab.textContent = "PREV WEEK";
    tabWeeklyBoard.insertAdjacentElement("afterend", prevTab);

    if (!document.getElementById("prevWeeklyBoardScopedStyle")) {
      const scopedStyle = document.createElement("style");
      scopedStyle.id = "prevWeeklyBoardScopedStyle";
      scopedStyle.textContent = ``;
      document.head.appendChild(scopedStyle);
    }

    const prevSection = document.createElement("section");
    prevSection.id = "prevWeeklyBoardSection";
    prevSection.className = weeklyBoardSection.className;
    prevSection.innerHTML = `
      <div class="menuCard">
        <h3>PREVIOUS WEEK TOP 7</h3>
        <p id="prevWeeklyText" class="subText">Previous week ranking snapshot will appear after the next weekly reset.</p>
        <div id="pwlbMode" class="modeText">Weekly snapshot</div>
        <ol id="pwlbList" class="leaderboardList"></ol>
      </div>
    `;
    weeklyBoardSection.insertAdjacentElement("afterend", prevSection);
  }

  document.body.style.touchAction = "none";

  let running = false;
  let last = 0;
  let timeAlive = 0;
  let spawnHazardTimer = 0;
  let spawnStarTimer = 0;
  let rankSyncTimer = 0;
  let runSessionActive = false;
  let revivePromptOpen = false;
  let deathPending = false;

  const _tabPrevWeeklyBoard = document.getElementById("tabPrevWeeklyBoard");
  const _prevWeeklyBoardSection = document.getElementById("prevWeeklyBoardSection");
  const _pwlbList = document.getElementById("pwlbList");
  const _pwlbMode = document.getElementById("pwlbMode");
  const _prevWeeklyText = document.getElementById("prevWeeklyText");


  function updateStartButton() {
    if (!startBtn) return;
    const canResume = runSessionActive && !running;
    startBtn.textContent = canResume ? "CONTINUE GAME" : "START GAME";
    startBtn.classList.toggle("is-resume", canResume);
    startBtn.classList.toggle("is-start", !canResume);
  }

  function openReviveModal() {
    return new Promise((resolve) => {
      if (nicknameModal) nicknameModal.style.display = "none";
      if (menuOverlay) menuOverlay.style.display = "none";
      reviveModal.style.display = "flex";

      const close = (accepted) => {
        reviveModal.style.display = "none";
        reviveCancelBtn.removeEventListener("click", onCancel);
        reviveConfirmBtn.removeEventListener("click", onConfirm);
        window.removeEventListener("keydown", onKey);
        resolve(accepted);
      };

      const onCancel = () => close(false);
      const onConfirm = () => close(true);
      const onKey = (e) => {
        if (e.key === "Escape") close(false);
        if (e.key === "Enter") close(true);
      };

      reviveCancelBtn.addEventListener("click", onCancel);
      reviveConfirmBtn.addEventListener("click", onConfirm);
      window.addEventListener("keydown", onKey);
      setTimeout(() => reviveConfirmBtn.focus(), 0);
    });
  }

  function openNicknameModal(initialValue = "") {
    return new Promise((resolve) => {
      nicknameModal.style.display = "flex";
      nicknameInput.value = initialValue || "";
      setTimeout(() => nicknameInput.focus(), 0);

      const submit = () => {
        const value = String(nicknameInput.value || "").trim();
        if (!value) return;
        nicknameModal.style.display = "none";
        nicknameSaveBtn.removeEventListener("click", submit);
        nicknameInput.removeEventListener("keydown", onKey);
        resolve(value);
      };

      const onKey = (e) => {
        if (e.key === "Enter") submit();
      };

      nicknameSaveBtn.addEventListener("click", submit);
      nicknameInput.addEventListener("keydown", onKey);
    });
  }

  let playerName = localStorage.getItem("xgp_v5_name") || "";

  const onlineConfig = window.XGP_ONLINE_CONFIG || { enabled: false, firebaseConfig: null };
  let useFirebase = false;
  let db = null;

  const WEEKLY_RESET_ANCHOR_UTC = Date.UTC(2026, 2, 28, 3, 0, 0, 0);
  const WEEKLY_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

  const save = {
    starCurrency: Number(localStorage.getItem("xgp_v5_star") || 0),
    level: Number(localStorage.getItem("xgp_v5_level") || 1),
    bestRank: Number(localStorage.getItem("xgp_v5_best_rank") || 0),
  };

  const run = {
    rankPoint: 0,
  };

  const player = { x: W * 0.5, y: H * 0.82, r: 22, speed: 430, moveX: 0 };
  const hazards = [];
  const yellowStars = [];
  const purpleStars = [];
  const particles = [];
  const popups = [];
  const bgStars = Array.from({length: 100}, () => ({
    x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 1, v: Math.random() * 18 + 9
  }));

  let pointerActive = false;
  let pointerOffsetX = 0;

  const powerups = [];
  let shieldTimer = 0;
  let magnetTimer = 0;
  let reviveUsedThisRun = false;

  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state !== "running") audioCtx.resume().catch(() => {});
  }
  function tone(freq = 440, dur = 0.08, type = "triangle", vol = 0.035, endFreq = null) {
    if (!audioCtx || audioCtx.state !== "running") return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(50, endFreq), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  function sfxPickup() { tone(820, 0.05, "triangle", 0.04, 1220); }
  function sfxPower() { tone(640, 0.07, "square", 0.04); setTimeout(() => tone(920, 0.08, "triangle", 0.035), 55); }
  function sfxLevel() { tone(520, 0.07, "square", 0.04); setTimeout(() => tone(780, 0.09, "square", 0.04), 75); }
  function sfxDeath() { tone(180, 0.1, "sawtooth", 0.05, 90); setTimeout(() => tone(120, 0.12, "square", 0.04, 60), 80); }
  function sfxRevive() { tone(420, 0.08, "triangle", 0.04); setTimeout(() => tone(620, 0.1, "triangle", 0.04), 60); }
  function sfxButton() { tone(560, 0.045, "triangle", 0.03, 760); }

  let bgmEnabled = true;
  let bgmTimer = null;
  let bgmStep = 0;
  const BGM_NOTES = {
    C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
    C5:523.25, D5:587.33, E5:659.25, G5:783.99, A5:880.00
  };
  const bgmLead = [
    "E5", null, "G5", "A5",  "G5", null, "E5", null,
    "D5", null, "E5", "G5",  "A5", null, "G5", null,
    "E5", null, "G5", "A5",  "C5", null, "D5", null,
    "E5", "G5", "A5", "G5",  "E5", null, "D5", null
  ];
  const bgmBass = [
    "C4", null, null, null,   "A4", null, null, null,
    "F4", null, null, null,   "G4", null, null, null,
    "C4", null, null, null,   "A4", null, null, null,
    "F4", null, null, null,   "G4", null, null, null
  ];
  const bgmChime = [
    null, "E4", null, null,   null, "E4", null, "G4",
    null, "D4", null, null,   null, "D4", null, "G4",
    null, "E4", null, null,   null, "E4", null, "A4",
    null, "G4", null, null,   null, "E4", null, "D4"
  ];

  function bgmTone(freq, dur = 0.16, type = "triangle", vol = 0.018) {
    if (!audioCtx || audioCtx.state !== "running" || !bgmEnabled) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function bgmKick() {
    if (!audioCtx || audioCtx.state !== "running" || !bgmEnabled) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.03, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  function bgmHat() {
    if (!audioCtx || audioCtx.state !== "running" || !bgmEnabled) return;
    const t = audioCtx.currentTime;
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.03, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    src.buffer = buffer;
    gain.gain.value = 0.01;
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(t);
  }

  function bgmTick() {
    if (!bgmEnabled) return;
    const i = bgmStep % 32;
    const lead = bgmLead[i];
    const bass = bgmBass[i];
    const chime = bgmChime[i];
    if (i % 8 === 0) bgmKick();
    if (i % 4 === 2) bgmHat();
    if (lead) bgmTone(BGM_NOTES[lead], 0.13, "triangle", 0.022);
    if (bass) bgmTone(BGM_NOTES[bass], 0.20, "sine", 0.015);
    if (chime) bgmTone(BGM_NOTES[chime], 0.09, "square", 0.012);
    bgmStep++;
    bgmTimer = setTimeout(bgmTick, 170);
  }

  function startBGM() {
    ensureAudio();
    if (!bgmEnabled || bgmTimer) return;
    bgmStep = 0;
    bgmTick();
    if (bgmBtn) bgmBtn.textContent = "BGM ON";
  }

  function stopBGM() {
    if (bgmTimer) {
      clearTimeout(bgmTimer);
      bgmTimer = null;
    }
    if (bgmBtn) bgmBtn.textContent = bgmEnabled ? "BGM ON" : "BGM OFF";
  }

  function syncBGMButton() {
    if (!bgmBtn) return;
    bgmBtn.textContent = bgmEnabled ? "BGM ON" : "BGM OFF";
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 950);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function distance(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function circleHit(a, b) { return distance(a.x, a.y, b.x, b.y) <= (a.r + b.r); }

  function getRankBonusPercent() {
    return Math.max(0, (save.level - 1) * 0.5);
  }

  function getYellowRankGain() {
    return (1000 + Math.max(0, save.level - 1) * 5) / 1000;
  }

  function formatGain(value) {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  }

  function getUpgradeCost() {
    return 50 + (save.level - 1) * 25;
  }

  function persistSave() {
    localStorage.setItem("xgp_v5_star", String(Math.floor(save.starCurrency)));
    localStorage.setItem("xgp_v5_level", String(save.level));
    localStorage.setItem("xgp_v5_best_rank", String(Math.floor(save.bestRank)));
  }

  function updateHUD() {
    starVal.textContent = Math.floor(save.starCurrency).toString();
    rankVal.textContent = Math.floor(run.rankPoint).toString();
    levelVal.textContent = save.level.toString();
    bonusVal.textContent = getRankBonusPercent().toFixed(1) + "%";
    playerNameText.textContent = playerName;
    if (nameMenuCurrentText) nameMenuCurrentText.textContent = playerName;
    menuStarText.textContent = Math.floor(save.starCurrency).toString();
    bestRankText.textContent = Math.floor(save.bestRank).toString();
    menuLevelText.textContent = save.level.toString();
    shopLevelText.textContent = save.level.toString();
    shopStarText.textContent = Math.floor(save.starCurrency).toString();
    shopBonusText.textContent = getRankBonusPercent().toFixed(1) + "%";
    upgradeCostText.textContent = `${getUpgradeCost()} STAR`;
  }

  function switchTab(name) {
    playSection.classList.toggle("active", name === "play");
    nameSection.classList.toggle("active", name === "name");
    shopSection.classList.toggle("active", name === "shop");
    boardSection.classList.toggle("active", name === "board");
    if (weeklyBoardSection) weeklyBoardSection.classList.toggle("active", name === "weeklyBoard");
    if (_prevWeeklyBoardSection) _prevWeeklyBoardSection.classList.toggle("active", name === "prevWeeklyBoard");
    if (name === "shop") {
      requestAnimationFrame(() => renderShopPreviews());
    }
  }

  async function initFirebase() {
    if (!onlineConfig.enabled || !onlineConfig.firebaseConfig || !onlineConfig.firebaseConfig.projectId) {
      if (lbMode) lbMode.textContent = "Local mode";
      if (wlbMode) wlbMode.textContent = "Local mode";
      updateWeeklyResetNotice();
      return;
    }
    try {
      const [{ initializeApp }, { getFirestore, doc, getDoc, setDoc }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
      ]);
      const app = initializeApp(onlineConfig.firebaseConfig);
      db = { api: { getFirestore, doc, getDoc, setDoc }, store: getFirestore(app) };
      useFirebase = true;
      if (lbMode) lbMode.textContent = "Online mode";
      if (wlbMode) wlbMode.textContent = "Online mode";
      updateWeeklyResetNotice();
      await loadLeaderboard();
      await loadWeeklyLeaderboard();
    } catch (e) {
      console.error(e);
      if (lbMode) lbMode.textContent = "Local mode";
      if (wlbMode) wlbMode.textContent = "Local mode";
      updateWeeklyResetNotice();
    }
  }

  function spawnHazard() {
    const roll = Math.random();
    if (roll < 0.12) {
      hazards.push({
        type: "blackhole",
        x: rand(38, W - 38),
        y: -68,
        r: 24,
        visualR: 34,
        speed: rand(150, 190) + Math.min(70, timeAlive * 1.2),
        rot: rand(0, Math.PI * 2),
        spin: rand(-1.5, 1.5),
        pullRadius: 170,
        pullForce: 110,
      });
      return;
    }

    const type = Math.random() < 0.62 ? "meteor" : "planet";
    if (type === "meteor") {
      hazards.push({
        type,
        x: rand(28, W - 28),
        y: -40,
        r: 16,
        visualR: 22,
        speed: rand(220, 310) + Math.min(180, timeAlive * 3.2),
        rot: rand(0, Math.PI * 2),
        spin: rand(-3.5, 3.5),
      });
    } else {
      hazards.push({
        type,
        x: rand(34, W - 34),
        y: -58,
        r: 20,
        visualR: 28,
        speed: rand(170, 245) + Math.min(120, timeAlive * 2.3),
        rot: rand(0, Math.PI * 2),
        spin: rand(-2.2, 2.2),
        hue: Math.random() < 0.5 ? "purple" : "blue",
      });
    }
  }

  function spawnPowerup() {
    const type = Math.random() < 0.5 ? "shield" : "magnet";
    powerups.push({
      type,
      x: rand(28, W - 28),
      y: -30,
      r: 14,
      speed: rand(185, 220),
      bob: rand(0, Math.PI * 2),
    });
  }

  function spawnFallingStar() {
    const purple = Math.random() < (1 / 6);
    const obj = {
      x: rand(24, W - 24),
      y: -24,
      r: purple ? 12 : 11,
      speed: purple ? rand(185, 220) : rand(195, 250),
      rot: rand(0, Math.PI * 2),
      spin: rand(-4, 4),
      tw: rand(0, Math.PI * 2),
    };
    (purple ? purpleStars : yellowStars).push(obj);
  }

  function addPopup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 0.85, age: 0 });
  }

  function emitParticles(x, y, color, count, spread = 1) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: rand(-100, 100) * spread,
        vy: rand(-30, 85) * spread,
        size: rand(2, 5),
        life: rand(0.35, 0.9),
        age: 0,
        color,
      });
    }
  }

  function auraColorAt(t) {
    const colors = ["#ff5757", "#ffd84a", "#42ff72", "#4dd6ff", "#b25dff"];
    return colors[Math.floor((t * 7) % colors.length)];
  }

  function getPlayerAura() {
    if (save.level >= 50) return "rainbow";
    if (save.level >= 40) return "#42ff72";
    if (save.level >= 30) return "#b25dff";
    if (save.level >= 20) return "#ff5757";
    if (save.level >= 10) return "#ffd84a";
    return null;
  }

  function drawBackground(dt) {
    for (const s of bgStars) {
      s.y += s.v * dt;
      if (s.y > H + 4) {
        s.y = -4;
        s.x = Math.random() * W;
      }
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#dff6ff";
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }

  
  function drawShipModel(targetCtx, x, y, scale = 1, opts = {}) {
    const {
      tilt = 0,
      aura = null,
      extraColor = "#7be5ff",
      rainbow = false,
      compact = false,
      engineFlicker = 0,
      now = 0,
    } = opts;

    const c = targetCtx;
    c.save();
    c.translate(x, y);
    c.rotate(tilt);
    c.scale(scale, scale);

    const wingSpan = compact ? 28 : 31;
    const bodyLen = compact ? 45 : 50;
    const bodyHalf = compact ? 8.6 : 9.6;
    const flare = compact ? 16.8 : 18.6;
    const tailY = compact ? 27 : 30;
    const engineY = compact ? 21.5 : 24;
    const flameY = compact ? 41 : 46;

    if (aura) {
      c.save();
      c.globalCompositeOperation = "lighter";
      const ag = c.createRadialGradient(0, 8, 5, 0, 8, compact ? 42 : 48);
      if (rainbow) {
        ag.addColorStop(0, "rgba(255,87,87,.82)");
        ag.addColorStop(0.2, "rgba(255,216,74,.70)");
        ag.addColorStop(0.45, "rgba(66,255,114,.56)");
        ag.addColorStop(0.72, "rgba(77,214,255,.48)");
        ag.addColorStop(1, "rgba(178,93,255,0)");
      } else {
        ag.addColorStop(0, aura + "cc");
        ag.addColorStop(0.42, aura + "50");
        ag.addColorStop(1, aura + "00");
      }
      c.fillStyle = ag;
      c.beginPath();
      c.ellipse(0, 8, compact ? 27 : 31, compact ? 31 : 35, 0, 0, Math.PI * 2);
      c.fill();

      const ringStroke = rainbow ? c.createLinearGradient(-30, 0, 30, 0) : null;
      if (ringStroke) {
        ringStroke.addColorStop(0, "#ff5757");
        ringStroke.addColorStop(0.24, "#ffd84a");
        ringStroke.addColorStop(0.5, "#42ff72");
        ringStroke.addColorStop(0.76, "#4dd6ff");
        ringStroke.addColorStop(1, "#b25dff");
        c.strokeStyle = ringStroke;
      } else {
        c.strokeStyle = aura + "88";
      }
      c.lineWidth = compact ? 1.8 : 2.2;
      c.beginPath();
      c.ellipse(0, 9, compact ? 21 : 24, compact ? 29 : 33, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    c.save();
    c.globalCompositeOperation = "lighter";
    const underGlow = c.createRadialGradient(0, 14, 4, 0, 14, compact ? 34 : 38);
    underGlow.addColorStop(0, "rgba(155,244,255,.34)");
    underGlow.addColorStop(0.45, "rgba(91,184,255,.18)");
    underGlow.addColorStop(1, "rgba(91,184,255,0)");
    c.fillStyle = underGlow;
    c.beginPath();
    c.ellipse(0, 14, compact ? 18 : 21, compact ? 25 : 28, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.save();
    c.globalCompositeOperation = "lighter";
    const rimGlow = c.createLinearGradient(0, -bodyLen, 0, tailY + 8);
    rimGlow.addColorStop(0, "rgba(255,255,255,.65)");
    rimGlow.addColorStop(0.4, "rgba(125,235,255,.32)");
    rimGlow.addColorStop(1, "rgba(125,235,255,0)");
    c.strokeStyle = rimGlow;
    c.lineWidth = compact ? 1.5 : 1.8;
    c.beginPath();
    c.moveTo(0, -bodyLen + 2);
    c.lineTo(9, -22);
    c.lineTo(6, tailY - 5);
    c.lineTo(0, tailY + 6);
    c.lineTo(-6, tailY - 5);
    c.lineTo(-9, -22);
    c.closePath();
    c.stroke();
    c.restore();

    const outerWing = c.createLinearGradient(-wingSpan, 0, wingSpan, 0);
    outerWing.addColorStop(0, "#061325");
    outerWing.addColorStop(0.2, "#153759");
    outerWing.addColorStop(0.5, "#8edfff");
    outerWing.addColorStop(0.8, "#153759");
    outerWing.addColorStop(1, "#061325");
    c.fillStyle = outerWing;
    c.beginPath();
    c.moveTo(-wingSpan, 8);
    c.lineTo(-9.5, -10.5);
    c.lineTo(-5.2, 5.8);
    c.lineTo(-18.8, 21.8);
    c.lineTo(-27.5, 19.2);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(wingSpan, 8);
    c.lineTo(9.5, -10.5);
    c.lineTo(5.2, 5.8);
    c.lineTo(18.8, 21.8);
    c.lineTo(27.5, 19.2);
    c.closePath();
    c.fill();

    const innerWing = c.createLinearGradient(-wingSpan, 0, wingSpan, 0);
    innerWing.addColorStop(0, "#123e6f");
    innerWing.addColorStop(0.18, "#2d86bf");
    innerWing.addColorStop(0.5, "#f4feff");
    innerWing.addColorStop(0.82, "#3ca5e8");
    innerWing.addColorStop(1, "#123e6f");
    c.fillStyle = innerWing;
    c.beginPath();
    c.moveTo(-wingSpan + 2.5, 9.5);
    c.lineTo(-11.4, -14.2);
    c.lineTo(-2.8, 4.6);
    c.lineTo(-12.3, 15.6);
    c.lineTo(-22.8, 16.8);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(wingSpan - 2.5, 9.5);
    c.lineTo(11.4, -14.2);
    c.lineTo(2.8, 4.6);
    c.lineTo(12.3, 15.6);
    c.lineTo(22.8, 16.8);
    c.closePath();
    c.fill();

    c.fillStyle = "rgba(6,20,36,.95)";
    c.beginPath();
    c.moveTo(-23.2, 8.7); c.lineTo(-14.6, 0.7); c.lineTo(-9.6, 8.5); c.lineTo(-17.8, 12.7); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(23.2, 8.7); c.lineTo(14.6, 0.7); c.lineTo(9.6, 8.5); c.lineTo(17.8, 12.7); c.closePath();
    c.fill();

    c.strokeStyle = "rgba(181,242,255,.62)";
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(-24.5, 14.2); c.lineTo(-11.5, -5.6); c.lineTo(-7.2, 6.8); c.stroke();
    c.beginPath(); c.moveTo(24.5, 14.2); c.lineTo(11.5, -5.6); c.lineTo(7.2, 6.8); c.stroke();

    const bodyShadow = c.createLinearGradient(0, -44, 0, 34);
    bodyShadow.addColorStop(0, "#071626");
    bodyShadow.addColorStop(0.5, "#0e2944");
    bodyShadow.addColorStop(1, "#060f1a");
    c.fillStyle = bodyShadow;
    c.beginPath();
    c.moveTo(0, -45);
    c.lineTo(flare, -14);
    c.lineTo(bodyHalf + 3.5, 14);
    c.lineTo(7.5, tailY - 2);
    c.lineTo(0, 35);
    c.lineTo(-7.5, tailY - 2);
    c.lineTo(-bodyHalf - 3.5, 14);
    c.lineTo(-flare, -14);
    c.closePath();
    c.fill();

    const bodyCore = c.createLinearGradient(0, -43, 0, 31);
    bodyCore.addColorStop(0, "#ffffff");
    bodyCore.addColorStop(0.1, "#effbff");
    bodyCore.addColorStop(0.34, "#b8f3ff");
    bodyCore.addColorStop(0.68, "#53a9ee");
    bodyCore.addColorStop(1, "#123b67");
    c.fillStyle = bodyCore;
    c.beginPath();
    c.moveTo(0, -41.5);
    c.lineTo(bodyHalf, -17);
    c.lineTo(bodyHalf - 1.2, 15.5);
    c.lineTo(5.8, 28.5);
    c.lineTo(0, 31);
    c.lineTo(-5.8, 28.5);
    c.lineTo(-bodyHalf + 1.2, 15.5);
    c.lineTo(-bodyHalf, -17);
    c.closePath();
    c.fill();

    const spine = c.createLinearGradient(0, -38, 0, 23);
    spine.addColorStop(0, "rgba(255,255,255,.95)");
    spine.addColorStop(0.5, "rgba(173,246,255,.7)");
    spine.addColorStop(1, "rgba(80,179,255,.12)");
    c.fillStyle = spine;
    c.beginPath();
    c.moveTo(0, -38.2); c.lineTo(4.9, -29); c.lineTo(2.2, 18.5); c.lineTo(0, 23.6); c.lineTo(-2.2, 18.5); c.lineTo(-4.9, -29); c.closePath();
    c.fill();

    const noseDark = c.createLinearGradient(0, -bodyLen, 0, -22);
    noseDark.addColorStop(0, "#06111d");
    noseDark.addColorStop(1, "#123f69");
    c.fillStyle = noseDark;
    c.beginPath();
    c.moveTo(0, -bodyLen); c.lineTo(7.6, -28.5); c.lineTo(0, -33.6); c.lineTo(-7.6, -28.5); c.closePath();
    c.fill();

    const noseLight = c.createLinearGradient(0, -bodyLen, 0, -22);
    noseLight.addColorStop(0, "#ffffff");
    noseLight.addColorStop(0.28, "#9cefff");
    noseLight.addColorStop(1, "#2a6ea8");
    c.fillStyle = noseLight;
    c.beginPath();
    c.moveTo(0, -bodyLen); c.lineTo(5.6, -29.8); c.lineTo(0, -35.2); c.lineTo(-5.6, -29.8); c.closePath();
    c.fill();

    const canopy = c.createLinearGradient(0, -30, 0, 4);
    canopy.addColorStop(0, "#fdffff");
    canopy.addColorStop(0.24, "#9fefff");
    canopy.addColorStop(0.6, "#236eaa");
    canopy.addColorStop(1, "#071727");
    c.fillStyle = canopy;
    c.beginPath();
    c.ellipse(0, -13.5, 5.3, 16.3, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(255,255,255,.75)";
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, -27.4); c.lineTo(0, 1.8); c.stroke();
    c.beginPath(); c.moveTo(-3.8, -9.8); c.lineTo(3.8, -9.8); c.stroke();

    c.fillStyle = "rgba(255,255,255,.88)";
    c.beginPath();
    c.ellipse(-1.8, -18.6, 1.8, 6, -0.34, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = "rgba(255,255,255,.78)";
    c.lineWidth = 0.95;
    c.beginPath(); c.moveTo(-7.8, -0.8); c.lineTo(-2.9, 8.2); c.lineTo(-7.6, 19.4); c.stroke();
    c.beginPath(); c.moveTo(7.8, -0.8); c.lineTo(2.9, 8.2); c.lineTo(7.6, 19.4); c.stroke();
    c.beginPath(); c.moveTo(-6.1, 7.5); c.lineTo(6.1, 7.5); c.strokeStyle = "rgba(145,234,255,.55)"; c.stroke();

    c.strokeStyle = "rgba(109,220,255,.35)";
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(-9.2, 11); c.lineTo(-3.8, 15.8); c.stroke();
    c.beginPath(); c.moveTo(9.2, 11); c.lineTo(3.8, 15.8); c.stroke();

    c.fillStyle = "#0b243d";
    c.beginPath();
    c.moveTo(-15.6, 17.5); c.lineTo(-8.8, 21.2); c.lineTo(-7.7, 31.8); c.lineTo(-13.4, 29.5); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(15.6, 17.5); c.lineTo(8.8, 21.2); c.lineTo(7.7, 31.8); c.lineTo(13.4, 29.5); c.closePath();
    c.fill();

    c.fillStyle = "#0d2035";
    c.beginPath();
    c.moveTo(-5.1, 22.3); c.lineTo(-1.4, 18.8); c.lineTo(-6.5, 18.9); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(5.1, 22.3); c.lineTo(6.5, 18.9); c.lineTo(1.4, 18.8); c.closePath();
    c.fill();

    const engineCowl = c.createLinearGradient(-13, engineY, 13, engineY);
    engineCowl.addColorStop(0, "#def8ff");
    engineCowl.addColorStop(0.5, "#89ecff");
    engineCowl.addColorStop(1, "#def8ff");
    c.fillStyle = engineCowl;
    c.beginPath(); c.roundRect(-10.4, engineY - 1.1, 6.3, 8.2, 1.8); c.fill();
    c.beginPath(); c.roundRect(4.1, engineY - 1.1, 6.3, 8.2, 1.8); c.fill();

    c.fillStyle = "#0d2238";
    c.beginPath(); c.roundRect(-9.2, engineY, 3.9, 5.5, 1.2); c.fill();
    c.beginPath(); c.roundRect(5.3, engineY, 3.9, 5.5, 1.2); c.fill();

    c.save();
    c.globalCompositeOperation = "lighter";
    c.fillStyle = "rgba(123,229,255,.95)";
    c.beginPath(); c.arc(-13.8, 10.4, 2.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,110,100,.95)";
    c.beginPath(); c.arc(13.8, 10.4, 2.2, 0, Math.PI * 2); c.fill();
    c.restore();

    const accentStroke = rainbow ? c.createLinearGradient(-16, 0, 16, 0) : null;
    if (accentStroke) {
      accentStroke.addColorStop(0, "#ff5757");
      accentStroke.addColorStop(0.25, "#ffd84a");
      accentStroke.addColorStop(0.5, "#42ff72");
      accentStroke.addColorStop(0.75, "#4dd6ff");
      accentStroke.addColorStop(1, "#b25dff");
      c.strokeStyle = accentStroke;
    } else {
      c.strokeStyle = extraColor;
    }
    c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-11.6, 0.4); c.lineTo(-3.5, 9.1); c.stroke();
    c.beginPath(); c.moveTo(11.6, 0.4); c.lineTo(3.5, 9.1); c.stroke();
    c.beginPath(); c.moveTo(-7.2, 27.2); c.lineTo(7.2, 27.2); c.strokeStyle = "rgba(123,229,255,.35)"; c.lineWidth = 1.2; c.stroke();

    c.save();
    c.globalCompositeOperation = "lighter";
    c.strokeStyle = "rgba(135,245,255,.55)";
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(-18.5, 3.8); c.lineTo(-29.6, 9.5); c.lineTo(-19.6, 14.5); c.stroke();
    c.beginPath();
    c.moveTo(18.5, 3.8); c.lineTo(29.6, 9.5); c.lineTo(19.6, 14.5); c.stroke();
    c.restore();

    const flick = engineFlicker;
    const outerPlume = c.createLinearGradient(0, engineY + 1, 0, flameY);
    outerPlume.addColorStop(0, "rgba(255,255,235,.98)");
    outerPlume.addColorStop(0.24, "rgba(150,255,255,.92)");
    outerPlume.addColorStop(0.58, "rgba(74,188,255,.84)");
    outerPlume.addColorStop(1, "rgba(44,113,255,0)");
    c.fillStyle = outerPlume;
    c.beginPath();
    c.moveTo(-6.4, flameY + flick);
    c.lineTo(-0.4, engineY + 0.8);
    c.lineTo(-10.8, engineY + 0.8);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(6.4, flameY + flick);
    c.lineTo(10.8, engineY + 0.8);
    c.lineTo(0.4, engineY + 0.8);
    c.closePath();
    c.fill();

    const corePlume = c.createLinearGradient(0, engineY + 1, 0, flameY);
    corePlume.addColorStop(0, "rgba(255,255,255,.98)");
    corePlume.addColorStop(0.45, "rgba(170,255,255,.92)");
    corePlume.addColorStop(1, "rgba(93,210,255,0)");
    c.fillStyle = corePlume;
    c.beginPath();
    c.moveTo(0, flameY - 4 + flick * 0.8);
    c.lineTo(3.9, engineY + 2.4);
    c.lineTo(-3.9, engineY + 2.4);
    c.closePath();
    c.fill();

    c.fillStyle = "rgba(255,176,74,.95)";
    c.beginPath(); c.moveTo(-4.7, flameY - 8 + flick * 0.58); c.lineTo(-2.1, engineY + 3); c.lineTo(-6.8, engineY + 3); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(4.7, flameY - 8 + flick * 0.58); c.lineTo(6.8, engineY + 3); c.lineTo(2.1, engineY + 3); c.closePath(); c.fill();

    c.restore();
  }


  function drawPlayer(now) {
    const auraBase = getPlayerAura();
    const aura = auraBase === "rainbow" ? auraColorAt(now * 0.001) : auraBase;
    if (auraBase) {
      emitParticles(player.x, player.y + 26, aura, 1, 0.28);
    }
    const tilt = clamp(player.moveX * 0.24, -0.35, 0.35);
    const flick = Math.sin(now * 0.045) * 4.2;
    drawShipModel(ctx, player.x, player.y, 1, {
      tilt,
      aura,
      extraColor: "#7be5ff",
      rainbow: auraBase === "rainbow",
      compact: false,
      engineFlicker: flick,
      now,
    });
  }

  function drawMeteor(h) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rot);

    const trail = ctx.createRadialGradient(-6, -10, 4, -6, -10, 30);
    trail.addColorStop(0, "rgba(255,255,210,.75)");
    trail.addColorStop(0.35, "rgba(255,182,80,.45)");
    trail.addColorStop(1, "rgba(255,80,40,0)");
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.ellipse(-6, -12, 16, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, h.visualR);
    g.addColorStop(0, "#f8d3a0");
    g.addColorStop(0.45, "#b26436");
    g.addColorStop(1, "#552d18");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, h.visualR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3b1c10";
    ctx.beginPath(); ctx.arc(-6, -2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, 7, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -8, 3, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawPlanet(h) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rot);

    const base = h.hue === "purple"
      ? ["#f0dbff", "#b25dff", "#5b2694"]
      : ["#d6f0ff", "#66bdf8", "#22456f"];

    const g = ctx.createRadialGradient(-6, -8, 3, 0, 0, h.visualR + 6);
    g.addColorStop(0, base[0]);
    g.addColorStop(0.45, base[1]);
    g.addColorStop(1, base[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, h.visualR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, h.visualR + 9, 11, 0.3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-4, -2, h.visualR * 0.55, -0.8, 1.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(6, 3, h.visualR * 0.35, -1.1, 0.9); ctx.stroke();

    ctx.restore();
  }


  function drawBlackHole(h, now) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rot);

    const g = ctx.createRadialGradient(0, 0, 3, 0, 0, h.visualR + 10);
    g.addColorStop(0, "#000000");
    g.addColorStop(0.28, "#13051e");
    g.addColorStop(0.55, "#4f0c70");
    g.addColorStop(0.78, "#6f31bf");
    g.addColorStop(1, "rgba(111,49,191,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, h.visualR + 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(178,93,255,.85)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, h.visualR + 8, 15, 0.2 + Math.sin(now * 0.002) * 0.15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#030208";
    ctx.beginPath();
    ctx.arc(0, 0, h.visualR * 0.68, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawPowerup(p, now) {
    ctx.save();
    ctx.translate(p.x, p.y + Math.sin(now * 0.005 + p.bob) * 4);

    if (p.type === "shield") {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
      g.addColorStop(0, "#eafff4");
      g.addColorStop(0.55, "#49ffb7");
      g.addColorStop(1, "#0d8e67");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 8, Math.PI * 0.95, Math.PI * 0.05, true);
      ctx.stroke();
    } else {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
      g.addColorStop(0, "#fff9d9");
      g.addColorStop(0.55, "#ffd84a");
      g.addColorStop(1, "#b77b10");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(12, 0); ctx.lineTo(20, 0); ctx.stroke();
    }

    ctx.restore();
  }

  function drawStarObj(s, purple, now) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    const scale = 1 + Math.sin(now * 0.01 + s.tw) * 0.08;
    ctx.scale(scale, scale);

    if (purple) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + i * Math.PI / 5;
        const rad = i % 2 === 0 ? 14 : 6;
        const px = Math.cos(ang) * rad;
        const py = Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const g = ctx.createRadialGradient(0, -3, 2, 0, 0, 18);
      g.addColorStop(0, "#f0d8ff");
      g.addColorStop(0.55, "#b25dff");
      g.addColorStop(1, "#6d29c7");
      ctx.fillStyle = g;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#a348ff";
      ctx.fill();
    } else {
      ctx.rotate(-0.55);

      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createRadialGradient(-7, -1, 1, -2, 0, 27);
      glow.addColorStop(0, "rgba(255,250,210,.98)");
      glow.addColorStop(0.22, "rgba(255,235,150,.78)");
      glow.addColorStop(0.48, "rgba(255,212,82,.38)");
      glow.addColorStop(1, "rgba(255,176,48,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(-3, 1, 22, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      const moonG = ctx.createLinearGradient(-20, -18, 10, 18);
      moonG.addColorStop(0, "#fff9d7");
      moonG.addColorStop(0.3, "#ffe680");
      moonG.addColorStop(0.72, "#ffd200");
      moonG.addColorStop(1, "#f0b900");

      ctx.fillStyle = moonG;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#ffd84a";
      ctx.beginPath();
      ctx.moveTo(7.8, -15.2);
      ctx.bezierCurveTo(-5.8, -17.0, -16.2, -7.0, -16.0, 4.8);
      ctx.bezierCurveTo(-15.7, 16.2, -7.2, 21.6, 5.3, 18.2);
      ctx.bezierCurveTo(-0.6, 17.2, -5.0, 13.8, -6.5, 8.5);
      ctx.bezierCurveTo(-8.5, 1.6, -6.8, -6.4, -2.2, -11.8);
      ctx.bezierCurveTo(0.5, -14.9, 3.6, -16.0, 7.8, -15.2);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(225,178,0,.72)";
      ctx.beginPath();
      ctx.moveTo(4.1, 17.2);
      ctx.bezierCurveTo(-6.2, 19.6, -12.0, 14.7, -13.2, 4.8);
      ctx.bezierCurveTo(-12.0, 12.6, -6.0, 17.6, 2.6, 18.0);
      ctx.bezierCurveTo(3.4, 17.9, 3.9, 17.7, 4.1, 17.2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255,252,236,.95)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(5.8, -13.2);
      ctx.bezierCurveTo(-4.2, -14.5, -11.6, -6.9, -11.7, 3.2);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawShieldOrbit(now) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const pulse = 1 + Math.sin(now * 0.008) * 0.05;
    const orbitR = (player.r + 20) * pulse;

    const aura = ctx.createRadialGradient(player.x, player.y, player.r + 6, player.x, player.y, orbitR + 26);
    aura.addColorStop(0, "rgba(130,255,190,.10)");
    aura.addColorStop(0.5, "rgba(92,255,181,.08)");
    aura.addColorStop(1, "rgba(92,255,181,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(player.x, player.y, orbitR + 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(145,255,198,.32)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, orbitR + Math.sin(now * 0.01) * 2.5, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      const ang = now * 0.0042 + i * (Math.PI * 2 / 3);
      const sx = player.x + Math.cos(ang) * orbitR;
      const sy = player.y + Math.sin(ang) * (orbitR * 0.72);
      const rot = ang + Math.PI / 2;

      const orb = ctx.createRadialGradient(sx, sy, 1, sx, sy, 14);
      orb.addColorStop(0, "rgba(230,255,242,.9)");
      orb.addColorStop(0.45, "rgba(110,255,192,.38)");
      orb.addColorStop(1, "rgba(110,255,192,0)");
      ctx.fillStyle = orb;
      ctx.beginPath();
      ctx.arc(sx, sy, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot);
      ctx.scale(0.88, 0.88);

      const shieldGrad = ctx.createLinearGradient(0, -13, 0, 14);
      shieldGrad.addColorStop(0, "#f3fff8");
      shieldGrad.addColorStop(0.36, "#98ffd0");
      shieldGrad.addColorStop(0.72, "#35d897");
      shieldGrad.addColorStop(1, "#0d7a56");
      ctx.fillStyle = shieldGrad;
      ctx.shadowBlur = 14;
      ctx.shadowColor = "rgba(89,255,184,.55)";
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.bezierCurveTo(8, -11, 10, -4, 9, 2);
      ctx.bezierCurveTo(8, 8, 4, 13, 0, 15);
      ctx.bezierCurveTo(-4, 13, -8, 8, -9, 2);
      ctx.bezierCurveTo(-10, -4, -8, -11, 0, -13);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.92)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -8.5);
      ctx.lineTo(0, 9.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4.5, -1.2);
      ctx.quadraticCurveTo(0, 1.8, 4.5, -1.2);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  function drawMagnetField(now) {
    const pulse = 1 + Math.sin(now * 0.012) * 0.04;
    const baseR = 170 * pulse;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(player.x, player.y, player.r + 4, player.x, player.y, baseR + 42);
    glow.addColorStop(0, "rgba(255,240,160,.12)");
    glow.addColorStop(0.36, "rgba(255,216,74,.10)");
    glow.addColorStop(0.72, "rgba(255,178,64,.05)");
    glow.addColorStop(1, "rgba(255,178,64,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(player.x, player.y, baseR + 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = "round";

    for (let i = 0; i < 3; i++) {
      const ringR = baseR - i * 18 + Math.sin(now * 0.01 + i * 1.7) * 5;
      ctx.strokeStyle = i === 0
        ? "rgba(255,234,150,.34)"
        : i === 1
        ? "rgba(255,196,86,.24)"
        : "rgba(255,154,68,.18)";
      ctx.lineWidth = 3 - i * 0.6;
      ctx.beginPath();
      ctx.arc(player.x, player.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 6; i++) {
      const a = now * 0.0026 + i * (Math.PI / 3);
      const startR = player.r + 16 + Math.sin(now * 0.01 + i) * 3;
      const endR = baseR - 16 + Math.cos(now * 0.009 + i) * 6;
      const c1r = startR + (endR - startR) * 0.34;
      const c2r = startR + (endR - startR) * 0.72;

      const sx = player.x + Math.cos(a) * startR;
      const sy = player.y + Math.sin(a) * startR;
      const c1x = player.x + Math.cos(a + 0.42) * c1r;
      const c1y = player.y + Math.sin(a + 0.42) * c1r;
      const c2x = player.x + Math.cos(a - 0.36) * c2r;
      const c2y = player.y + Math.sin(a - 0.36) * c2r;
      const ex = player.x + Math.cos(a + 0.14) * endR;
      const ey = player.y + Math.sin(a + 0.14) * endR;

      ctx.strokeStyle = i % 2 === 0
        ? "rgba(255,222,120,.42)"
        : "rgba(255,170,84,.26)";
      ctx.lineWidth = i % 2 === 0 ? 2.4 : 1.7;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
      ctx.stroke();
    }

    for (let i = 0; i < 10; i++) {
      const a = now * 0.0038 + i * (Math.PI * 2 / 10);
      const orbR = baseR - 10 + Math.sin(now * 0.01 + i) * 8;
      const ox = player.x + Math.cos(a) * orbR;
      const oy = player.y + Math.sin(a) * orbR;
      const orb = ctx.createRadialGradient(ox, oy, 0.5, ox, oy, 8);
      orb.addColorStop(0, "rgba(255,248,205,.9)");
      orb.addColorStop(0.45, "rgba(255,208,98,.45)");
      orb.addColorStop(1, "rgba(255,208,98,0)");
      ctx.fillStyle = orb;
      ctx.beginPath();
      ctx.arc(ox, oy, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = 1 - (p.age / p.life);
      if (a <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }

  function drawPopups(dt) {
    ctx.save();
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.age += dt;
      p.y -= 30 * dt;
      const a = 1 - p.age / p.life;
      if (a <= 0) {
        popups.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function explodeHazard(h) {
    if (h.type === "meteor") {
      emitParticles(h.x, h.y, "#ff8d47", 26, 1.2);
      emitParticles(h.x, h.y, "#ffdc7b", 14, 1);
    } else if (h.type === "blackhole") {
      emitParticles(h.x, h.y, "#b25dff", 32, 1.25);
      emitParticles(h.x, h.y, "#4dd6ff", 18, 1.05);
      emitParticles(h.x, h.y, "#ffffff", 10, 0.85);
    } else {
      emitParticles(h.x, h.y, h.hue === "purple" ? "#b25dff" : "#62bfff", 30, 1.2);
      emitParticles(h.x, h.y, "#ffffff", 10, 0.8);
    }
  }

  function resetRun() {
    hazards.length = 0;
    yellowStars.length = 0;
    purpleStars.length = 0;
    powerups.length = 0;
    particles.length = 0;
    popups.length = 0;
    run.rankPoint = 0;
    timeAlive = 0;
    spawnHazardTimer = 0;
    spawnStarTimer = 0;
    rankSyncTimer = 0;
    shieldTimer = 0;
    magnetTimer = 0;
    reviveUsedThisRun = false;
    player.x = W * 0.5;
    player.moveX = 0;
    updateHUD();
  }

  function getWeeklySeasonInfo(now = new Date()) {
    const nowMs = now.getTime();
    const cycleIndex = Math.floor((nowMs - WEEKLY_RESET_ANCHOR_UTC) / WEEKLY_DURATION_MS);
    const startMs = WEEKLY_RESET_ANCHOR_UTC + (cycleIndex * WEEKLY_DURATION_MS);
    const endMs = startMs + WEEKLY_DURATION_MS;
    return {
      key: String(startMs),
      startMs,
      endMs,
      startDate: new Date(startMs),
      endDate: new Date(endMs),
    };
  }

  function formatKoreanResetDate(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const hh = String(date.getUTCHours() + 9).padStart(2, "0");
    const mm = String(date.getUTCMinutes()).padStart(2, "0");
    return `${y}-${m}-${d} ${hh}:${mm} KST`;
  }

  function updateWeeklyResetNotice() {
    if (!weeklyResetText) return;
    const season = getWeeklySeasonInfo();
    weeklyResetText.textContent = `This weekly ranking board resets automatically every Saturday at 12:00 noon. Current cycle ends at ${formatKoreanResetDate(season.endDate)}.`;
  }

  function normalizeRows(rows) {
    return Array.isArray(rows) ? rows.filter(r => r && r.name).map(r => ({
      name: String(r.name),
      score: Math.floor(Number(r.score) || 0)
    })).sort((a, b) => b.score - a.score) : [];
  }

  function renderLeaderboard(rows, targetList = lbList, limit = 20) {
    if (!targetList) return;
    targetList.innerHTML = "";
    normalizeRows(rows).slice(0, limit).forEach((r, i) => {
      const li = document.createElement("li");
      const crown = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
      li.innerHTML = `
        <span class="rankBadge">
          <span class="rankNum">${i + 1}</span>
          <span class="crown">${crown}</span>
          <span class="nameText">${r.name}</span>
        </span>
        <span class="scoreText">${Math.floor(r.score)}</span>
      `;
      targetList.appendChild(li);
    });
  }

  async function loadLeaderboard() {
    if (useFirebase && db) {
      const { doc, getDoc } = db.api;
      const snap = await getDoc(doc(db.store, "xgp", "leaderboard"));
      const rows = snap.exists() ? (snap.data().rows || []) : [];
      renderLeaderboard(rows, lbList, 20);
      return;
    }
    const rows = JSON.parse(localStorage.getItem("xgp_v5_local_lb") || "[]");
    renderLeaderboard(rows, lbList, 20);
  }

  function getLocalWeeklyLeaderboardPayload() {
    const season = getWeeklySeasonInfo();
    let payload = null;
    try {
      payload = JSON.parse(localStorage.getItem("xgp_v5_weekly_lb") || "null");
    } catch (e) {
      payload = null;
    }

    if (payload && payload.seasonKey && payload.seasonKey !== season.key) {
      const prevPayload = {
        seasonKey: payload.seasonKey,
        rows: Array.isArray(payload.rows) ? payload.rows : [],
        resetAt: payload.resetAt || season.startMs,
      };
      localStorage.setItem("xgp_v5_prev_weekly_lb", JSON.stringify(prevPayload));
      payload = null;
    }

    if (!payload || payload.seasonKey !== season.key || !Array.isArray(payload.rows)) {
      payload = { seasonKey: season.key, rows: [] };
      localStorage.setItem("xgp_v5_weekly_lb", JSON.stringify(payload));
    }
    return payload;
  }

  function getPreviousWeeklyLeaderboardPayload() {
    let payload = null;
    try {
      payload = JSON.parse(localStorage.getItem("xgp_v5_prev_weekly_lb") || "null");
    } catch (e) {
      payload = null;
    }
    if (!payload || !Array.isArray(payload.rows)) return { seasonKey: "", rows: [], resetAt: 0 };
    return payload;
  }

  function formatPrevWeeklyNotice(payload) {
    if (!payload || !payload.seasonKey) return "Previous week ranking snapshot will appear after the next weekly reset.";
    const start = new Date(Number(payload.seasonKey));
    const end = new Date(Number(payload.resetAt || 0));
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return "Previous week ranking snapshot.";
    return `Previous weekly ranking snapshot • ${formatKoreanResetDate(start)} ~ ${formatKoreanResetDate(end)}`;
  }

  async function loadWeeklyLeaderboard() {
    updateWeeklyResetNotice();
    const season = getWeeklySeasonInfo();
    if (useFirebase && db) {
      const { doc, getDoc, setDoc } = db.api;
      const ref = doc(db.store, "xgp", "leaderboard_weekly");
      const snap = await getDoc(ref);
      const data = snap.exists() ? (snap.data() || {}) : {};
      let rows = [];
      if (data.seasonKey === season.key) {
        rows = data.rows || [];
      } else {
        const previousRows = Array.isArray(data.rows) ? data.rows : [];
        if (previousRows.length) {
          await setDoc(doc(db.store, "xgp", "leaderboard_weekly_previous"), {
            seasonKey: data.seasonKey || "",
            rows: previousRows.slice(0, 100),
            resetAt: data.resetAt || season.startMs,
          });
        }
        await setDoc(ref, {
          seasonKey: season.key,
          rows: [],
          resetAt: season.endMs,
        });
        rows = [];
      }
      renderLeaderboard(rows, wlbList, 7);
      return;
    }
    const payload = getLocalWeeklyLeaderboardPayload();
    renderLeaderboard(payload.rows || [], wlbList, 7);
  }

  async function loadPreviousWeeklyLeaderboard() {
    if (useFirebase && db) {
      const { doc, getDoc } = db.api;
      const snap = await getDoc(doc(db.store, "xgp", "leaderboard_weekly_previous"));
      const data = snap.exists() ? (snap.data() || {}) : {};
      renderLeaderboard(data.rows || [], _pwlbList, 7);
      if (_prevWeeklyText) _prevWeeklyText.textContent = formatPrevWeeklyNotice(data);
      return;
    }
    const payload = getPreviousWeeklyLeaderboardPayload();
    renderLeaderboard(payload.rows || [], _pwlbList, 7);
    if (_prevWeeklyText) _prevWeeklyText.textContent = formatPrevWeeklyNotice(payload);
  }

  async function saveLeaderboard(score = 0) {
    const entry = { name: playerName, score: Math.floor(score) };

    if (useFirebase && db) {
      const { doc, getDoc, setDoc } = db.api;
      const ref = doc(db.store, "xgp", "leaderboard");
      const snap = await getDoc(ref);
      const rows = snap.exists() ? (snap.data().rows || []) : [];

      const idx = rows.findIndex(r => r.name === entry.name);
      if (idx >= 0) rows[idx].score = Math.max(rows[idx].score, entry.score);
      else rows.push(entry);

      rows.sort((a, b) => b.score - a.score);
      await setDoc(ref, { rows: rows.slice(0, 100) });
      await loadLeaderboard();
      await saveWeeklyLeaderboard(entry.score);
      return;
    }

    const rows = JSON.parse(localStorage.getItem("xgp_v5_local_lb") || "[]");
    const idx = rows.findIndex(r => r.name === entry.name);
    if (idx >= 0) rows[idx].score = Math.max(rows[idx].score, entry.score);
    else rows.push(entry);
    rows.sort((a, b) => b.score - a.score);
    localStorage.setItem("xgp_v5_local_lb", JSON.stringify(rows.slice(0, 100)));
    await loadLeaderboard();
    await saveWeeklyLeaderboard(entry.score);
  }

  async function saveWeeklyLeaderboard(score = 0) {
    const entry = { name: playerName, score: Math.floor(score) };
    const season = getWeeklySeasonInfo();

    if (useFirebase && db) {
      const { doc, getDoc, setDoc } = db.api;
      const ref = doc(db.store, "xgp", "leaderboard_weekly");
      const snap = await getDoc(ref);
      const data = snap.exists() ? (snap.data() || {}) : {};
      const rows = data.seasonKey === season.key ? (data.rows || []) : [];

      const idx = rows.findIndex(r => r.name === entry.name);
      if (idx >= 0) rows[idx].score = Math.max(rows[idx].score, entry.score);
      else rows.push(entry);

      rows.sort((a, b) => b.score - a.score);
      await setDoc(ref, {
        seasonKey: season.key,
        rows: rows.slice(0, 100),
        resetAt: season.endMs,
      });
      await loadWeeklyLeaderboard();
      return;
    }

    const payload = getLocalWeeklyLeaderboardPayload();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const idx = rows.findIndex(r => r.name === entry.name);
    if (idx >= 0) rows[idx].score = Math.max(rows[idx].score, entry.score);
    else rows.push(entry);
    rows.sort((a, b) => b.score - a.score);
    localStorage.setItem("xgp_v5_weekly_lb", JSON.stringify({
      seasonKey: season.key,
      rows: rows.slice(0, 100),
      resetAt: season.endMs,
    }));
    await loadWeeklyLeaderboard();
  }

  function buyUpgrade() {
    const cost = getUpgradeCost();
    if (save.starCurrency < cost) {
      showToast(`Need ${cost} STAR`);
      return;
    }
    save.starCurrency -= cost;
    save.level += 1;
    persistSave();
    updateHUD();
    emitParticles(player.x, player.y, "#7dd7ff", 22, 0.8);
    sfxLevel();
    showToast(`LEVEL UP ${save.level}`);
  }


  function canRevive() {
    return !reviveUsedThisRun && save.starCurrency >= 50;
  }

  function performRevive() {
    save.starCurrency -= 50;
    persistSave();
    reviveUsedThisRun = true;
    shieldTimer = 3.5;
    player.x = W * 0.5;
    player.moveX = 0;
    hazards.splice(0, hazards.length);
    powerups.splice(0, powerups.length);
    emitParticles(player.x, player.y, "#7dd7ff", 40, 1.2);
    sfxRevive();
    updateHUD();
    showToast("REVIVED -50 STAR");
  }

  async function requestRevive() {
    if (revivePromptOpen) return;
    if (!canRevive()) {
      deathPending = false;
      endRun();
      return;
    }

    revivePromptOpen = true;
    deathPending = true;
    running = false;
    stopBGM();
    if (menuOverlay) menuOverlay.style.display = "none";

    const accepted = await openReviveModal();

    revivePromptOpen = false;

    if (!accepted) {
      deathPending = false;
      endRun();
      return;
    }

    if (!canRevive()) {
      deathPending = false;
      endRun();
      return;
    }

    performRevive();
    deathPending = false;
    runSessionActive = true;
    running = true;
    last = 0;
    startBGM();
    updateStartButton();
  }

  function endRun() {
    if (!running && !runSessionActive && !deathPending) return;
    running = false;

    if (run.rankPoint > save.bestRank) {
      save.bestRank = Math.floor(run.rankPoint);
      persistSave();
      saveLeaderboard(run.rankPoint);
      showToast("NEW BEST RANK");
    } else {
      saveLeaderboard(run.rankPoint);
      showToast("RUN END");
    }

    updateHUD();
    switchTab("play");
    stopBGM();
    runSessionActive = false;
    deathPending = false;
    updateStartButton();
    menuOverlay.style.display = "flex";
  }

  
  function drawPreviewShip(canvas, auraColor, extraColor, rainbow = false) {
    if (!canvas) return;
    const pctx = canvas.getContext("2d");
    const cssW = canvas.clientWidth || Number(canvas.getAttribute("width")) || 150;
    const cssH = canvas.clientHeight || Number(canvas.getAttribute("height")) || 100;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, canvas.width, canvas.height);
    pctx.scale(dpr, dpr);

    drawShipModel(pctx, cssW * 0.5, cssH * 0.52, 0.78, {
      tilt: -0.08,
      aura: auraColor,
      extraColor,
      rainbow,
      compact: true,
      engineFlicker: 2.1,
    });
  }


  function renderShopPreviews() {
    drawPreviewShip(previewLv10, "#ffd84a", "#ffd84a");
    drawPreviewShip(previewLv20, "#ff5757", "#ff5757");
    drawPreviewShip(previewLv30, "#b25dff", "#b25dff");
    drawPreviewShip(previewLv40, "#42ff72", "#42ff72");
    drawPreviewShip(previewLv50, "#b25dff", "#b25dff", true);
  }


  function update(dt) {
    timeAlive += dt;
    shieldTimer = Math.max(0, shieldTimer - dt);
    magnetTimer = Math.max(0, magnetTimer - dt);

    if (!pointerActive) player.x += player.moveX * player.speed * dt;
    player.x = clamp(player.x, 30, W - 30);

    spawnHazardTimer += dt;
    spawnStarTimer += dt;
    rankSyncTimer += dt;

    const hazardInterval = Math.max(0.34, 0.82 - timeAlive * 0.0034);
    const starInterval = 0.43;
    const powerupInterval = 6.5;

    if (spawnHazardTimer >= hazardInterval) { spawnHazardTimer = 0; spawnHazard(); }
    if (spawnStarTimer >= starInterval) { spawnStarTimer = 0; spawnFallingStar(); }
    if (timeAlive > 2 && Math.floor((timeAlive - dt) / powerupInterval) !== Math.floor(timeAlive / powerupInterval)) spawnPowerup();
    if (rankSyncTimer >= 6) { rankSyncTimer = 0; loadLeaderboard(); }

    if (hazards.length > 42) hazards.shift();

    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      h.y += h.speed * dt;
      h.rot += h.spin * dt;

      if (h.type === "blackhole") {
        const dx = h.x - player.x;
        const dy = h.y - player.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        if (dist < h.pullRadius) {
          const f = (1 - dist / h.pullRadius) * (h.pullForce * dt);
          player.x += (dx / dist) * f;
        }
      }

      if (h.y > H + 80) {
        hazards.splice(i, 1);
        continue;
      }

      if (circleHit(player, h)) {
        if (shieldTimer > 0) {
          explodeHazard(h);
          hazards.splice(i, 1);
          shieldTimer = 0;
          sfxPower();
          showToast("SHIELD BLOCK");
          continue;
        }
        explodeHazard(h);
        hazards.splice(i, 1);
        sfxDeath();
        if (canRevive()) {
          requestRevive();
          return;
        }
        endRun();
        return;
      }
    }

    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.speed * dt;
      if (p.y > H + 50) {
        powerups.splice(i, 1);
        continue;
      }
      if (circleHit(player, p)) {
        if (p.type === "shield") {
          shieldTimer = 7;
          addPopup(p.x, p.y, "SHIELD", "#7dff9b");
        } else {
          magnetTimer = 10;
          addPopup(p.x, p.y, "MAGNET", "#ffe066");
        }
        emitParticles(p.x, p.y, p.type === "shield" ? "#7dff9b" : "#ffd84a", 18, 0.9);
        sfxPower();
        powerups.splice(i, 1);
      }
    }

    for (let i = yellowStars.length - 1; i >= 0; i--) {
      const s = yellowStars[i];
      s.y += s.speed * dt;
      s.rot += s.spin * dt;

      if (magnetTimer > 0) {
        const dx = player.x - s.x;
        const dy = player.y - s.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        if (dist < 170) {
          s.x += (dx / dist) * 360 * dt;
          s.y += (dy / dist) * 360 * dt;
        }
      }

      if (s.y > H + 50) { yellowStars.splice(i, 1); continue; }
      if (circleHit(player, s)) {
        const gain = getYellowRankGain();
        run.rankPoint += gain;
        emitParticles(s.x, s.y, "#ffd84a", 14, 0.7);
        addPopup(s.x, s.y, `+${formatGain(gain)} RANK`, "#ffd84a");
        sfxPickup();
        yellowStars.splice(i, 1);
        updateHUD();
      }
    }

    for (let i = purpleStars.length - 1; i >= 0; i--) {
      const s = purpleStars[i];
      s.y += s.speed * dt;
      s.rot += s.spin * dt;

      if (magnetTimer > 0) {
        const dx = player.x - s.x;
        const dy = player.y - s.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        if (dist < 170) {
          s.x += (dx / dist) * 360 * dt;
          s.y += (dy / dist) * 360 * dt;
        }
      }

      if (s.y > H + 50) { purpleStars.splice(i, 1); continue; }
      if (circleHit(player, s)) {
        save.starCurrency += 1;
        persistSave();
        emitParticles(s.x, s.y, "#b25dff", 16, 0.8);
        addPopup(s.x, s.y, "+1 STAR", "#d39cff");
        sfxPickup();
        purpleStars.splice(i, 1);
        updateHUD();
      }
    }
  }

  function draw(now, dt) {
    ctx.clearRect(0, 0, W, H);
    drawBackground(dt);

    for (const s of yellowStars) drawStarObj(s, false, now);
    for (const s of purpleStars) drawStarObj(s, true, now);
    for (const p of powerups) drawPowerup(p, now);
    for (const h of hazards) {
      if (h.type === "meteor") drawMeteor(h);
      else if (h.type === "blackhole") drawBlackHole(h, now);
      else drawPlanet(h);
    }

    drawParticles(dt);
    drawPlayer(now);

    if (shieldTimer > 0) {
      drawShieldOrbit(now);
    }

    if (magnetTimer > 0) {
      drawMagnetField(now);
    }

    drawPopups(dt);
  }

  function loop(now) {
    if (!last) last = now;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    if (running) update(dt);
    draw(now, dt);
    requestAnimationFrame(loop);
  }

  function setPointer(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    player.x = clamp(x - pointerOffsetX, 30, W - 30);
  }

  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    pointerActive = true;
    pointerOffsetX = x - player.x;
    setPointer(e.clientX);
  });
  window.addEventListener("mousemove", (e) => { if (pointerActive) setPointer(e.clientX); });
  window.addEventListener("mouseup", () => pointerActive = false);

  canvas.addEventListener("touchstart", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    pointerActive = true;
    pointerOffsetX = x - player.x;
    setPointer(e.touches[0].clientX);
  }, { passive: true });
  canvas.addEventListener("touchmove", (e) => { if (pointerActive) setPointer(e.touches[0].clientX); }, { passive: true });
  window.addEventListener("touchend", () => pointerActive = false, { passive: true });

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") player.moveX = -1;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") player.moveX = 1;
  });
  window.addEventListener("keyup", (e) => {
    if ((e.key === "ArrowLeft" || e.key.toLowerCase() === "a") && player.moveX < 0) player.moveX = 0;
    if ((e.key === "ArrowRight" || e.key.toLowerCase() === "d") && player.moveX > 0) player.moveX = 0;
  });


  function startRun() {
    ensureAudio();

    if (runSessionActive && !running) {
      menuOverlay.style.display = "none";
      running = true;
      last = 0;
      startBGM();
      updateStartButton();
      showToast("CONTINUE");
      return;
    }

    resetRun();
    runSessionActive = true;
    updateHUD();
    menuOverlay.style.display = "none";
    running = true;
    last = 0;
    startBGM();
    updateStartButton();
    showToast("START");
  }

  startBtn.addEventListener("click", startRun);
  upgradeBtn.addEventListener("click", () => { ensureAudio(); buyUpgrade(); });
  menuBtn.addEventListener("click", () => {
    if (!runSessionActive) return;
    running = false;
    stopBGM();
    switchTab("play");
    updateHUD();
    updateStartButton();
    menuOverlay.style.display = "flex";
  });
  resetBtn.addEventListener("click", () => {
    resetRun();
    runSessionActive = true;
    running = true;
    menuOverlay.style.display = "none";
    last = 0;
    startBGM();
    updateStartButton();
    showToast("RESET RUN");
  });
  if (bgmBtn) bgmBtn.addEventListener("click", () => {
    ensureAudio();
    bgmEnabled = !bgmEnabled;
    if (bgmEnabled && running) startBGM(); else stopBGM();
    syncBGMButton();
  });

  nameMenuBtn.addEventListener("click", async () => {
    ensureAudio();
    playerName = await openNicknameModal(playerName);
    localStorage.setItem("xgp_v5_name", playerName);
    updateHUD();
    showToast("NAME SAVED");
  });

  tabPlay.addEventListener("click", () => switchTab("play"));
  tabName.addEventListener("click", () => switchTab("name"));
  tabShop.addEventListener("click", () => switchTab("shop"));
  tabBoard.addEventListener("click", () => {
    switchTab("board");
    loadLeaderboard();
  });
  if (tabWeeklyBoard) {
    tabWeeklyBoard.addEventListener("click", () => {
      switchTab("weeklyBoard");
      loadWeeklyLeaderboard();
    });
  }
  if (_tabPrevWeeklyBoard) {
    _tabPrevWeeklyBoard.addEventListener("click", () => {
      switchTab("prevWeeklyBoard");
      loadPreviousWeeklyLeaderboard();
    });
  }

  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!btn) return;
    if (btn.disabled) return;
    try {
      ensureAudio();
      sfxButton();
    } catch (err) {}
  }, true);

  (async () => {
    if (menuBtn) menuBtn.textContent = "PAUSE";
    if (!playerName) {
      playerName = await openNicknameModal("");
      localStorage.setItem("xgp_v5_name", playerName);
    }
    updateHUD();
    updateWeeklyResetNotice();
    syncBGMButton();
    updateStartButton();
    requestAnimationFrame(() => renderShopPreviews());
    loadLeaderboard();
    loadWeeklyLeaderboard();
    loadPreviousWeeklyLeaderboard();
    initFirebase();
    requestAnimationFrame(loop);
  })();
})();

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
  const playSection = document.getElementById("playSection");
  const nameSection = document.getElementById("nameSection");
  const shopSection = document.getElementById("shopSection");
  const boardSection = document.getElementById("boardSection");

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
    if (name === "shop") {
      requestAnimationFrame(() => renderShopPreviews());
    }
  }

  async function initFirebase() {
    if (!onlineConfig.enabled || !onlineConfig.firebaseConfig || !onlineConfig.firebaseConfig.projectId) {
      lbMode.textContent = "Local mode";
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
      lbMode.textContent = "Online mode";
      await loadLeaderboard();
    } catch (e) {
      console.error(e);
      lbMode.textContent = "Local mode";
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

    if (aura) {
      c.save();
      c.globalCompositeOperation = "lighter";
      const ag = c.createRadialGradient(0, 10, 6, 0, 10, compact ? 42 : 48);
      if (rainbow) {
        ag.addColorStop(0, "rgba(255,87,87,.74)");
        ag.addColorStop(0.22, "rgba(255,216,74,.58)");
        ag.addColorStop(0.48, "rgba(66,255,114,.46)");
        ag.addColorStop(0.72, "rgba(77,214,255,.40)");
        ag.addColorStop(1, "rgba(178,93,255,0)");
      } else {
        ag.addColorStop(0, aura + "bb");
        ag.addColorStop(0.38, aura + "44");
        ag.addColorStop(1, aura + "00");
      }
      c.fillStyle = ag;
      c.beginPath();
      c.arc(0, 6, compact ? 34 : 38, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    c.save();
    c.globalCompositeOperation = "lighter";
    const underGlow = c.createRadialGradient(0, 14, 7, 0, 14, compact ? 34 : 38);
    underGlow.addColorStop(0, "rgba(120,232,255,.34)");
    underGlow.addColorStop(0.38, "rgba(85,190,255,.16)");
    underGlow.addColorStop(1, "rgba(85,190,255,0)");
    c.fillStyle = underGlow;
    c.beginPath();
    c.ellipse(0, 14, compact ? 28 : 31, compact ? 15 : 17, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    const shadowWing = c.createLinearGradient(-38, 8, 38, 8);
    shadowWing.addColorStop(0, "#102745");
    shadowWing.addColorStop(0.52, "#173d66");
    shadowWing.addColorStop(1, "#102745");
    c.fillStyle = shadowWing;
    c.beginPath();
    c.moveTo(-36, 18); c.lineTo(-15, -2); c.lineTo(-9, 18); c.lineTo(-22, 31); c.lineTo(-30, 27); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(36, 18); c.lineTo(15, -2); c.lineTo(9, 18); c.lineTo(22, 31); c.lineTo(30, 27); c.closePath();
    c.fill();

    const wingGrad = c.createLinearGradient(-34, 0, 34, 0);
    wingGrad.addColorStop(0, "#163e6f");
    wingGrad.addColorStop(0.22, "#2a78b9");
    wingGrad.addColorStop(0.5, "#bff5ff");
    wingGrad.addColorStop(0.78, "#3ca9ee");
    wingGrad.addColorStop(1, "#163e6f");
    c.fillStyle = wingGrad;
    c.beginPath();
    c.moveTo(-32, 15); c.lineTo(-11, -10); c.lineTo(-2, 9); c.lineTo(-15, 23); c.lineTo(-24, 21); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(32, 15); c.lineTo(11, -10); c.lineTo(2, 9); c.lineTo(15, 23); c.lineTo(24, 21); c.closePath();
    c.fill();

    c.fillStyle = "#0d2d4f";
    c.beginPath();
    c.moveTo(-27, 8); c.lineTo(-18, 1); c.lineTo(-12, 11); c.lineTo(-20, 17); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(27, 8); c.lineTo(18, 1); c.lineTo(12, 11); c.lineTo(20, 17); c.closePath();
    c.fill();

    c.strokeStyle = "rgba(180,240,255,.55)";
    c.lineWidth = 1.25;
    c.beginPath(); c.moveTo(-28, 17); c.lineTo(-11, -4); c.lineTo(-7, 10); c.stroke();
    c.beginPath(); c.moveTo(28, 17); c.lineTo(11, -4); c.lineTo(7, 10); c.stroke();

    c.fillStyle = "#17456f";
    c.beginPath();
    c.moveTo(0, -46); c.lineTo(10, -28); c.lineTo(0, -31); c.lineTo(-10, -28); c.closePath();
    c.fill();

    const dorsal = c.createLinearGradient(0, -48, 0, -8);
    dorsal.addColorStop(0, "#f1fdff");
    dorsal.addColorStop(0.4, "#8fe6ff");
    dorsal.addColorStop(1, "#1a5f97");
    c.fillStyle = dorsal;
    c.beginPath();
    c.moveTo(0, -49); c.lineTo(7.5, -26); c.lineTo(0, -30); c.lineTo(-7.5, -26); c.closePath();
    c.fill();

    const hullShadow = c.createLinearGradient(0, -40, 0, 36);
    hullShadow.addColorStop(0, "#102e4f");
    hullShadow.addColorStop(0.55, "#14466f");
    hullShadow.addColorStop(1, "#0a2339");
    c.fillStyle = hullShadow;
    c.beginPath();
    c.moveTo(0, -40); c.lineTo(18, -12); c.lineTo(19, 20); c.lineTo(0, 37); c.lineTo(-19, 20); c.lineTo(-18, -12); c.closePath();
    c.fill();

    const bodyG = c.createLinearGradient(0, -38, 0, 33);
    bodyG.addColorStop(0, "#ffffff");
    bodyG.addColorStop(0.12, "#effdff");
    bodyG.addColorStop(0.34, "#b6f2ff");
    bodyG.addColorStop(0.68, "#4aa7ec");
    bodyG.addColorStop(1, "#144f86");
    c.fillStyle = bodyG;
    c.beginPath();
    c.moveTo(0, -38); c.lineTo(13.5, -14); c.lineTo(15, 17); c.lineTo(0, 31); c.lineTo(-15, 17); c.lineTo(-13.5, -14); c.closePath();
    c.fill();

    c.fillStyle = "rgba(255,255,255,.16)";
    c.beginPath();
    c.moveTo(-4, -34); c.lineTo(0, -29); c.lineTo(4, -34); c.lineTo(0, -10); c.closePath();
    c.fill();

    c.strokeStyle = "rgba(255,255,255,.78)";
    c.lineWidth = 1.35;
    c.beginPath(); c.moveTo(-8, -1); c.lineTo(-2.5, 8); c.lineTo(-8, 18); c.stroke();
    c.beginPath(); c.moveTo(8, -1); c.lineTo(2.5, 8); c.lineTo(8, 18); c.stroke();
    c.beginPath(); c.moveTo(-11.5, 7); c.lineTo(-3, 12.5); c.stroke();
    c.beginPath(); c.moveTo(11.5, 7); c.lineTo(3, 12.5); c.stroke();
    c.beginPath(); c.moveTo(0, -20); c.lineTo(0, 19); c.strokeStyle = "rgba(165,235,255,.6)"; c.lineWidth = 2.4; c.stroke();

    const cockpitGlow = c.createLinearGradient(0, -28, 0, 4);
    cockpitGlow.addColorStop(0, "#f7feff");
    cockpitGlow.addColorStop(0.35, "#8de6ff");
    cockpitGlow.addColorStop(1, "#0e2037");
    c.fillStyle = cockpitGlow;
    c.beginPath();
    c.ellipse(0, -13, 7.8, 15.8, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.9)";
    c.beginPath();
    c.ellipse(-2.1, -17.5, 2.6, 6.3, -0.38, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#0e2d49";
    c.beginPath(); c.moveTo(-18, 18); c.lineTo(-8, 22); c.lineTo(-7, 30); c.lineTo(-15, 29); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(18, 18); c.lineTo(8, 22); c.lineTo(7, 30); c.lineTo(15, 29); c.closePath(); c.fill();

    const enginePanel = c.createLinearGradient(-12, 22, 12, 22);
    enginePanel.addColorStop(0, "#daf7ff");
    enginePanel.addColorStop(0.5, "#9ce9ff");
    enginePanel.addColorStop(1, "#daf7ff");
    c.fillStyle = enginePanel;
    c.fillRect(-9, 22.5, 6.5, 7.2);
    c.fillRect(2.5, 22.5, 6.5, 7.2);

    c.fillStyle = "#7be5ff";
    c.beginPath(); c.arc(-15.5, 12.5, 2.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ff6e64";
    c.beginPath(); c.arc(15.5, 12.5, 2.3, 0, Math.PI * 2); c.fill();

    if (rainbow) {
      const rg2 = c.createLinearGradient(-14, 0, 14, 0);
      rg2.addColorStop(0, "#ff5757");
      rg2.addColorStop(0.25, "#ffd84a");
      rg2.addColorStop(0.5, "#42ff72");
      rg2.addColorStop(0.75, "#4dd6ff");
      rg2.addColorStop(1, "#b25dff");
      c.strokeStyle = rg2;
    } else {
      c.strokeStyle = extraColor;
    }
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(-12, 2); c.lineTo(-4, 11); c.stroke();
    c.beginPath(); c.moveTo(12, 2); c.lineTo(4, 11); c.stroke();

    c.fillStyle = "rgba(8,26,43,.9)";
    c.beginPath();
    c.moveTo(-4.5, 27); c.lineTo(-1.2, 20); c.lineTo(-8.2, 20.5); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(4.5, 27); c.lineTo(8.2, 20.5); c.lineTo(1.2, 20); c.closePath();
    c.fill();

    const flick = engineFlicker;
    const plume = c.createLinearGradient(0, 22, 0, 45);
    plume.addColorStop(0, "rgba(255,252,214,.98)");
    plume.addColorStop(0.34, "rgba(117,255,255,.92)");
    plume.addColorStop(0.68, "rgba(70,191,255,.78)");
    plume.addColorStop(1, "rgba(36,115,255,0)");
    c.fillStyle = plume;
    c.beginPath();
    c.moveTo(-6.2, 44 + flick); c.lineTo(0.8, 23); c.lineTo(-10.5, 23); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(6.2, 44 + flick); c.lineTo(10.5, 23); c.lineTo(-0.8, 23); c.closePath();
    c.fill();

    c.fillStyle = "rgba(255,255,255,.92)";
    c.beginPath();
    c.moveTo(0, 39 + flick * 0.78); c.lineTo(3.6, 24); c.lineTo(-3.6, 24); c.closePath();
    c.fill();

    c.fillStyle = "#ffb04a";
    c.beginPath(); c.moveTo(-4.5, 35 + flick * 0.6); c.lineTo(-2, 25); c.lineTo(-7.4, 25); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(4.5, 35 + flick * 0.6); c.lineTo(7.4, 25); c.lineTo(2, 25); c.closePath(); c.fill();

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

  async function loadLeaderboard() {
    if (useFirebase && db) {
      const { doc, getDoc } = db.api;
      const snap = await getDoc(doc(db.store, "xgp", "leaderboard"));
      const rows = snap.exists() ? (snap.data().rows || []) : [];
      renderLeaderboard(rows);
      return;
    }
    const rows = JSON.parse(localStorage.getItem("xgp_v5_local_lb") || "[]");
    renderLeaderboard(rows);
  }

  function renderLeaderboard(rows) {
    lbList.innerHTML = "";
    rows.slice(0, 20).forEach((r, i) => {
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
      lbList.appendChild(li);
    });
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
      return;
    }

    const rows = JSON.parse(localStorage.getItem("xgp_v5_local_lb") || "[]");
    const idx = rows.findIndex(r => r.name === entry.name);
    if (idx >= 0) rows[idx].score = Math.max(rows[idx].score, entry.score);
    else rows.push(entry);
    rows.sort((a, b) => b.score - a.score);
    localStorage.setItem("xgp_v5_local_lb", JSON.stringify(rows.slice(0, 100)));
    await loadLeaderboard();
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

    const aura = rainbow ? null : auraColor;
    drawShipModel(pctx, cssW * 0.5, cssH * 0.52, 0.78, {
      tilt: -0.08,
      aura,
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

  (async () => {
    if (menuBtn) menuBtn.textContent = "PAUSE";
    if (!playerName) {
      playerName = await openNicknameModal("");
      localStorage.setItem("xgp_v5_name", playerName);
    }
    updateHUD();
    syncBGMButton();
    updateStartButton();
    requestAnimationFrame(() => renderShopPreviews());
    loadLeaderboard();
    initFirebase();
    requestAnimationFrame(loop);
  })();
})();

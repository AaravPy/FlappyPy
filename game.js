// DOM references
const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best");
const overlay = document.querySelector("#overlay");
const overlayKicker = document.querySelector("#overlayKicker");
const overlayTitle = document.querySelector("#overlayTitle");
const gameOverStats = document.querySelector("#gameOverStats");
const finalScoreElement = document.querySelector("#finalScore");
const finalBestElement = document.querySelector("#finalBest");
const newBestIndicator = document.querySelector("#newBestIndicator");
const bestCelebration = document.querySelector("#bestCelebration");
const gameOverAchievement = document.querySelector("#gameOverAchievement");
const startButton = document.querySelector("#startButton");
const statusText = document.querySelector("#statusText");
const flightStatus = document.querySelector("#flightStatus");
const ogModeButton = document.querySelector("#ogMode");
const pauseButton = document.querySelector("#pauseButton");
const achievementCount = document.querySelector("#achievementCount");
const achievementToast = document.querySelector("#achievementToast");
const settingsButton = document.querySelector("#settingsButton");
const settingsPanel = document.querySelector("#settingsPanel");
const settingsClose = document.querySelector("#settingsClose");
const soundSetting = document.querySelector("#soundSetting");
const musicSetting = document.querySelector("#musicSetting");
const muteSetting = document.querySelector("#muteSetting");
const sfxVolumeSetting = document.querySelector("#sfxVolumeSetting");
const musicVolumeSetting = document.querySelector("#musicVolumeSetting");
const sfxVolumeValue = document.querySelector("#sfxVolumeValue");
const musicVolumeValue = document.querySelector("#musicVolumeValue");
const difficultySetting = document.querySelector("#difficultySetting");
const practiceSetting = document.querySelector("#practiceSetting");
const tutorialSetting = document.querySelector("#tutorialSetting");
const skinSetting = document.querySelector("#skinSetting");
const backgroundSetting = document.querySelector("#backgroundSetting");
const weatherSetting = document.querySelector("#weatherSetting");
const motionSetting = document.querySelector("#motionSetting");
const countdownElement = document.querySelector("#countdown");
const tutorialHint = document.querySelector("#tutorialHint");
const comboIndicator = document.querySelector("#comboIndicator");
const nearMissIndicator = document.querySelector("#nearMissIndicator");
const powerUpIndicator = document.querySelector("#powerUpIndicator");
const speedIndicator = document.querySelector("#speedIndicator");

// Game configuration and mutable runtime state
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const groundHeight = 78;
const bird = { x: 180, y: canvasHeight / 2, radius: 18, velocity: 0, rotation: 0 };
const DIFFICULTY_PROFILES = {
  easy: { gravity: 0.37, speed: 3, gap: 245 },
  normal: { gravity: 0.43, speed: 3.4, gap: 220 },
  hard: { gravity: 0.5, speed: 3.9, gap: 195 }
};
const PIPE_PATTERNS = ["standard", "high", "low", "zigzag"];
const POWER_UP_TYPES = ["shield", "slow", "multiplier"];
const BIRD_SKINS = {
  classic: { body: "#f4f0e7", wing: "#e4ff4f", eye: "#162337", beak: "#e4ff4f" },
  sunset: { body: "#ff9b71", wing: "#ffdd72", eye: "#38203a", beak: "#ff7188" },
  mint: { body: "#b8ffe8", wing: "#6ee7cf", eye: "#123536", beak: "#6ee7cf" }
};
const COUNTDOWN_STEP_MS = 800;
const MAX_SPEED_LEVEL = 12;
const userSettings = loadUserSettings();
const physicsSettings = { ...DIFFICULTY_PROFILES[userSettings.difficulty], flap: -8.2, pipeWidth: 76 };
let pipes = [];
let powerUps = [];
let score = 0;
let best = Number(localStorage.getItem("flappypy-best") || 0);
let bestAtStart = best;
let state = "ready";
let lastTime = 0;
let animationFrame;
let groundOffset = 0;
let ogMode = false;
let audioContext;
let sfxGain;
let musicGain;
let musicTimer;
let runAchievementTitles = [];
let combo = 0;
let nearMisses = 0;
let pipePatternIndex = 0;
let countdownTimer;
let tutorialTimer;
let worldTime = 0;
let shieldActive = false;
let slowTimer = 0;
let multiplierTimer = 0;
let pipesPassed = 0;
let secretBuffer = "";
let easterEggActive = false;
const achievementDefinitions = [
  { id: "first-flight", title: "FIRST FLIGHT", check: () => state === "playing" },
  { id: "gap-runner", title: "GAP RUNNER", check: () => score >= 5 },
  { id: "high-flyer", title: "HIGH FLYER", check: () => score >= 10 },
  { id: "og-pilot", title: "OG PILOT", check: () => ogMode && state === "playing" },
  { id: "night-shift", title: "NIGHT SHIFT", check: () => score >= 15 },
  { id: "skyline-legend", title: "SKYLINE LEGEND", check: () => score >= 25 }
];
const achievementIds = new Set(achievementDefinitions.map(({ id }) => id));
const unlockedAchievements = loadUnlockedAchievements();
const notificationQueue = [];
let notificationActive = false;

// Settings and persistence
function loadUserSettings() {
  const defaults = { sound: true, music: false, mute: false, sfxVolume: 0.7, musicVolume: 0.35, difficulty: "normal", practice: false, tutorial: false, skin: "classic", background: "city", weather: "clear", reducedMotion: false };
  try {
    const stored = JSON.parse(localStorage.getItem("flappypy-settings") || "{}");
    return {
      ...defaults,
      ...stored,
      difficulty: DIFFICULTY_PROFILES[stored.difficulty] ? stored.difficulty : defaults.difficulty,
      skin: ["classic", "sunset", "mint"].includes(stored.skin) ? stored.skin : defaults.skin,
      background: ["city", "ocean", "desert"].includes(stored.background) ? stored.background : defaults.background,
      weather: ["clear", "rain", "fog"].includes(stored.weather) ? stored.weather : defaults.weather,
      sfxVolume: Number.isFinite(Number(stored.sfxVolume)) ? Math.min(1, Math.max(0, Number(stored.sfxVolume))) : defaults.sfxVolume,
      musicVolume: Number.isFinite(Number(stored.musicVolume)) ? Math.min(1, Math.max(0, Number(stored.musicVolume))) : defaults.musicVolume
    };
  } catch {
    return defaults;
  }
}

function saveUserSettings() {
  try {
    localStorage.setItem("flappypy-settings", JSON.stringify(userSettings));
  } catch {
  }
}

function applyUserSettings() {
  soundSetting.checked = userSettings.sound;
  musicSetting.checked = userSettings.music;
  muteSetting.checked = userSettings.mute;
  sfxVolumeSetting.value = userSettings.sfxVolume;
  musicVolumeSetting.value = userSettings.musicVolume;
  sfxVolumeValue.value = `${Math.round(userSettings.sfxVolume * 100)}%`;
  musicVolumeValue.value = `${Math.round(userSettings.musicVolume * 100)}%`;
  sfxVolumeValue.textContent = `${Math.round(userSettings.sfxVolume * 100)}%`;
  musicVolumeValue.textContent = `${Math.round(userSettings.musicVolume * 100)}%`;
  difficultySetting.value = userSettings.difficulty;
  practiceSetting.checked = userSettings.practice;
  tutorialSetting.checked = userSettings.tutorial;
  skinSetting.value = userSettings.skin;
  backgroundSetting.value = userSettings.background;
  weatherSetting.value = userSettings.weather;
  motionSetting.checked = userSettings.reducedMotion;
  document.body.classList.toggle("reduced-motion", userSettings.reducedMotion);
}

function loadUnlockedAchievements() {
  try {
    const stored = JSON.parse(localStorage.getItem("flappypy-achievements") || "[]");
    return new Set(Array.isArray(stored) ? stored.filter((id) => achievementIds.has(id)) : []);
  } catch {
    return new Set();
  }
}

bestElement.textContent = String(best).padStart(3, "0");

// Achievement state and UI
function updateAchievements() {
  achievementDefinitions.forEach(({ id }) => {
    const element = document.querySelector(`#achievement-${id}`);
    const unlocked = unlockedAchievements.has(id);
    element.classList.toggle("unlocked", unlocked);
    element.querySelector("b").textContent = unlocked ? "UNLOCKED" : "LOCKED";
  });
  achievementCount.textContent = `${unlockedAchievements.size} / ${achievementDefinitions.length}`;
}

function checkAchievements() {
  achievementDefinitions.forEach((achievement) => {
    if (achievement.check() && !unlockedAchievements.has(achievement.id)) {
      unlockedAchievements.add(achievement.id);
      notificationQueue.push(achievement);
      runAchievementTitles.push(achievement.title);
      playAchievementSound();
    }
  });
  try {
    localStorage.setItem("flappypy-achievements", JSON.stringify([...unlockedAchievements]));
  } catch {
  }
  updateAchievements();
  showNextAchievementNotification();
}

function showNextAchievementNotification() {
  if (notificationActive || !notificationQueue.length) return;
  const achievement = notificationQueue.shift();
  notificationActive = true;
  achievementToast.querySelector("span").textContent = "ACHIEVEMENT UNLOCKED";
  achievementToast.querySelector("strong").textContent = achievement.title;
  achievementToast.classList.add("visible");
  window.setTimeout(() => {
    achievementToast.classList.remove("visible");
    window.setTimeout(() => {
      notificationActive = false;
      showNextAchievementNotification();
    }, 260);
  }, 2400);
}

// Simulation
function getPhysicsProfile() {
  const profile = DIFFICULTY_PROFILES[userSettings.difficulty];
  if (!userSettings.practice) return profile;
  return {
    gravity: profile.gravity * 0.76,
    speed: Math.max(2.4, profile.speed - 0.7),
    gap: profile.gap + 42
  };
}

function resetGame() {
  const profile = getPhysicsProfile();
  bird.y = canvasHeight / 2;
  bird.velocity = 0;
  bird.rotation = 0;
  physicsSettings.gravity = profile.gravity;
  physicsSettings.speed = profile.speed;
  physicsSettings.gap = profile.gap;
  pipes = [{ x: canvasWidth + 120, gapY: 355, gap: physicsSettings.gap, pattern: "standard", counted: false, nearMissed: false }];
  powerUps = [];
  score = 0;
  combo = 0;
  nearMisses = 0;
  pipePatternIndex = 0;
  pipesPassed = 0;
  shieldActive = false;
  slowTimer = 0;
  multiplierTimer = 0;
  worldTime = 0;
  updateGameplayMetrics();
  updateScore();
}

function applyDifficulty() {
  const level = Math.min(score, MAX_SPEED_LEVEL * 3);
  const profile = getPhysicsProfile();
  const extendedLevel = Math.min(Math.floor(score / 5), MAX_SPEED_LEVEL);
  physicsSettings.speed = profile.speed + level * 0.1 + extendedLevel * 0.12;
  physicsSettings.gap = Math.max(138, profile.gap - level * 2 - extendedLevel * 1.5);
  physicsSettings.gravity = profile.gravity + level * 0.004 + extendedLevel * 0.006;
  updateGameplayMetrics();
}

function updateGameplayMetrics() {
  const baseSpeed = getPhysicsProfile().speed;
  comboIndicator.textContent = `COMBO x${combo}`;
  nearMissIndicator.textContent = `NEAR ${nearMisses}`;
  const activePower = shieldActive ? "SHIELD" : slowTimer > 0 ? "SLOW" : multiplierTimer > 0 ? "2X SCORE" : "--";
  powerUpIndicator.textContent = `POWER ${activePower}`;
  speedIndicator.textContent = `SPEED ${(physicsSettings.speed / baseSpeed).toFixed(1)}x`;
}

function updateScore() {
  scoreElement.textContent = String(score).padStart(3, "0");
  bestElement.textContent = String(best).padStart(3, "0");
}

function begin() {
  if (state === "countdown") return;
  if (userSettings.sound || userSettings.music) ensureAudioContext();
  runAchievementTitles = [];
  window.clearTimeout(tutorialTimer);
  bestAtStart = best;
  resetGame();
  gameOverStats.hidden = true;
  gameOverAchievement.hidden = true;
  newBestIndicator.hidden = true;
  bestCelebration.hidden = true;
  overlay.classList.remove("best-score");
  tutorialHint.hidden = true;
  state = "countdown";
  pauseButton.disabled = true;
  pauseButton.textContent = "PAUSE";
  overlay.classList.add("hidden");
  statusText.textContent = "GET READY";
  flightStatus.textContent = "COUNTDOWN";
  startCountdown();
}

function startCountdown() {
  let count = 3;
  countdownElement.textContent = String(count);
  countdownElement.hidden = false;
  window.clearInterval(countdownTimer);
  countdownTimer = window.setInterval(() => {
    count -= 1;
    if (count > 0) {
      countdownElement.textContent = String(count);
      return;
    }
    countdownElement.textContent = "GO";
    window.clearInterval(countdownTimer);
    countdownTimer = window.setTimeout(() => {
      countdownElement.hidden = true;
      startFlight();
    }, COUNTDOWN_STEP_MS);
  }, COUNTDOWN_STEP_MS);
}

function startFlight() {
  state = "playing";
  lastTime = performance.now();
  pauseButton.disabled = false;
  checkAchievements();
  startMusic();
  if (userSettings.tutorial) {
    tutorialHint.hidden = false;
    tutorialTimer = window.setTimeout(() => { tutorialHint.hidden = true; }, 9000);
  }
  statusText.textContent = "IN FLIGHT";
  flightStatus.textContent = "LIVE / 01";
}

// Audio
function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      audioContext = new AudioContextClass();
      sfxGain = audioContext.createGain();
      musicGain = audioContext.createGain();
      sfxGain.connect(audioContext.destination);
      musicGain.connect(audioContext.destination);
      updateAudioGains();
    } catch {
      audioContext = undefined;
      return false;
    }
  }
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return true;
}

function updateAudioGains() {
  if (!sfxGain || !musicGain) return;
  sfxGain.gain.value = userSettings.mute || !userSettings.sound ? 0 : userSettings.sfxVolume;
  musicGain.gain.value = userSettings.mute || !userSettings.music ? 0 : userSettings.musicVolume;
}

function createTone(startFrequency, endFrequency, duration, type, volume, output) {
  if (!ensureAudioContext()) return;
  const outputNode = output || sfxGain;
  if (!outputNode) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain);
  gain.connect(outputNode);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playTone(startFrequency, endFrequency, duration, type = "sine", volume = 0.06) {
  if (!userSettings.mute && userSettings.sound) createTone(startFrequency, endFrequency, duration, type, volume, sfxGain);
}

function playAchievementSound() {
  playTone(520, 780, 0.12, "triangle", 0.07);
  window.setTimeout(() => playTone(780, 1040, 0.16, "sine", 0.06), 100);
}

function startMusic() {
  if (!userSettings.music || musicTimer) return;
  const notes = [196, 247, 294, 330, 294, 247];
  let noteIndex = 0;
  const playNote = () => {
    if (userSettings.music && !userSettings.mute) createTone(notes[noteIndex++ % notes.length], notes[noteIndex % notes.length], 0.45, "sine", 0.012, musicGain);
  };
  playNote();
  musicTimer = window.setInterval(playNote, 700);
}

function stopMusic() {
  window.clearInterval(musicTimer);
  musicTimer = undefined;
}

function playFlapSound() {
  playTone(520, 760, 0.09, "triangle", 0.045);
}

function playPointSound() {
  playTone(740, 1100, 0.12, "sine", 0.05);
}

function playCollisionSound() {
  playTone(150, 65, 0.18, "sawtooth", 0.07);
}

function playGameOverSound() {
  playTone(240, 80, 0.4, "triangle", 0.06);
}

function endGame() {
  state = "gameover";
  countdownElement.hidden = true;
  pauseButton.disabled = true;
  stopMusic();
  playCollisionSound();
  playGameOverSound();
  const isNewBest = score > bestAtStart;
  best = Math.max(best, score);
  try {
    localStorage.setItem("flappypy-best", best);
  } catch {
  }
  updateScore();
  overlayKicker.textContent = score > 0 ? "FLIGHT LOGGED" : "THE SKY IS WIDE";
  overlayTitle.textContent = score > 0 ? "Flight complete." : "A little too low.";
  gameOverStats.hidden = false;
  finalScoreElement.textContent = String(score).padStart(3, "0");
  finalBestElement.textContent = String(best).padStart(3, "0");
  newBestIndicator.hidden = !isNewBest;
  bestCelebration.hidden = !isNewBest;
  overlay.classList.toggle("best-score", isNewBest);
  gameOverAchievement.hidden = !runAchievementTitles.length;
  gameOverAchievement.textContent = runAchievementTitles.length
    ? `ACHIEVEMENT: ${runAchievementTitles.join(" / ")}`
    : "";
  startButton.querySelector("span").textContent = "RESTART FLIGHT";
  overlay.classList.remove("hidden");
  statusText.textContent = "FLIGHT ENDED";
  flightStatus.textContent = "LANDED";
}

function flap() {
  if (state === "ready" || state === "gameover") begin();
  if (state === "paused") return;
  if (state !== "playing") return;
  bird.velocity = physicsSettings.flap;
  playFlapSound();
}

function togglePause() {
  if (state === "playing") {
    state = "paused";
    stopMusic();
    pauseButton.textContent = "RESUME";
    statusText.textContent = "PAUSED";
    flightStatus.textContent = "HOLDING";
    return;
  }
  if (state === "paused") {
    state = "playing";
    startMusic();
    pauseButton.textContent = "PAUSE";
    statusText.textContent = "IN FLIGHT";
    flightStatus.textContent = "LIVE / 01";
  }
}

function addPipe() {
  const margin = 130;
  const halfGap = physicsSettings.gap / 2;
  const minGapY = margin + halfGap;
  const maxGapY = canvasHeight - groundHeight - margin - halfGap;
  const clampGapY = (value) => Math.min(maxGapY, Math.max(minGapY, value));
  const pattern = PIPE_PATTERNS[pipePatternIndex++ % PIPE_PATTERNS.length];
  const previousGap = pipes.length ? pipes[pipes.length - 1].gapY : canvasHeight / 2;
  let gapY = minGapY + Math.random() * (maxGapY - minGapY);
  if (pattern === "high") gapY = clampGapY(250 + Math.random() * 70);
  if (pattern === "low") gapY = clampGapY(540 + Math.random() * 70);
  if (pattern === "zigzag") gapY = clampGapY(previousGap < canvasHeight / 2 ? 570 : 260);
  pipes.push({
    x: canvasWidth + physicsSettings.pipeWidth,
    gapY,
    gap: physicsSettings.gap,
    pattern,
    counted: false,
    nearMissed: false
  });
}

function spawnPowerUp(pipe) {
  const type = POWER_UP_TYPES[Math.floor(pipesPassed / 3 - 1) % POWER_UP_TYPES.length];
  powerUps.push({ type, x: pipe.x + canvasWidth * 0.42, y: pipe.gapY, radius: 15, collected: false });
}

function collectPowerUp(powerUp) {
  powerUp.collected = true;
  if (powerUp.type === "shield") shieldActive = true;
  if (powerUp.type === "slow") slowTimer = 7000;
  if (powerUp.type === "multiplier") multiplierTimer = 8000;
  playPointSound();
  updateGameplayMetrics();
}

function updatePowerUps(step, timeScale) {
  powerUps.forEach((powerUp) => {
    powerUp.x -= physicsSettings.speed * step * timeScale;
    const distance = Math.hypot(powerUp.x - bird.x, powerUp.y - bird.y);
    if (!powerUp.collected && distance < bird.radius + powerUp.radius) collectPowerUp(powerUp);
  });
  powerUps = powerUps.filter((powerUp) => !powerUp.collected && powerUp.x > -powerUp.radius);
  if (slowTimer > 0) slowTimer = Math.max(0, slowTimer - step * 16.67);
  if (multiplierTimer > 0) multiplierTimer = Math.max(0, multiplierTimer - step * 16.67);
  updateGameplayMetrics();
}

function awardPipeScore(pipe) {
  const topEdge = pipe.gapY - pipe.gap / 2;
  const bottomEdge = pipe.gapY + pipe.gap / 2;
  const edgeDistance = Math.min(Math.abs(bird.y - topEdge), Math.abs(bird.y - bottomEdge));
  const isNearMiss = edgeDistance < 42;
  combo += 1;
  const comboBonus = combo > 1 ? Math.min(3, Math.floor(combo / 2)) : 0;
  const nearMissBonus = isNearMiss ? 2 : 0;
  const points = 1 + comboBonus + nearMissBonus;
  score += multiplierTimer > 0 ? points * 2 : points;
  if (userSettings.tutorial && score > 0) tutorialHint.hidden = true;
  if (isNearMiss) {
    nearMisses += 1;
    pipe.nearMissed = true;
  }
  applyDifficulty();
  playPointSound();
  checkAchievements();
  pipesPassed += 1;
  if (pipesPassed % 3 === 0) spawnPowerUp(pipe);
  if (score > best) best = score;
  updateScore();
  updateGameplayMetrics();
}

function hitsPipe(pipe) {
  const birdLeft = bird.x - bird.radius + 4;
  const birdRight = bird.x + bird.radius - 4;
  const birdTop = bird.y - bird.radius + 4;
  const birdBottom = bird.y + bird.radius - 4;
  const inX = birdRight > pipe.x && birdLeft < pipe.x + physicsSettings.pipeWidth;
  const inGap = birdTop > pipe.gapY - pipe.gap / 2 && birdBottom < pipe.gapY + pipe.gap / 2;
  return inX && !inGap;
}

function updateGame(delta) {
  if (state !== "playing") return;
  const step = Math.min(delta / 16.67, 2);
  const timeScale = slowTimer > 0 ? 0.55 : 1;
  const scaledStep = step * timeScale;
  worldTime += delta * timeScale;
  bird.velocity += physicsSettings.gravity * scaledStep;
  bird.y += bird.velocity * scaledStep;
  bird.rotation = Math.min(Math.PI / 2, bird.velocity / 10);
  groundOffset = (groundOffset + physicsSettings.speed * scaledStep) % 42;
  pipes.forEach((pipe) => { pipe.x -= physicsSettings.speed * scaledStep; });
  updatePowerUps(step, timeScale);
  if (pipes.length && pipes[0].x < -physicsSettings.pipeWidth - 20) pipes.shift();
  if (pipes.length && pipes[pipes.length - 1].x < canvasWidth - 330) addPipe();
  pipes.forEach((pipe) => {
    if (!pipe.counted && pipe.x + physicsSettings.pipeWidth < bird.x) {
      pipe.counted = true;
      awardPipeScore(pipe);
    }
  });
  const collisionDetected = bird.y - bird.radius < 0 || bird.y + bird.radius > canvasHeight - groundHeight || pipes.some(hitsPipe);
  if (collisionDetected && shieldActive) {
    shieldActive = false;
    bird.velocity = physicsSettings.flap * 0.5;
    updateGameplayMetrics();
  } else if (collisionDetected) {
    checkAchievements();
    endGame();
  }
}

// Rendering
function drawBackground() {
  if (ogMode) {
    ctx.fillStyle = "#5ec8ed";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "rgba(255, 255, 255, .72)";
    ctx.beginPath();
    ctx.arc(130, 150, 34, 0, Math.PI * 2);
    ctx.arc(166, 150, 28, 0, Math.PI * 2);
    ctx.arc(194, 150, 22, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const sky = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  sky.addColorStop(0, "#152b3d");
  sky.addColorStop(1, "#406b74");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  if (userSettings.background === "ocean") drawOceanBackground();
  else if (userSettings.background === "desert") drawDesertBackground();
  else drawModernCity();
  drawFlyingCars();
  drawDayNightCycle();
  drawWeather();
  ctx.fillStyle = "rgba(228, 255, 79, .12)";
  ctx.beginPath();
  ctx.arc(canvasWidth - 125, 135, 58, 0, Math.PI * 2);
  ctx.fill();
}

function drawOceanBackground() {
  ctx.fillStyle = "rgba(22, 92, 117, .55)";
  ctx.fillRect(0, canvasHeight * .58, canvasWidth, canvasHeight * .42);
  ctx.strokeStyle = "rgba(110, 231, 207, .28)";
  ctx.lineWidth = 3;
  for (let wave = 0; wave < 8; wave += 1) {
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight * .63 + wave * 34);
    ctx.quadraticCurveTo(canvasWidth * .25, canvasHeight * .59 + wave * 34, canvasWidth * .5, canvasHeight * .63 + wave * 34);
    ctx.quadraticCurveTo(canvasWidth * .75, canvasHeight * .67 + wave * 34, canvasWidth, canvasHeight * .63 + wave * 34);
    ctx.stroke();
  }
}

function drawDesertBackground() {
  ctx.fillStyle = "rgba(176, 108, 72, .4)";
  ctx.fillRect(0, canvasHeight * .62, canvasWidth, canvasHeight * .38);
  ctx.fillStyle = "rgba(246, 193, 112, .55)";
  ctx.beginPath();
  ctx.moveTo(0, canvasHeight * .72);
  ctx.quadraticCurveTo(canvasWidth * .25, canvasHeight * .58, canvasWidth * .5, canvasHeight * .72);
  ctx.quadraticCurveTo(canvasWidth * .75, canvasHeight * .86, canvasWidth, canvasHeight * .69);
  ctx.lineTo(canvasWidth, canvasHeight);
  ctx.lineTo(0, canvasHeight);
  ctx.fill();
}

function drawDayNightCycle() {
  const daylight = (Math.cos(worldTime / 18000 * Math.PI * 2) + 1) / 2;
  ctx.fillStyle = `rgba(5, 12, 35, ${(.58 - daylight * .5).toFixed(3)})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

function drawWeather() {
  if (userSettings.weather === "rain") {
    ctx.strokeStyle = "rgba(174, 222, 255, .32)";
    ctx.lineWidth = 2;
    for (let drop = 0; drop < 44; drop += 1) {
      const x = (drop * 67 + worldTime * .16) % canvasWidth;
      const y = (drop * 113 + worldTime * .48) % canvasHeight;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 8, y + 20);
      ctx.stroke();
    }
  }
  if (userSettings.weather === "fog") {
    ctx.fillStyle = "rgba(190, 208, 204, .16)";
    ctx.fillRect(0, canvasHeight * .35, canvasWidth, canvasHeight * .4);
  }
}

function drawModernCity() {
  const buildings = [
    { x: 0, width: 94, height: 270 },
    { x: 82, width: 128, height: 390, sign: "AMAZON" },
    { x: 196, width: 84, height: 225 },
    { x: 268, width: 145, height: 470, sign: "APPLE" },
    { x: 397, width: 98, height: 315 },
    { x: 478, width: 152, height: 420, sign: "GOOGLE" },
    { x: 615, width: 118, height: 255 }
  ];
  const skylineBase = canvasHeight - groundHeight - 8;
  buildings.forEach((building, buildingIndex) => {
    const top = skylineBase - building.height;
    ctx.fillStyle = buildingIndex % 2 ? "rgba(12, 27, 43, .7)" : "rgba(18, 39, 55, .78)";
    ctx.fillRect(building.x, top, building.width, building.height);
    ctx.fillStyle = "rgba(228, 255, 79, .22)";
    for (let windowY = top + 24; windowY < skylineBase - 12; windowY += 28) {
      for (let windowX = building.x + 14; windowX < building.x + building.width - 8; windowX += 24) {
        if ((windowX + windowY + buildingIndex * 17) % 5 < 3) {
          ctx.fillRect(windowX, windowY, 7, 10);
          if ((windowX + windowY + buildingIndex) % 7 < 2) {
            ctx.fillStyle = "rgba(6, 16, 26, .82)";
            ctx.beginPath();
            ctx.arc(windowX + 3.5, windowY + 3, 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(windowX + 2, windowY + 5, 3, 5);
            ctx.fillStyle = "rgba(228, 255, 79, .22)";
          }
        }
      }
    }
    if (building.sign) drawCompanyBadge(building, top);
  });
  ctx.fillStyle = "rgba(9, 21, 33, .72)";
  ctx.fillRect(330, skylineBase - 492, 8, 22);
  ctx.fillRect(502, skylineBase - 442, 9, 28);
  const pollutionDrift = userSettings.reducedMotion ? 0 : (performance.now() / 90) % 70;
  ctx.fillStyle = "rgba(144, 157, 148, .3)";
  ctx.beginPath();
  ctx.arc(334 + pollutionDrift * .2, skylineBase - 520, 30, 0, Math.PI * 2);
  ctx.arc(360 + pollutionDrift * .3, skylineBase - 536, 38, 0, Math.PI * 2);
  ctx.arc(394 + pollutionDrift * .4, skylineBase - 522, 32, 0, Math.PI * 2);
  ctx.arc(506 + pollutionDrift * .3, skylineBase - 472, 34, 0, Math.PI * 2);
  ctx.arc(542 + pollutionDrift * .4, skylineBase - 488, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(115, 132, 125, .28)";
  ctx.fillRect(0, skylineBase - 155, canvasWidth, 120);
  ctx.fillStyle = "rgba(87, 105, 101, .18)";
  ctx.fillRect(0, skylineBase - 255, canvasWidth, 48);
  ctx.fillStyle = "rgba(193, 180, 143, .2)";
  for (let particle = 0; particle < 34; particle += 1) {
    const particleX = (particle * 97 + pollutionDrift * (particle % 3 + 1)) % canvasWidth;
    const particleY = skylineBase - 35 - ((particle * 53) % 240);
    const particleSize = particle % 4 === 0 ? 3 : 1.5;
    ctx.fillRect(particleX, particleY, particleSize, particleSize);
  }
  const smog = ctx.createLinearGradient(0, skylineBase - 240, 0, skylineBase);
  smog.addColorStop(0, "rgba(154, 171, 156, 0)");
  smog.addColorStop(1, "rgba(119, 137, 126, .42)");
  ctx.fillStyle = smog;
  ctx.fillRect(0, skylineBase - 240, canvasWidth, 240);
}

function drawFlyingCars() {
  const time = userSettings.reducedMotion ? 0 : performance.now() / 1000;
  const cars = [
    { speed: 42, y: 286, scale: .8, color: "#6ee7cf", offset: 40 },
    { speed: 29, y: 438, scale: 1, color: "#ff7188", offset: 310 },
    { speed: 54, y: 560, scale: .62, color: "#b98cff", offset: 520 }
  ];
  cars.forEach((car) => {
    const cycle = canvasWidth + 180;
    const x = ((time * car.speed + car.offset) % cycle) - 120;
    drawFlyingCar(x, car.y + Math.sin(time * 1.4 + car.offset) * 7, car.scale, car.color);
  });
}

function drawFlyingCar(x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = .86;
  ctx.fillStyle = `${color}35`;
  ctx.beginPath();
  ctx.ellipse(-34, 8, 48, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(7, 17, 28, .92)";
  ctx.beginPath();
  ctx.moveTo(-31, 2);
  ctx.quadraticCurveTo(-22, -16, 0, -16);
  ctx.lineTo(19, -8);
  ctx.lineTo(35, -3);
  ctx.lineTo(27, 8);
  ctx.lineTo(-27, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(-22, 4, 48, 3);
  ctx.fillStyle = "#d9ffff";
  ctx.beginPath();
  ctx.moveTo(-12, -11);
  ctx.lineTo(3, -11);
  ctx.lineTo(13, -4);
  ctx.lineTo(-17, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e4ff4f";
  ctx.beginPath();
  ctx.arc(31, 1, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-29, 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCompanyBadge(building, top) {
  const badges = {
    APPLE: { color: "#d7a9ff" },
    AMAZON: { mark: "a", color: "#ffae5b" },
    MICROSOFT: { mark: "M", color: "#6ee7cf" },
    GOOGLE: { mark: "G", color: "#ff7188" }
  };
  const badge = badges[building.sign];
  const badgeX = building.x + 8;
  const badgeY = top + 10;
  const badgeWidth = building.width - 16;
  ctx.fillStyle = "rgba(5, 14, 24, .88)";
  ctx.fillRect(badgeX, badgeY, badgeWidth, 27);
  ctx.fillStyle = badge.color;
  ctx.fillRect(badgeX + 5, badgeY + 5, 17, 17);
  if (building.sign === "APPLE") {
    drawAppleMark(badgeX + 13.5, badgeY + 13.5);
  } else {
    ctx.fillStyle = "#081522";
    ctx.font = "700 12px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(badge.mark, badgeX + 13.5, badgeY + 18);
  }
  ctx.fillStyle = "rgba(228, 255, 79, .88)";
  ctx.font = "500 9px 'DM Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(building.sign, badgeX + 28, badgeY + 18);
}

function drawAppleMark(x, y) {
  ctx.save();
  ctx.translate(x, y + 1);
  ctx.fillStyle = "#081522";
  ctx.beginPath();
  ctx.arc(-4, 1, 5, 0, Math.PI * 2);
  ctx.arc(4, 1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-4, 2, 8, 5);
  ctx.rotate(-.45);
  ctx.fillRect(2, -8, 2, 5);
  ctx.fillStyle = "#75e0a3";
  ctx.beginPath();
  ctx.ellipse(5, -8, 4, 2, -.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPipe(pipe) {
  const top = pipe.gapY - pipe.gap / 2;
  const bottom = pipe.gapY + pipe.gap / 2;
  if (ogMode) {
    ctx.fillStyle = "#45ad4d";
    ctx.fillRect(pipe.x, 0, physicsSettings.pipeWidth, top);
    ctx.fillRect(pipe.x, bottom, physicsSettings.pipeWidth, canvasHeight - groundHeight - bottom);
    ctx.fillStyle = "#23853a";
    ctx.fillRect(pipe.x + 10, 0, 9, top);
    ctx.fillRect(pipe.x + 10, bottom, 9, canvasHeight - groundHeight - bottom);
    ctx.fillStyle = "#63c957";
    ctx.fillRect(pipe.x - 8, top - 20, physicsSettings.pipeWidth + 16, 20);
    ctx.fillRect(pipe.x - 8, bottom, physicsSettings.pipeWidth + 16, 20);
    return;
  }
  ctx.fillStyle = "#e4ff4f";
  ctx.fillRect(pipe.x, 0, physicsSettings.pipeWidth, top);
  ctx.fillRect(pipe.x, bottom, physicsSettings.pipeWidth, canvasHeight - groundHeight - bottom);
  ctx.fillStyle = "#b7d72d";
  ctx.fillRect(pipe.x + 10, 0, 8, top);
  ctx.fillRect(pipe.x + 10, bottom, 8, canvasHeight - groundHeight - bottom);
  ctx.fillStyle = "#f1ff9b";
  ctx.fillRect(pipe.x - 8, top - 20, physicsSettings.pipeWidth + 16, 20);
  ctx.fillRect(pipe.x - 8, bottom, physicsSettings.pipeWidth + 16, 20);
}

function drawGround() {
  if (ogMode) {
    ctx.fillStyle = "#ded895";
    ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight);
    ctx.fillStyle = "#75bf45";
    ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, 8);
    ctx.strokeStyle = "rgba(126, 104, 63, .25)";
    ctx.lineWidth = 2;
    for (let x = -42 + groundOffset; x < canvasWidth; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, canvasHeight - groundHeight + 8);
      ctx.lineTo(x - 28, canvasHeight);
      ctx.stroke();
    }
    return;
  }
  ctx.fillStyle = "#182436";
  ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight);
  ctx.fillStyle = "#e4ff4f";
  ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, 6);
}

function drawBird() {
  const skin = easterEggActive ? { body: "#e4ff4f", wing: "#ff7188", eye: "#162337", beak: "#ffae5b" } : BIRD_SKINS[userSettings.skin];
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);
  ctx.fillStyle = ogMode ? "#f5cf42" : skin.body;
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ogMode ? "#e69d25" : skin.wing;
  ctx.beginPath();
  ctx.ellipse(-7, 6, 13, 7, -.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ogMode ? "#302d2b" : skin.eye;
  ctx.beginPath();
  ctx.arc(7, -6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ogMode ? "#e69d25" : skin.beak;
  ctx.beginPath();
  ctx.moveTo(16, -1); ctx.lineTo(31, 4); ctx.lineTo(16, 8); ctx.closePath(); ctx.fill();
  if (shieldActive) {
    ctx.strokeStyle = "rgba(110, 231, 207, .85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPowerUp(powerUp) {
  const colors = { shield: "#6ee7cf", slow: "#b98cff", multiplier: "#ffcf5c" };
  const symbols = { shield: "S", slow: "~", multiplier: "2X" };
  ctx.save();
  ctx.translate(powerUp.x, powerUp.y);
  ctx.fillStyle = `${colors[powerUp.type]}35`;
  ctx.beginPath();
  ctx.arc(0, 0, powerUp.radius + 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors[powerUp.type];
  ctx.beginPath();
  ctx.arc(0, 0, powerUp.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#101828";
  ctx.font = "700 11px 'DM Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbols[powerUp.type], 0, 1);
  ctx.restore();
}

function setOgMode(enabled) {
  ogMode = enabled;
  checkAchievements();
  document.body.classList.toggle("og-mode", ogMode);
  ogModeButton.setAttribute("aria-pressed", String(ogMode));
  ogModeButton.textContent = ogMode ? "MODERN MODE" : "OG MODE";
  flightStatus.textContent = ogMode ? "OG / 01" : "STANDBY";
  renderGame();
}

function toggleOgMode() {
  setOgMode(!ogMode);
}

function toggleSettings() {
  const isOpen = !settingsPanel.hidden;
  settingsPanel.hidden = isOpen;
  settingsButton.setAttribute("aria-expanded", String(!isOpen));
}

function handleCanvasPointerDown(event) {
  event.preventDefault();
  flap();
}

function renderGame() {
  drawBackground();
  pipes.forEach(drawPipe);
  powerUps.forEach(drawPowerUp);
  drawGround();
  drawBird();
}

// Input and frame loop
function frame(timestamp) {
  const delta = timestamp - lastTime || 16.67;
  lastTime = timestamp;
  if (state === "playing") updateGame(delta);
  renderGame();
  animationFrame = requestAnimationFrame(frame);
}

startButton.addEventListener("click", flap);
pauseButton.addEventListener("click", togglePause);
ogModeButton.addEventListener("click", toggleOgMode);
settingsButton.addEventListener("click", toggleSettings);
settingsClose.addEventListener("click", toggleSettings);
soundSetting.addEventListener("change", () => {
  userSettings.sound = soundSetting.checked;
  saveUserSettings();
  updateAudioGains();
});
musicSetting.addEventListener("change", () => {
  userSettings.music = musicSetting.checked;
  saveUserSettings();
  if (userSettings.music && state === "playing") {
    ensureAudioContext();
    startMusic();
  } else if (!userSettings.music) {
    stopMusic();
  }
  updateAudioGains();
});
muteSetting.addEventListener("change", () => {
  userSettings.mute = muteSetting.checked;
  saveUserSettings();
  updateAudioGains();
});
sfxVolumeSetting.addEventListener("input", () => {
  userSettings.sfxVolume = Number(sfxVolumeSetting.value);
  saveUserSettings();
  applyUserSettings();
  updateAudioGains();
});
musicVolumeSetting.addEventListener("input", () => {
  userSettings.musicVolume = Number(musicVolumeSetting.value);
  saveUserSettings();
  applyUserSettings();
  updateAudioGains();
});
difficultySetting.addEventListener("change", () => {
  userSettings.difficulty = difficultySetting.value;
  saveUserSettings();
});
practiceSetting.addEventListener("change", () => {
  userSettings.practice = practiceSetting.checked;
  saveUserSettings();
});
motionSetting.addEventListener("change", () => {
  userSettings.reducedMotion = motionSetting.checked;
  saveUserSettings();
  applyUserSettings();
});
skinSetting.addEventListener("change", () => {
  userSettings.skin = skinSetting.value;
  saveUserSettings();
  renderGame();
});
backgroundSetting.addEventListener("change", () => {
  userSettings.background = backgroundSetting.value;
  saveUserSettings();
  renderGame();
});
weatherSetting.addEventListener("change", () => {
  userSettings.weather = weatherSetting.value;
  saveUserSettings();
  renderGame();
});
canvas.addEventListener("pointerdown", handleCanvasPointerDown, { passive: false });
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("keydown", (event) => {
  if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
    secretBuffer = `${secretBuffer}${event.key.toLowerCase()}`.slice(-6);
    if (secretBuffer === "flappy") {
      easterEggActive = true;
      achievementToast.querySelector("span").textContent = "SECRET FOUND";
      achievementToast.querySelector("strong").textContent = "RAINBOW BIRD";
      achievementToast.classList.add("visible");
      window.setTimeout(() => achievementToast.classList.remove("visible"), 2400);
      renderGame();
    }
  }
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    flap();
  }
});

resetGame();
applyUserSettings();
updateAchievements();
setOgMode(false);
renderGame();
animationFrame = requestAnimationFrame(frame);
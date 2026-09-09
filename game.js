const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best");
const overlay = document.querySelector("#overlay");
const overlayKicker = document.querySelector("#overlayKicker");
const overlayTitle = document.querySelector("#overlayTitle");
const startButton = document.querySelector("#startButton");
const statusText = document.querySelector("#statusText");
const flightStatus = document.querySelector("#flightStatus");
const ogModeButton = document.querySelector("#ogMode");

const width = canvas.width;
const height = canvas.height;
const groundHeight = 78;
const bird = { x: 180, y: height / 2, radius: 18, velocity: 0, rotation: 0 };
const settings = { gravity: 0.43, flap: -8.2, speed: 3.4, gap: 220, pipeWidth: 76 };
let pipes = [];
let score = 0;
let best = Number(localStorage.getItem("flappypy-best") || 0);
let state = "ready";
let lastTime = 0;
let animationFrame;
let groundOffset = 0;
let ogMode = false;

bestElement.textContent = String(best).padStart(3, "0");

function resetGame() {
  bird.y = height / 2;
  bird.velocity = 0;
  bird.rotation = 0;
  pipes = [{ x: width + 120, gapY: 355 }];
  score = 0;
  updateScore();
}

function updateScore() {
  scoreElement.textContent = String(score).padStart(3, "0");
  bestElement.textContent = String(best).padStart(3, "0");
}

function begin() {
  resetGame();
  state = "playing";
  overlay.classList.add("hidden");
  statusText.textContent = "IN FLIGHT";
  flightStatus.textContent = "LIVE / 01";
  flap();
}

function endGame() {
  state = "gameover";
  best = Math.max(best, score);
  localStorage.setItem("flappypy-best", best);
  updateScore();
  overlayKicker.textContent = score > 0 ? "FLIGHT LOGGED" : "THE SKY IS WIDE";
  overlayTitle.innerHTML = score > 0 ? `${score} ${score === 1 ? "GAP" : "GAPS"}.<br />Nice flying.` : "A little<br />too low.";
  startButton.querySelector("span").textContent = "FLY AGAIN";
  overlay.classList.remove("hidden");
  statusText.textContent = "FLIGHT ENDED";
  flightStatus.textContent = "LANDED";
}

function flap() {
  if (state === "ready" || state === "gameover") begin();
  if (state !== "playing") return;
  bird.velocity = settings.flap;
}

function addPipe() {
  const margin = 130;
  const gapY = margin + Math.random() * (height - groundHeight - margin * 2);
  pipes.push({
    x: width + settings.pipeWidth,
    gapY,
    counted: false
  });
}

function hitsPipe(pipe) {
  const birdLeft = bird.x - bird.radius + 4;
  const birdRight = bird.x + bird.radius - 4;
  const birdTop = bird.y - bird.radius + 4;
  const birdBottom = bird.y + bird.radius - 4;
  const inX = birdRight > pipe.x && birdLeft < pipe.x + settings.pipeWidth;
  const inGap = birdTop > pipe.gapY - settings.gap / 2 && birdBottom < pipe.gapY + settings.gap / 2;
  return inX && !inGap;
}

function update(delta) {
  const step = Math.min(delta / 16.67, 2);
  bird.velocity += settings.gravity * step;
  bird.y += bird.velocity * step;
  bird.rotation = Math.min(Math.PI / 2, bird.velocity / 10);
  groundOffset = (groundOffset + settings.speed * step) % 42;
  pipes.forEach((pipe) => { pipe.x -= settings.speed * step; });
  if (pipes.length && pipes[0].x < -settings.pipeWidth - 20) pipes.shift();
  if (pipes.length && pipes[pipes.length - 1].x < width - 330) addPipe();
  pipes.forEach((pipe) => {
    if (!pipe.counted && pipe.x + settings.pipeWidth < bird.x) {
      pipe.counted = true;
      score += 1;
      if (score > best) best = score;
      updateScore();
    }
  });
  if (bird.y - bird.radius < 0 || bird.y + bird.radius > height - groundHeight || pipes.some(hitsPipe)) endGame();
}

function drawBackground() {
  if (ogMode) {
    ctx.fillStyle = "#5ec8ed";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, .72)";
    ctx.beginPath();
    ctx.arc(130, 150, 34, 0, Math.PI * 2);
    ctx.arc(166, 150, 28, 0, Math.PI * 2);
    ctx.arc(194, 150, 22, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#152b3d");
  sky.addColorStop(1, "#406b74");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  drawModernCity();
  drawFlyingCars();
  ctx.fillStyle = "rgba(228, 255, 79, .12)";
  ctx.beginPath();
  ctx.arc(width - 125, 135, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(16, 24, 40, .18)";
  for (let x = -80; x < width + 100; x += 190) {
    ctx.beginPath();
    ctx.moveTo(x, height - groundHeight);
    ctx.lineTo(x + 110, height - groundHeight - 100);
    ctx.lineTo(x + 260, height - groundHeight);
    ctx.fill();
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
  const skylineBase = height - groundHeight - 8;
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
  drawModernLights(skylineBase);
  ctx.fillStyle = "rgba(9, 21, 33, .72)";
  ctx.fillRect(330, skylineBase - 492, 8, 22);
  ctx.fillRect(502, skylineBase - 442, 9, 28);
  const pollutionDrift = (performance.now() / 90) % 70;
  ctx.fillStyle = "rgba(144, 157, 148, .3)";
  ctx.beginPath();
  ctx.arc(334 + pollutionDrift * .2, skylineBase - 520, 30, 0, Math.PI * 2);
  ctx.arc(360 + pollutionDrift * .3, skylineBase - 536, 38, 0, Math.PI * 2);
  ctx.arc(394 + pollutionDrift * .4, skylineBase - 522, 32, 0, Math.PI * 2);
  ctx.arc(506 + pollutionDrift * .3, skylineBase - 472, 34, 0, Math.PI * 2);
  ctx.arc(542 + pollutionDrift * .4, skylineBase - 488, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(115, 132, 125, .28)";
  ctx.fillRect(0, skylineBase - 155, width, 120);
  ctx.fillStyle = "rgba(87, 105, 101, .18)";
  ctx.fillRect(0, skylineBase - 255, width, 48);
  ctx.fillStyle = "rgba(193, 180, 143, .2)";
  for (let particle = 0; particle < 34; particle += 1) {
    const particleX = (particle * 97 + pollutionDrift * (particle % 3 + 1)) % width;
    const particleY = skylineBase - 35 - ((particle * 53) % 240);
    const particleSize = particle % 4 === 0 ? 3 : 1.5;
    ctx.fillRect(particleX, particleY, particleSize, particleSize);
  }
  const smog = ctx.createLinearGradient(0, skylineBase - 240, 0, skylineBase);
  smog.addColorStop(0, "rgba(154, 171, 156, 0)");
  smog.addColorStop(1, "rgba(119, 137, 126, .42)");
  ctx.fillStyle = smog;
  ctx.fillRect(0, skylineBase - 240, width, 240);
}

function drawModernLights(skylineBase) {
  const time = performance.now() / 900;
  const colors = ["#6ee7cf", "#b98cff", "#ff7188", "#e4ff4f"];
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let index = 0; index < 4; index += 1) {
    const x = 90 + index * 180 + Math.sin(time + index) * 24;
    const beam = ctx.createLinearGradient(x, skylineBase - 430, x + 60, skylineBase);
    beam.addColorStop(0, `${colors[index]}66`);
    beam.addColorStop(1, `${colors[index]}00`);
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x - 10, skylineBase - 430);
    ctx.lineTo(x + 10, skylineBase - 430);
    ctx.lineTo(x + 85, skylineBase);
    ctx.lineTo(x - 50, skylineBase);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#e4ff4f";
  [90, 270, 450, 630].forEach((x, index) => {
    const y = skylineBase - 395 - (index % 2) * 55;
    ctx.fillRect(x - 18, y, 36, 3);
    ctx.fillRect(x - 9, y + 6, 18, 2);
  });
  ctx.restore();
}

function drawFlyingCars() {
  const time = performance.now() / 1000;
  const cars = [
    { speed: 42, y: 286, scale: .8, color: "#6ee7cf", offset: 40 },
    { speed: 29, y: 438, scale: 1, color: "#ff7188", offset: 310 },
    { speed: 54, y: 560, scale: .62, color: "#b98cff", offset: 520 }
  ];
  cars.forEach((car) => {
    const cycle = width + 180;
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
  const top = pipe.gapY - settings.gap / 2;
  const bottom = pipe.gapY + settings.gap / 2;
  if (ogMode) {
    ctx.fillStyle = "#45ad4d";
    ctx.fillRect(pipe.x, 0, settings.pipeWidth, top);
    ctx.fillRect(pipe.x, bottom, settings.pipeWidth, height - groundHeight - bottom);
    ctx.fillStyle = "#23853a";
    ctx.fillRect(pipe.x + 10, 0, 9, top);
    ctx.fillRect(pipe.x + 10, bottom, 9, height - groundHeight - bottom);
    ctx.fillStyle = "#63c957";
    ctx.fillRect(pipe.x - 8, top - 20, settings.pipeWidth + 16, 20);
    ctx.fillRect(pipe.x - 8, bottom, settings.pipeWidth + 16, 20);
    return;
  }
  ctx.fillStyle = "#e4ff4f";
  ctx.fillRect(pipe.x, 0, settings.pipeWidth, top);
  ctx.fillRect(pipe.x, bottom, settings.pipeWidth, height - groundHeight - bottom);
  ctx.fillStyle = "#b7d72d";
  ctx.fillRect(pipe.x + 10, 0, 8, top);
  ctx.fillRect(pipe.x + 10, bottom, 8, height - groundHeight - bottom);
  ctx.fillStyle = "#f1ff9b";
  ctx.fillRect(pipe.x - 8, top - 20, settings.pipeWidth + 16, 20);
  ctx.fillRect(pipe.x - 8, bottom, settings.pipeWidth + 16, 20);
}

function drawGround() {
  if (ogMode) {
    ctx.fillStyle = "#ded895";
    ctx.fillRect(0, height - groundHeight, width, groundHeight);
    ctx.fillStyle = "#75bf45";
    ctx.fillRect(0, height - groundHeight, width, 8);
    ctx.strokeStyle = "rgba(126, 104, 63, .25)";
    ctx.lineWidth = 2;
    for (let x = -42 + groundOffset; x < width; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, height - groundHeight + 8);
      ctx.lineTo(x - 28, height);
      ctx.stroke();
    }
    return;
  }
  ctx.fillStyle = "#182436";
  ctx.fillRect(0, height - groundHeight, width, groundHeight);
  ctx.fillStyle = "#e4ff4f";
  ctx.fillRect(0, height - groundHeight, width, 6);
  ctx.strokeStyle = "rgba(244, 240, 231, .13)";
  ctx.lineWidth = 2;
  for (let x = -42 + groundOffset; x < width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, height - groundHeight + 6);
    ctx.lineTo(x - 28, height);
    ctx.stroke();
  }
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);
  ctx.fillStyle = ogMode ? "#f5cf42" : "#f4f0e7";
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ogMode ? "#e69d25" : "#e4ff4f";
  ctx.beginPath();
  ctx.ellipse(-7, 6, 13, 7, -.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ogMode ? "#302d2b" : "#162337";
  ctx.beginPath();
  ctx.arc(7, -6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ogMode ? "#e69d25" : "#e4ff4f";
  ctx.beginPath();
  ctx.moveTo(16, -1); ctx.lineTo(31, 4); ctx.lineTo(16, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function setOgMode(enabled) {
  ogMode = enabled;
  document.body.classList.toggle("og-mode", ogMode);
  ogModeButton.setAttribute("aria-pressed", String(ogMode));
  ogModeButton.textContent = ogMode ? "MODERN MODE" : "OG MODE";
  flightStatus.textContent = ogMode ? "OG / 01" : "STANDBY";
  draw();
}

function toggleOgMode() {
  setOgMode(!ogMode);
}

function draw() {
  drawBackground();
  pipes.forEach(drawPipe);
  drawGround();
  drawBird();
}

function frame(timestamp) {
  const delta = timestamp - lastTime || 16.67;
  lastTime = timestamp;
  if (state === "playing") update(delta);
  draw();
  animationFrame = requestAnimationFrame(frame);
}

startButton.addEventListener("click", flap);
ogModeButton.addEventListener("click", toggleOgMode);
canvas.addEventListener("pointerdown", flap);
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    flap();
  }
});

resetGame();
setOgMode(false);
draw();
animationFrame = requestAnimationFrame(frame);
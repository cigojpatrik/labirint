//  1. SVG POINTS 
const svgPoints = `234,2 234,10 250,10 250,58 266,58 266,90 282,90 282,74 298,74 298,106 282,106 282,122 298,122 298,154 330,154 330,138 314,138 314,122 330,122 330,90 346,90 346,106 362,106 362,90 378,90 378,106 394,106 394,90 442,90 442,138 394,138 394,122 378,122 378,138 346,138 346,170 330,170 330,202 314,202 314,218 330,218 330,234 314,234 314,266 298,266 298,282 330,282 330,314 362,314 362,330 378,330 378,314 394,314 394,330 458,330 458,346 474,346 474,426 458,426 458,442 474,442 474,458 442,458 442,474 378,474 378,458 362,458 362,474 346,474 346,442 362,442 362,426 330,426 330,442 314,442 314,410 298,410 298,458 330,458 330,474 250,474 250,482`;

// 2. PRETVORBA SVG → POINTS 
const raw = svgPoints
  .trim()
  .split(/\s+/)
  .flatMap(p => p.split(",").map(Number));

//3. CANVAS SETUP
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const mouseImg = new Image();
mouseImg.src = "img/mouse.png";

const trapImg = new Image();
trapImg.src = "img/trap.png";

const catImg = new Image();
catImg.src = "img/cat.png";

const jumpSound = new Audio("sounds/jump.mp3");
const gameOverSound = new Audio("sounds/gameover.mp3");
const winSound = new Audio("sounds/win.mp3");
const bgMusic = new Audio("sounds/bg.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.4;

canvas.width = 800;
canvas.height = 800;

// Risanje poti 
const PATH_WIDTH = 18;
ctx.lineWidth = PATH_WIDTH;
ctx.strokeStyle = "#ffb300";
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.miterLimit = 5;
ctx.shadowColor = "#f49c4e";
ctx.shadowBlur = 15;

// 4. SCALE 
const originalWidth = 484;
const originalHeight = 484;

const scaleX = canvas.width / originalWidth;
const scaleY = canvas.height / originalHeight;

// pretvori 
const poly = [];
for (let k = 0; k < raw.length; k += 2) {
  poly.push({ x: raw[k] * scaleX, y: raw[k + 1] * scaleY });
}

// 5. HELPERS
function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

//  6. NAREDI GOSTE TOČKE PO POTI  
function buildSamples(polyline, stepPx = 6) {
  const samples = [];
  let i = 0;

  let curr = { ...polyline[0] };
  samples.push({ ...curr });

  while (i < polyline.length - 1) {
    const next = polyline[i + 1];
    const L = dist(curr, next);

    if (L === 0) {
      i++;
      continue;
    }

    if (L >= stepPx) {
      const t = stepPx / L;
      curr = lerp(curr, next, t);
      samples.push({ ...curr });
    } else {
      // če je segment prekratek, pojdi na naslednji segment
      curr = { ...next };
      i++;
    }
  }

  // poskrbi, da je zadnja točka res konec
  const last = polyline[polyline.length - 1];
  const end = samples[samples.length - 1];
  if (dist(end, last) > 0.001) samples.push({ ...last });

  return samples;
}


const samples = buildSamples(poly, 6);

// 7. GAME STATE 
let rafId = null;

let mode = "idle"; // idle | drawing | play | over | win

// koliko sample točk je že “narisanih”
let drawIndex = 1;

// miš premikanje po samples
let mouseIndex = 0;

// mačka lovi miško po isti poti
let catIndex = -40;
let chaseMode = false;

// jump
let isJumping = false;
let jumpFramesLeft = 0;

// traps
const traps = [];
let trapTargets = [];     // 3 izbrani idx-ji
let trapTargetPtr = 0;    // kateri target je naslednji za postavit

let nextTrapCheckAt = 60; // ko narisanih >= to, preveri možnost za trap
let lastTrapIdx = -9999;

//  8. KONFIG 
const DRAW_SPEED = 1;         // samples na frame 
const MOUSE_SPEED = 0.4;        // samples na frame 
const TRAP_COUNT = 3; 
const TRAP_PROB = 0.35;       // verjetnost, da ob checku postavi trap
const TRAP_MIN_GAP = 50;      // minimalna razdalja med trap idx
const TRAP_SIZE = 16;         // velikost mišolovke 
const MOUSE_R = 10;           // polmer miši
const COLLISION_R = 12;       // kolizija miš ↔ trap 
const JUMP_FRAMES = 40;       // koliko framov traja skok
const JUMP_HEIGHT = 27;       // vizualni “dvig” miši med skokom
const CAT_SPEED = 0.4;
const CAT_START_DELAY = 40;

//  9. RISANJE ELEMENTOV 
function drawPath(upToIdx) {
  ctx.beginPath();
  ctx.moveTo(samples[0].x, samples[0].y);

  for (let i = 1; i < upToIdx; i++) {
    ctx.lineTo(samples[i].x, samples[i].y);
  }
  ctx.stroke();
}

function drawTrap(t) {
  const { x, y } = t.pos;

  const size = 34; 

  // Če slika še ni naložena, nariši fallback trikotnik
  if (!trapImg.complete) {
    ctx.fillStyle = "#b91c1c";
    ctx.beginPath();
    ctx.moveTo(x, y - TRAP_SIZE);
    ctx.lineTo(x + TRAP_SIZE, y + TRAP_SIZE);
    ctx.lineTo(x - TRAP_SIZE, y + TRAP_SIZE);
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.drawImage(
    trapImg,
    x - size / 2,
    y - size / 2,
    size,
    size
  );
}


function drawMouse(idx) {
  const i = Math.floor(idx);
  const nextI = Math.min(samples.length - 1, i + 1);

  const p = samples[i];
  const next = samples[nextI];

  const yOffset = isJumping ? -JUMP_HEIGHT : 0;

  const size = 40;

  //  IZRAČUN SMERI 
  const dx = next.x - p.x;
  const dy = next.y - p.y;

  const angle = Math.atan2(dy, dx); // kot v radianih

  ctx.save();

  // premakni koordinatni sistem na miš
  ctx.translate(p.x, p.y + yOffset);

  // zavrti v smer gibanja
  ctx.rotate(angle - Math.PI / 2);



  // nariši sliko centrirano
  ctx.drawImage(
    mouseImg,
    -size / 2,
    -size / 2,
    size,
    size
  );

  ctx.restore();
}

function drawCat(idx) {
  if (idx < 0) return;

  const safeIdx = Math.floor(Math.max(0, Math.min(samples.length - 1, idx)));
  const nextI = Math.min(samples.length - 1, safeIdx + 1);

  const p = samples[safeIdx];
  const next = samples[nextI];

  const dx = next.x - p.x;
  const dy = next.y - p.y;
  const angle = Math.atan2(dy, dx);

  const size = 54;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle + Math.PI / 2 + Math.PI);

  if (catImg.complete && catImg.naturalWidth > 0) {
    ctx.drawImage(
      catImg,
      -size / 2,
      -size / 2,
      size,
      size
    );
  } else {
    // fallback, če ni img/cat.png
    ctx.fillStyle = "#6d4c41";
    ctx.beginPath();
    ctx.arc(0, 0, size / 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-14, -14);
    ctx.lineTo(-6, -30);
    ctx.lineTo(0, -10);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(14, -14);
    ctx.lineTo(6, -30);
    ctx.lineTo(0, -10);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}


//  10. TRAPS LOGIC 

function pickTrapTargets() {
  const picked = [];

  for (let attempts = 0; attempts < 10000 && picked.length < TRAP_COUNT; attempts++) {
    // izberi random idx po poti (ne preblizu začetka/konec)
    const idx = Math.floor(Math.random() * (samples.length - 120)) + 60;

    if (idx > samples.length - 60) continue;
    if (idx < 60) continue;

    // preveri minimalni razmik
    let ok = true;
    for (const p of picked) {
      if (Math.abs(idx - p) < TRAP_MIN_GAP) { ok = false; break; }
    }
    if (!ok) continue;

    picked.push(idx);
  }

  picked.sort((a, b) => a - b); 
  trapTargets = picked;
  trapTargetPtr = 0;
}


function mouseHitsTrap() {
  const mi = Math.floor(mouseIndex);
  const mp = samples[Math.max(0, Math.min(samples.length - 1, mi))];

  for (const t of traps) {
    const tp = t.pos;
    const d = Math.hypot(mp.x - tp.x, mp.y - tp.y);
    if (d <= COLLISION_R) return true;
  }
  return false;
}


//  11. GAME LOOP 
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1) narisana pot
  if (mode === "drawing" || mode === "play" || mode === "over" || mode === "win") {
    drawPath(drawIndex);
  }


  // 2) traps (vidni samo v prvem krogu)
if (!chaseMode) {
  for (const t of traps) drawTrap(t);
}

  // 3) miš
  if (mode !== "idle") {
    const visibleMouseIdx = mode === "drawing" ? 0 : mouseIndex;
    drawMouse(visibleMouseIdx);
  }
  // 4) mačka 
	if (chaseMode && mode === "play") {
	  drawCat(catIndex);
	}

  //  state updates 
  if (mode === "drawing") {

  drawIndex = Math.min(samples.length, drawIndex + DRAW_SPEED);

  //  sproti postavljaj 3 mišolovke, ko pot pride do njihovih točk
  while (trapTargetPtr < trapTargets.length && drawIndex >= trapTargets[trapTargetPtr]) {
    const idx = trapTargets[trapTargetPtr];
    traps.push({ idx, pos: samples[idx] });
    trapTargetPtr++;
  }

  // ko narisano do konca play
  if (drawIndex >= samples.length) {
    mode = "play";
    mouseIndex = 0;
  }
}


  if (mode === "play") {
    // jump timer
    if (jumpFramesLeft > 0) {
      jumpFramesLeft--;
      if (jumpFramesLeft === 0) isJumping = false;
    }

    //mouseIndex = Math.min(samples.length - 1, mouseIndex + MOUSE_SPEED);
	if (!chaseMode) {
	  mouseIndex = Math.min(samples.length - 1, mouseIndex + MOUSE_SPEED);
	}

    // collision samo če NI skoka
    if (!chaseMode && !isJumping && mouseHitsTrap()) {
      mode = "over";
      cancelAnimationFrame(rafId);
      rafId = null;
		bgMusic.pause();
		bgMusic.currentTime = 0;
		gameOverSound.play();
      Swal.fire({
        icon: "error",
        title: "Konec igre!",
        text: "Miš je stopila na mišolovko. Poskusi znova.",
		background: "#fff6a0",
		color: "#5d4037",
		confirmButtonColor: "#FFB300"
      }).then(() => reset());
      return;
    }

    // win
    /*if (mouseIndex >= samples.length - 1) {
      mode = "win";
      cancelAnimationFrame(rafId);
      rafId = null;
		bgMusic.pause();
		bgMusic.currentTime = 0;
		winSound.play();
      Swal.fire({
        icon: "success",
        title: "Zmaga!",
        text: "Prišel si do cilja brez poškodb.",
		background: "#fff6a0",
		color: "#5d4037",
		confirmButtonColor: "#FFB300"
      });
      return;
    }*/
	// prvi prihod do cilja: miš se vrne na start, za njo pa začne teči mačka
	if (!chaseMode && mouseIndex >= samples.length - 1) {
	  chaseMode = true;
	  mouseIndex = 0;
	  catIndex = -CAT_START_DELAY;
	  winSound.currentTime = 0;
	  winSound.play();
	}
	// chase način: miš in mačka ves čas tečeta po isti poti v zanki
if (chaseMode) {
  mouseIndex += MOUSE_SPEED;
  catIndex += CAT_SPEED;

  if (mouseIndex >= samples.length - 1) {
    mouseIndex = 0;
  }

  if (catIndex >= samples.length - 1) {
    catIndex = -CAT_START_DELAY;
  }
}
  }

  rafId = requestAnimationFrame(render);
}

//  12. CONTROLS 
function startGame() {
	bgMusic.play();
	document.activeElement?.blur();
  reset(false); // počisti, ampak naj ne ustavi sweetalert chain
	pickTrapTargets();
  mode = "drawing";
  drawIndex = 1;
  mouseIndex = 0;
  catIndex = -CAT_START_DELAY;
chaseMode = false;

  nextTrapCheckAt = 60;
  lastTrapIdx = -9999;

  // postavi “miš” na začetek 
  isJumping = false;
  jumpFramesLeft = 0;

  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(render);
}

function reset(showAlert = false) {
	

  mode = "idle";
	

  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  traps.length = 0;

  drawIndex = 1;
  mouseIndex = 0;
  catIndex = -CAT_START_DELAY;
chaseMode = false;

  isJumping = false;
  jumpFramesLeft = 0;

  if (showAlert) {
    Swal.fire({ icon: "info", title: "Reset", text: "Igra je ponastavljena." });
  }
}

// SPACE = jump
window.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
	e.preventDefault();     // ← DODAJ TO
	e.stopPropagation(); 
  // skok dovoljen samo med igranjem
  if (mode !== "play") return;

  // ne spam-aj skoka
  if (isJumping) return;

  isJumping = true;
  jumpFramesLeft = JUMP_FRAMES;
  jumpSound.currentTime = 0;
jumpSound.play();
});

//  13. BUTTONS 
document.getElementById("gumb").addEventListener("click", startGame);
document.getElementById("gumb2").addEventListener("click", () => reset(true));









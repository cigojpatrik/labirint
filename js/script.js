// ===== 1. SVG POINTS (tvoja pot) =====
const svgPoints = `234,2 234,10 250,10 250,58 266,58 266,90 282,90 282,74 298,74 298,106 282,106 282,122 298,122 298,154 330,154 330,138 314,138 314,122 330,122 330,90 346,90 346,106 362,106 362,90 378,90 378,106 394,106 394,90 442,90 442,138 394,138 394,122 378,122 378,138 346,138 346,170 330,170 330,202 314,202 314,218 330,218 330,234 314,234 314,266 298,266 298,282 330,282 330,314 362,314 362,330 378,330 378,314 394,314 394,330 458,330 458,346 474,346 474,426 458,426 458,442 474,442 474,458 442,458 442,474 378,474 378,458 362,458 362,474 346,474 346,442 362,442 362,426 330,426 330,442 314,442 314,410 298,410 298,458 330,458 330,474 250,474 250,482`;

// ===== 2. PRETVORBA SVG → CANVAS FORMAT =====
const points = svgPoints
  .trim()
  .split(/\s+/)
  .flatMap(p => p.split(',').map(Number));

// ===== 3. CANVAS SETUP =====
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Nastavi novo širino in višino platna na 800px
canvas.width = 800;
canvas.height = 800;

// Nastavitve za izris
ctx.lineWidth = 10;
ctx.strokeStyle = "#F7F794";
ctx.lineCap = "round";
ctx.shadowColor = "#FFFF66";
ctx.shadowBlur = 5;

// ===== 4. NASTAVITVE ANIMACIJE =====
let steps = 10;        // smoothness
let speed = 4;         // hitrost med segmenti
let step = 0;
let i = 0;
let shown = false;

// ===== 5. Usklajevanje poti z velikostjo platna =====
const originalWidth = 484;  // Originalna širina labirinta (484px)
const originalHeight = 484; // Originalna višina labirinta (484px)

const scaleX = canvas.width / originalWidth;  // Faktor skale za širino
const scaleY = canvas.height / originalHeight; // Faktor skale za višino

// Prilagodi koordinate poti za novo platno
const scaledPoints = points.map((point, index) => {
  return index % 2 === 0
    ? point * scaleX // prilagodi X koordinate
    : point * scaleY; // prilagodi Y koordinate
});

// ===== 6. INTERPOLACIJA =====
function interpolate(x1, y1, x2, y2, step) {
  return {
    x: x1 + ((x2 - x1) / steps) * step,
    y: y1 + ((y2 - y1) / steps) * step
  };
}

// ===== 7. ANIMACIJA RISANJA =====
function animateDrawing() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  i = 0;
  shown = true;

  ctx.beginPath();
  ctx.moveTo(scaledPoints[0], scaledPoints[1]);

  function drawLine() {
    if (!shown || i >= scaledPoints.length / 2 - 1) return;

    const x1 = scaledPoints[i * 2];
    const y1 = scaledPoints[i * 2 + 1];
    const x2 = scaledPoints[(i + 1) * 2];
    const y2 = scaledPoints[(i + 1) * 2 + 1];

    step = 0;

    function drawSmooth() {
      if (!shown) return;

      if (step <= steps) {
        const { x, y } = interpolate(x1, y1, x2, y2, step);
        ctx.lineTo(x, y);
        ctx.stroke();
        step++;
        requestAnimationFrame(drawSmooth);
      } else {
        i++;
        setTimeout(drawLine, speed);
      }
    }

    drawSmooth();
  }

  drawLine();
}

// ===== 8. RESET =====
function reset() {
  shown = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ===== 9. GUMBI =====
document.getElementById("gumb").addEventListener("click", animateDrawing);
document.getElementById("gumb2").addEventListener("click", reset);

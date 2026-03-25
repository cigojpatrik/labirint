

//
//  Kako deluje:
//  1. Koordinate poti so zapisane kot SVG tocke (x,y pari)
//  2. Te koordinate pretvorimo v dve tabeli: samplesX in samplesY
//  3. Mis se premika po teh tockah, macka jo zasleduje
//  4. Povsod kjer se vrednost NE SPREMINJA uporabimo const,
//     kjer se vrednost SPREMINJA med igro pa let




// 1. SVG TOCKE - koordinate poti labirinta

// Pot labirinta je opisana s tockami "x,y x,y x,y ..."
// To je dolg niz ki ga bomo razdelili na stevilke
// const ker se ta niz nikoli ne spremeni
const svgPoints = "234,2 234,10 250,10 250,58 266,58 266,90 282,90 282,74 298,74 298,106 282,106 282,122 298,122 298,154 330,154 330,138 314,138 314,122 330,122 330,90 346,90 346,106 362,106 362,90 378,90 378,106 394,106 394,90 442,90 442,138 394,138 394,122 378,122 378,138 346,138 346,170 330,170 330,202 314,202 314,218 330,218 330,234 314,234 314,266 298,266 298,282 330,282 330,314 362,314 362,330 378,330 378,314 394,314 394,330 458,330 458,346 474,346 474,426 458,426 458,442 474,442 474,458 442,458 442,474 378,474 378,458 362,458 362,474 346,474 346,442 362,442 362,426 330,426 330,442 314,442 314,410 298,410 298,458 330,458 330,474 250,474 250,482";



// 2. PRETVORBA SVG TOCK V STEVILKE

// trim() odstrani presledke na zacetku in koncu niza
// split(/\s+/) razdeli niz po presledkih v tabelo parov ["234,2", "234,10", ...]
// const ker rawParts po inicializaciji ne zamenjamo z drugo tabelo
const rawParts = svgPoints.trim().split(/\s+/);

// Ustvarimo dve prazni tabeli za x in y koordinate
// const ker referenca na tabelo ostane ista (vsebino samo polnimo z .push)
const rawX = [];
const rawY = [];

// Gremo cez vsak par "x,y" in ga razdelimo na dve stevilki
for (let i = 0; i < rawParts.length; i++) {
    // split(",") razdeli "234,2" na ["234", "2"]
    const par = rawParts[i].split(",");
    // Number() pretvori niz "234" v stevilko 234
    rawX.push(Number(par[0])); // x koordinata
    rawY.push(Number(par[1])); // y koordinata
}



// 3. CANVAS SETUP - pridobimo canvas element iz HTML

// getElementById poisce element z id="canvas" v HTML datoteki
// const ker canvas element ostane isti ves cas
const canvas = document.getElementById("canvas");

// getContext("2d") nam da orodje za risanje na canvas
// ctx je okrajsava za "context" - z njim risemo
const ctx = canvas.getContext("2d");

// Nalozimo slike za mis, past in macko
// new Image() ustvari nov prazen objekt za sliko
const mouseImg = new Image();
mouseImg.src = "img/mouse.png"; // pot do datoteke slike

const trapImg = new Image();
trapImg.src = "img/trap.png";

const catImg = new Image();
catImg.src = "img/cat.png";

// Nalozimo zvocne datoteke
// new Audio() ustvari nov zvocni objekt
const jumpSound = new Audio("sounds/jump.mp3");
const gameOverSound = new Audio("sounds/gameover.mp3");
const winSound = new Audio("sounds/win.mp3");
const bgMusic = new Audio("sounds/bg.mp3");
bgMusic.loop = true;    // glasba se ponavlja v zanki
bgMusic.volume = 0.4;   // glasnost: 0 = tih, 1 = glasno

// Nastavimo velikost canvasa v pikslih
canvas.width = 800;
canvas.height = 800;

// Nastavitve kako bo izgledala narisana pot
ctx.lineWidth = 18;         // debelina crte v pikslih
ctx.strokeStyle = "#ffb300"; // barva crte (rumeno-oranzna)
ctx.lineCap = "round";       // zakrouzeni konci crte
ctx.lineJoin = "round";      // zakrouzeni koti crte
ctx.miterLimit = 5;
ctx.shadowColor = "#f49c4e"; // barva sence pod crto
ctx.shadowBlur = 15;         // kako zamegljena je senca



// 4. SKALIRANJE - prilagodimo koordinate velikosti canvasa

// Originalne SVG koordinate so bile narisane za 484x484 px platno
// Nas canvas je 800x800, zato moramo koordinate pomnoziti s faktorjem
const originalWidth = 484;
const originalHeight = 484;

// scaleX pove koliko vecji je nas canvas od originalnega po sirini
// primer: 800 / 484 = 1.65 (koordinate pomnozimo z 1.65)
const scaleX = canvas.width / originalWidth;
const scaleY = canvas.height / originalHeight;

// Ustvarimo tabeli za skaliran koordinate poti (vogali labirinta)
// polyX in polyY vsebujeta le kljucne vogalne tocke
const polyX = [];
const polyY = [];

for (let k = 0; k < rawX.length; k++) {
    // Vsako koordinato pomnozimo s faktorjem skaliranja
    polyX.push(rawX[k] * scaleX);
    polyY.push(rawY[k] * scaleY);
}



// 5. POMOCNE FUNKCIJE


// Funkcija dist() izracuna razdaljo med dvema tockama
// Uporablja Pitagorov izrek: c = sqrt(a^2 + b^2)
// Parametri: ax,ay = prva tocka,  bx,by = druga tocka
function dist(ax, ay, bx, by) {
    const dx = ax - bx; // razlika po x osi
    const dy = ay - by; // razlika po y osi
    // Math.sqrt = koren,  dx*dx = dx na kvadrat
    return Math.sqrt(dx * dx + dy * dy);
}

// Funkcija lerpX() izracuna vmesno vrednost med ax in bx
// t = 0.0 vrne ax,  t = 0.5 vrne sredino,  t = 1.0 vrne bx
// "lerp" je okrajsava za "linear interpolation"
function lerpX(ax, bx, t) {
    return ax + (bx - ax) * t;
}

// Enako kot lerpX, samo za y koordinato
function lerpY(ay, by, t) {
    return ay + (by - ay) * t;
}



// 6. GOSTEJSE TOCKE PO POTI

// polyX/polyY vsebujeta samo vogale labirinta (redke tocke)
// Za gladko animacijo potrebujemo tocke na vsakih 6 px
// Rezultat shranimo v samplesX in samplesY
// let ker jih buildSamples() zamenja z novo tabelo
let samplesX = [];
let samplesY = [];

function buildSamples() {
    const stepPx = 6; // zelena razdalja med sosednjima tockama

    // Pobrisi staro vsebino in zacni znova
    samplesX = [];
    samplesY = [];

    // Zacnemo pri prvi tocki poti
    let currX = polyX[0];
    let currY = polyY[0];
    samplesX.push(currX);
    samplesY.push(currY);

    let i = 0; // i = kateri segment obdelujemo (med tockama i in i+1)

    while (i < polyX.length - 1) {
        // Naslednja vogalna tocka
        const nextX = polyX[i + 1];
        const nextY = polyY[i + 1];

        // Razdalja od trenutne pozicije do naslednje vogalne tocke
        const L = dist(currX, currY, nextX, nextY);

        // Ce sta tocki na isti poziciji, preskocci segment
        if (L === 0) {
            i++;
            continue; // nadaljuj z naslednjo iteracijo zanke
        }

        if (L >= stepPx) {
            // Segment je dovolj dolg: naredimo korak dolzine stepPx
            // t je delez poti ki ga naredimo (npr. 6/100 = 0.06)
            const t = stepPx / L;
            // Izracunamo novo pozicijo vzdolz segmenta
            currX = lerpX(currX, nextX, t);
            currY = lerpY(currY, nextY, t);
            samplesX.push(currX);
            samplesY.push(currY);
        } else {
            // Segment je krajsi od stepPx: skoci na naslednjo vogalno tocko
            currX = nextX;
            currY = nextY;
            i++; // pojdi na naslednji segment
        }
    }

    // Poskrbi da je absolutno zadnja tocka res tocno konec poti
    const lastX = polyX[polyX.length - 1];
    const lastY = polyY[polyY.length - 1];
    const endX = samplesX[samplesX.length - 1];
    const endY = samplesY[samplesY.length - 1];
    if (dist(endX, endY, lastX, lastY) > 0.001) {
        samplesX.push(lastX);
        samplesY.push(lastY);
    }
}

// Poklicemo funkcijo da zgradi tabeli samplesX in samplesY
buildSamples();



// 7. STANJE IGRE - spremenljivke ki se med igro spreminjajo

// Vse tukaj so let ker se vrednosti med igro stalno menjajo

// ID animacijske zanke (requestAnimationFrame vrne stevilko)
// Ko zelimo ustaviti animacijo, poklichemo cancelAnimationFrame(rafId)
let rafId = null;

// Trenutno stanje igre:
// "idle"    = igra se ni zacela, canvas je prazen
// "drawing" = pot se risu na canvas (animacija risanja)
// "play"    = mis se premika, igra tece
// "over"    = konec igre (mis ujeta)
let mode = "idle";

// Indeks do katere tocke je pot ze narisana
// Zacne na 1 in raste do samplesX.length
let drawIndex = 1;

// Pozicija misi na poti - indeks v tabelah samplesX/samplesY
// 0 = zacetek poti,  samplesX.length-1 = konec poti
let mouseIndex = 0;

// Pozicija macke na poti - enako kot mouseIndex
// Zacne na negativni vrednosti (macka je se "zunaj" platna)
let catIndex = -40;

// true ko macka zacne zasledovati mis (po tem ko mis prvic doseize cilj)
let chaseMode = false;

// Stevec krogov zasledovanja (macka se priblizuje vsak krog)
let chaseRound = 0;

// true ko mis skace (med skokom ne more zadeti pasti)
let isJumping = false;

// Odstevalnik - koliko frame-ov skok se traja (steje navzdol do 0)
let jumpFramesLeft = 0;

// Tabeli za pozicije pasti (misjelovk) na poti
// let ker jih v reset() zamenjamo s prazno tabelo (trapX = [])
let trapX = [];
let trapY = [];

// Tabela indeksov kjer bodo postavljene pasti
let trapTargets = [];

// Kazalec - katera naslednja past se bo postavila med risanjem poti
let trapTargetPtr = 0;



// 8. NASTAVITVE IGRE - vrednosti ki se nikoli ne spremenijo

// Vse so const ker so to fiksne stevilke (kot Java konstante)
// Z VELIKIMI CRKAMI pisemo po dogovoru (konvencija)

const DRAW_SPEED = 1;               // koliko tock se narisa na vsak frame
const MOUSE_SPEED = 0.4;            // koliko tock mis naredi na vsak frame
const TRAP_COUNT = 3;               // stevilo pasti v labirintu
const TRAP_MIN_GAP = 50;            // minimalna razdalja (v tockah) med pastmi
const COLLISION_R = 12;             // razdalja v px pri kateri mis "zadene" past
const JUMP_FRAMES = 40;             // koliko frame-ov traja skok (pri 60fps = 0.67 sek)
const JUMP_HEIGHT = 27;             // za koliko px se mis vizualno dvigne med skokom
const CAT_SPEED = 0.4;              // hitrost macke (enaka misi na zacetku)
const CAT_START_DELAY = 40;         // macka zacne 40 tock za misjo
const CHASE_ROUNDS_TO_GAMEOVER = 3; // po 3 krogih zasledovanja macka ujame mis
const CAT_CATCHUP_PER_ROUND = 12;   // vsak krog se macka postavi za 12 tock blizje



// 9. FUNKCIJE ZA RISANJE


// Narise pot od zacetka do indeksa upToIdx
// ctx.beginPath() zacne novo crto
// ctx.moveTo() premakne "pero" na zacetno tocko (ne risu)
// ctx.lineTo() narise crto do naslednje tocke
// ctx.stroke() dejansko narise vse crte na canvas
function drawPath(upToIdx) {
    ctx.beginPath();
    ctx.moveTo(samplesX[0], samplesY[0]); // zacni na prvi tocki
    for (let i = 1; i < upToIdx; i++) {
        ctx.lineTo(samplesX[i], samplesY[i]); // dodaj crto do vsake tocke
    }
    ctx.stroke(); // narisi
}

// Narise sliko pasti na poziciji "index" v tabelah trapX/trapY
function drawTrap(index) {
    const x = trapX[index]; // x koordinata te pasti
    const y = trapY[index]; // y koordinata te pasti
    const size = 34;        // velikost slike v pikslih

    // Ce slika se ni nalozena iz datoteke, narisemo rdec trikotnik
   /* if (!trapImg.complete) {
        ctx.fillStyle = "#b91c1c"; // rdeca barva
        ctx.beginPath();
        ctx.moveTo(x, y - 16);        // vrh trikotnika
        ctx.lineTo(x + 16, y + 16);   // desni spodnji kot
        ctx.lineTo(x - 16, y + 16);   // levi spodnji kot
        ctx.closePath(); // zapri trikotnik
        ctx.fill();      // zapolni z barvo
        return; // konec funkcije - ne narisi slike
    }*/

    // Narisemo sliko centrirano na koordinati (x, y)
    // drawImage(slika, x_zacetek, y_zacetek, sirina, visina)
    ctx.drawImage(trapImg, x - size / 2, y - size / 2, size, size);
}

// Narise mis na poziciji idx na poti
// Mis se zavrti v smer gibanja (kot med trenutno in naslenjo tocko)
function drawMouse(idx) {
    // Math.floor zaokrozi navzdol - ker idx je decimalno stevilo (npr. 5.7)
    // tabela pa uporablja cela stevila (0, 1, 2, ...)
    const i = Math.floor(idx);

    // Naslednja tocka (za izracun kota gibanja)
    let nextI = i + 1;
    if (nextI > samplesX.length - 1) {
        nextI = samplesX.length - 1; // ne pojdi cez mejo tabele
    }

    const px = samplesX[i];    // trenutna x pozicija misi
    const py = samplesY[i];    // trenutna y pozicija misi
    const nextX = samplesX[nextI]; // x naslednje tocke
    const nextY = samplesY[nextI]; // y naslednje tocke

    // Med skokom dvignemo mis navzgor (negativen y = visje na zaslonu)
    let yOffset = 0;
    if (isJumping) {
        yOffset = -JUMP_HEIGHT; // premik navzgor
    }

    const size = 40; // velikost slike misi v pikslih

    // Izracunamo smer gibanja (vektor od trenutne do naslednje tocke)
    const dx = nextX - px; // sprememba po x (pozitivno = desno)
    const dy = nextY - py; // sprememba po y (pozitivno = navzdol)

    // Math.atan2 vrne kot v radianih glede na x os
    // To je standardna matematicna funkcija za smer vektorja
    const angle = Math.atan2(dy, dx);

    // ctx.save() shrani trenutne nastavitve risanja
    ctx.save();

    // ctx.translate premakne koordinatni sistem na pozicijo misi
    // Zdaj je (0,0) na misi
    ctx.translate(px, py + yOffset);

    // ctx.rotate zavrti koordinatni sistem
    // - Math.PI/2 = 90 stopinj (popravek ker slika gleda navzgor)
    ctx.rotate(angle - Math.PI / 2);

    // Narisemo sliko centrirano na (0,0) - ki je sedaj na misi
    ctx.drawImage(mouseImg, -size / 2, -size / 2, size, size);

    // ctx.restore() povrne nastavitve risanja na tiste pred save()
    ctx.restore();
}

// Narise macko na poziciji idx na poti
// Enako kot drawMouse, samo macka gleda v obratno smer
function drawCat(idx) {
    // Ce je macka se zunaj platna (negativen indeks), ne risemo
    if (idx < 0) return;

    // Omeji indeks da ne gre izven meja tabele
    let safeIdx = Math.floor(idx);
    if (safeIdx < 0) {
        safeIdx = 0;
    }
    if (safeIdx > samplesX.length - 1) {
        safeIdx = samplesX.length - 1;
    }

    let nextI = safeIdx + 1;
    if (nextI > samplesX.length - 1) {
        nextI = samplesX.length - 1;
    }

    const px = samplesX[safeIdx];
    const py = samplesY[safeIdx];
    const nextX = samplesX[nextI];
    const nextY = samplesY[nextI];

    const dx = nextX - px;
    const dy = nextY - py;
    const angle = Math.atan2(dy, dx);
    const size = 54; // macka je malo vecja od misi

    ctx.save();
    ctx.translate(px, py);
    // + Math.PI = se enkrat zasukamo za 180 stopinj ker macka gleda nazaj
    ctx.rotate(angle + Math.PI / 2 + Math.PI);

    // Ce je slika nalozena, jo narisemo
    if (catImg.complete && catImg.naturalWidth > 0) {
        ctx.drawImage(catImg, -size / 2, -size / 2, size, size);
    } /*else {
        // Nadomestna macka iz geometricnih oblik ce slike ni
        ctx.fillStyle = "#6d4c41"; // rjava barva
        ctx.beginPath();
        // arc(x, y, polmer, zacetni_kot, koncni_kot) - naris krog
        ctx.arc(0, 0, size / 2.5, 0, Math.PI * 2); // telo
        ctx.fill();

        // Levo uho
        ctx.beginPath();
        ctx.moveTo(-14, -14);
        ctx.lineTo(-6, -30);
        ctx.lineTo(0, -10);
        ctx.closePath();
        ctx.fill();

        // Desno uho
        ctx.beginPath();
        ctx.moveTo(14, -14);
        ctx.lineTo(6, -30);
        ctx.lineTo(0, -10);
        ctx.closePath();
        ctx.fill();
    }*/

    ctx.restore();
}



// 10. LOGIKA PASTI


// MEHURČNO UREJANJE (Bubble Sort)
// Uredi tabelo stevilk od najmanjse do najvecje
// Deluje tako da v vsaki iteracijo "potisne" najvecjo stevilko na konec
// Primer: [30, 10, 50, 20] -> [10, 20, 30, 50]
function bubbleSort(arr) {
    const n = arr.length; // dolzina tabele

    // Zunanja zanka: n-1 prehodov cez tabelo
    for (let i = 0; i < n - 1; i++) {
        // Notranja zanka: primerjaj sosednje pare
        // Z vsakim prehodom je zadnjih i elementov ze urejenih
        for (let j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                // Zamenjamo sosednja elementa (swap)
                // Potrebujemo pomozno spremenljivko temp
                const temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
    // funkcija ne vraca nicesar, ampak direktno spremeni tabelo arr
}

// Nakljucno izbere TRAP_COUNT pozicij za pasti na poti
// Pazi da niso preblizu zacetka/konca in ne preblizu med seboj
function pickTrapTargets() {
    trapTargets = []; // pobrisi stare cilje

    // Poskusamo najti veljavne pozicije (max 10000 poskusov)
    for (let attempts = 0; attempts < 10000 && trapTargets.length < TRAP_COUNT; attempts++) {

        // Math.random() vrne nakljucno stevilko med 0 in 1
        // Pomnozimo z dolzino poti in dodamo odmik od zacetka
        const idx = Math.floor(Math.random() * (samplesX.length - 120)) + 60;

        // Pas ne sme biti preblizu koncu ali zacetku poti
        if (idx > samplesX.length - 60) continue;
        if (idx < 60) continue;

        // Preverimo minimalni razmik od ze izbranih pasti
        let ok = true;
        for (let p = 0; p < trapTargets.length; p++) {
            // Math.abs vrne absolutno vrednost (brez predznaka)
            if (Math.abs(idx - trapTargets[p]) < TRAP_MIN_GAP) {
                ok = false;
                break; // izhod iz for zanke
            }
        }

        // Ce pozicija ni ustrezna, preskoci na naslednji poskus
        if (!ok) continue;

        // Dodamo veljavno pozicijo
        trapTargets.push(idx);
    }

    // Uredimo z mehurčnim urejanjem - pasti postavljamo od zacetka poti
    bubbleSort(trapTargets);
    trapTargetPtr = 0; // ponastavimo kazalec
}

// Preveri ali je mis na isti poziciji kot katera od pasti
// Vrne true ce je trk, false ce ni
function mouseHitsTrap() {
    // Zaokrozimo na celo stevilo za indeks v tabeli
    let mi = Math.floor(mouseIndex);
    if (mi < 0) mi = 0;
    if (mi > samplesX.length - 1) mi = samplesX.length - 1;

    // Trenutna pozicija misi
    const mpx = samplesX[mi];
    const mpy = samplesY[mi];

    // Preverimo razdaljo do vsake pasti
    for (let t = 0; t < trapX.length; t++) {
        const d = dist(mpx, mpy, trapX[t], trapY[t]);
        // Ce je razdalja manjsa od COLLISION_R je trk
        if (d <= COLLISION_R) {
            return true;
        }
    }
    return false; // nobene pasti ni zadela
}



// 11. GAME LOOP - glavna zanka igre

// requestAnimationFrame pokliche render() ~60x na sekundo
// Vsak klic = 1 frame animacije
// Zaporedje v vsakem frame-u: pocisti -> narisi -> posodobi stanje

function render() {
    // POCISTI - zbrise vse s canvasa pred vsakim frame-om
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- RISANJE ---

    // 1) Narisi pot (samo ce igra ze tece - ne v stanju idle)
    if (mode === "drawing" || mode === "play" || mode === "over" || mode === "win") {
        drawPath(drawIndex);
    }

    // 2) Narisi pasti (samo v prvem krogu, preden pride macka)
    if (!chaseMode) {
        for (let t = 0; t < trapX.length; t++) {
            drawTrap(t);
        }
    }

    // 3) Narisi mis (samo ko igra ni v stanju idle)
    if (mode !== "idle") {
        // Med risanjem poti je mis na zacetku (indeks 0)
        // Ko igra tece, mis je na mouseIndex
        let visibleMouseIdx = 0;
        if (mode !== "drawing") {
            visibleMouseIdx = mouseIndex;
        }
        drawMouse(visibleMouseIdx);
    }

    // 4) Narisi macko (samo ko zasleduje in igra tece)
    if (chaseMode && mode === "play") {
        drawCat(catIndex);
    }

    // --- POSODABLJANJE STANJA ---

    // Ce se pot risu: pomikamo drawIndex naprej
    if (mode === "drawing") {
        drawIndex = drawIndex + DRAW_SPEED;
        // drawIndex ne sme preseci dolzine tabele
        if (drawIndex > samplesX.length) {
            drawIndex = samplesX.length;
        }

        // Ko risanje poti doseze naslednji cilj pasti, jo postavi
        // while ker se lahko v enem frame-u risanje premakne cez vec ciljev
        while (trapTargetPtr < trapTargets.length && drawIndex >= trapTargets[trapTargetPtr]) {
            const idx = trapTargets[trapTargetPtr];
            // Shranimo koordinate pasti
            trapX.push(samplesX[idx]);
            trapY.push(samplesY[idx]);
            trapTargetPtr++; // pojdi na naslenjo past
        }

        // Ko je pot narisana do konca, zacnemo igro
        if (drawIndex >= samplesX.length) {
            mode = "play";
            mouseIndex = 0; // mis zacne na zacetku
        }
    }

    // Ce igra tece: premikamo mis in macko, preverjamo trke
    if (mode === "play") {

        // Odstevalnik skoka: steje navzdol do 0
        if (jumpFramesLeft > 0) {
            jumpFramesLeft--;
            if (jumpFramesLeft === 0) {
                isJumping = false; // skok je koncan
            }
        }

        // Premikanje misi naprej po poti (samo ko macka se ne zasleduje)
        if (!chaseMode) {
            mouseIndex = mouseIndex + MOUSE_SPEED;
            // Ne dovolimo da gre indeks cez mejo tabele
            if (mouseIndex > samplesX.length - 1) {
                mouseIndex = samplesX.length - 1;
            }
        }

        // Preveri trk z pastjo (samo ce mis ne skace - med skokom je varna)
        if (!chaseMode && !isJumping && mouseHitsTrap()) {
            mode = "over";
            cancelAnimationFrame(rafId); // ustavi animacijsko zanko
            rafId = null;
            bgMusic.pause();
            bgMusic.currentTime = 0; // previj nazaj na zacetek
            gameOverSound.play();
            // Swal.fire je pojavno okno (knjiznica SweetAlert2)
            // .then(function(){...}) se pokliche ko igralec klikne OK
            Swal.fire({
                icon: "error",
                title: "Game Over!",
                text: "Mouse got trapped.",
                background: "#fff6a0",
                color: "#5d4037",
                confirmButtonColor: "#FFB300"
            }).then(function() { reset(); });
            return; // takoj izhod iz render() - ne klichemo vece requestAnimationFrame
        }

        // Ko mis prvic pride do cilja: aktiviramo zasledovanje macke
        if (!chaseMode && mouseIndex >= samplesX.length - 1) {
            chaseMode = true;        // vklopimo chase nacin
            mouseIndex = 0;          // mis se vrne na zacetek
            catIndex = -CAT_START_DELAY; // macka zacne za platnom
            chaseRound = 0;          // smo v prvem krogu zasledovanja
            winSound.currentTime = 0;
            winSound.play(); // kratki zvok zmage (mis je dosegla cilj)
        }

        // Chase nacin: mis in macka teceta po poti v ponavljajocem krogu
        // Macka se z vsakim krogom priblizuje - po 3 krogih igra konec
        if (chaseMode) {
            mouseIndex = mouseIndex + MOUSE_SPEED;
            catIndex = catIndex + CAT_SPEED; // macka se premika enako hitro

            // V tretjem krogu (chaseRound === 2) macka ujame mis na sredini poti
            if (chaseRound === 2 && mouseIndex >= samplesX.length * 0.5) {
                mode = "over";
                cancelAnimationFrame(rafId);
                rafId = null;
                bgMusic.pause();
                bgMusic.currentTime = 0;
                gameOverSound.currentTime = 0;
                gameOverSound.play();
                Swal.fire({
                    icon: "error",
                    title: "Game Over!",
                    text: "Cat caught the mouse.",
                    background: "#fff6a0",
                    color: "#5d4037",
                    confirmButtonColor: "#FFB300"
                }).then(function() { reset(); });
                return;
            }

            // Ko mis pride do konca poti, oba zacneta nov krog
            if (mouseIndex >= samplesX.length - 1) {
                chaseRound++; // povecamo stevec krogov

                if (chaseRound < CHASE_ROUNDS_TO_GAMEOVER) {
                    mouseIndex = 0; // mis spet na zacetek

                    // Macka zacne blizje z vsakim novim krogom
                    let newDelay = CAT_START_DELAY - chaseRound * CAT_CATCHUP_PER_ROUND;
                    if (newDelay < 0) {
                        newDelay = 0; // ne more biti negativno
                    }
                    catIndex = -newDelay;
                }
            }
        }
    }

    // Poklichemo render() spet naslednji frame (~1/60 sekunde)
    rafId = requestAnimationFrame(render);
}



// 12. KONTROLNE FUNKCIJE


// Zacne novo igro - poklichemo ko pritisnemo gumb "Start"
function startGame() {
    bgMusic.play(); // zacni glasbo

    // Odstranimo fokus z gumba (da presledek ne pritisne gumba ponovno)
    const activeEl = document.activeElement;
    if (activeEl) {
        activeEl.blur();
    }

    reset(false);        // ponastavimo stanje brez pojavnega okna
    pickTrapTargets();   // izberemo nakljucne pozicije za pasti

    // Nastavimo zacetno stanje igre
    mode = "drawing";       // zacnemo z risanjem poti
    drawIndex = 1;          // risanje od prve tocke
    mouseIndex = 0;         // mis na zacetku
    catIndex = -CAT_START_DELAY; // macka zunaj platna
    chaseMode = false;      // zasledovanje se ne tece
    chaseRound = 0;
    isJumping = false;
    jumpFramesLeft = 0;

    // Ce animacija ze tece, jo zaustavimo da ne teceta dve hkrati
    if (rafId) {
        cancelAnimationFrame(rafId);
    }

    // Zazenemo animacijsko zanko
    rafId = requestAnimationFrame(render);
}

// Ponastavi igro na zacetno stanje
// showAlert: true = pokazi pojavno okno,  false = samo ponastavi tiho
function reset(showAlert) {
    if (showAlert === undefined) {
        showAlert = false; // privzeta vrednost
    }

    mode = "idle"; // igra stoji

    // Ustavimo animacijsko zanko ce tece
    if (rafId) {
        cancelAnimationFrame(rafId);
    }
    rafId = null;

    // Pobrisi vse s canvasa
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pobrisi pasti (nova prazna tabela)
    trapX = [];
    trapY = [];

    // Ponastavi vse spremenljivke stanja
    drawIndex = 1;
    mouseIndex = 0;
    catIndex = -CAT_START_DELAY;
    chaseMode = false;
    chaseRound = 0;
    isJumping = false;
    jumpFramesLeft = 0;

    // Pokazi pojavno okno samo ce je showAlert = true
    if (showAlert) {
        Swal.fire({
            icon: "error",
            title: "Reset",
            text: "Game reseted",
            background: "#fff6a0",
            color: "#5d4037",
            confirmButtonColor: "#FFB300"
        });
    }
}


// 13. POSLUSALCI DOGODKOV (Event Listeners)

// addEventListener caka na dogodek (klik, tipka...) in pokliche funkcijo

// Tipkovnica - presledek (Space) za skok
window.addEventListener("keydown", function(e) {
    // e je objekt z informacijami o pritisneni tipki
    // e.code je ime tipke npr. "Space", "ArrowLeft", "KeyA" ...
    if (e.code !== "Space") return; // ce ni presledek, ignoriraj

    e.preventDefault();  // prepreci privzeto akcijo brskalnika (scrollanje strani)
    e.stopPropagation(); // prepreci da bi se dogodek sirili naprej

    // Skok dovolimo samo med igranjem
    if (mode !== "play") return;

    // Ce mis ze skace, ne zacnemo novega skoka
    if (isJumping) return;

    // Aktiviramo skok
    isJumping = true;
    jumpFramesLeft = JUMP_FRAMES; // nastavimo odstevalnik
    jumpSound.currentTime = 0;   // previj zvok na zacetek
    jumpSound.play();
});

// Klik na gumb "Start" - pokliche startGame()
document.getElementById("gumb").addEventListener("click", startGame);

// Klik na gumb "Reset" - pokliche reset(true) - s pojavnim oknom
document.getElementById("gumb2").addEventListener("click", function() {
    reset(true);
});

// Klik na gumb "Rules" - pokaze pravila igre
document.getElementById("rulesBtn").addEventListener("click", function() {
    Swal.fire({
        title: "Game Rules",
        html: "<div style='text-align:left'><p><b>1.</b> Press <b>Start</b> to start the game.</p><p><b>2.</b> Press space to jump over the traps.</p><p><b>3.</b> Watch out for the cat!</p></div>",
        confirmButtonText: "OK",
        background: "#fff6a0",
        color: "#5d4037",
        confirmButtonColor: "#FFB300"
    });
});

// Klik na "Credits" - pokaze avtorja
document.getElementById("cheeseCredits").addEventListener("click", function() {
    Swal.fire({
        title: "Credits",
        html: "<div style='text-align:left'><p><b>Game:</b> Mouse Trap</p><p><b>Developer:</b> Patrik Cigoj</p></div>",
        confirmButtonText: "Nice!",
        background: "#fff6a0",
        color: "#5d4037",
        confirmButtonColor: "#FFB300"
    });
});

// Konfigurácia
const GRID_SIZE = 5;
const BASE_SPAWN_LEVEL = 1;
const MAX_BASE_LEVEL = 3; // vyššie levely vznikajú hlavne mergovaním
const COMBO_BONUS_THRESHOLD = 5; // 5+ ikon = väčší bonus levelu

let board = []; // 2D pole [y][x] s hodnotami levelov (0 = prázdne)
let score = 0;
let moves = 0;
let maxLevel = 1;

let nextTileLevel = 1;

let boardEl;
let nextTileContainer;

let dragState = {
  dragging: false,
  fromX: null,
  fromY: null,
  tileEl: null,
  offsetX: 0,
  offsetY: 0,
  startMouseX: 0,
  startMouseY: 0
};

document.addEventListener("DOMContentLoaded", () => {
  boardEl = document.getElementById("board");
  nextTileContainer = document.getElementById("next-tile");

  initBoard();
  renderBoard();
  generateNextTile();
  renderNextTile();
});

// Inicializácia prázdneho boardu + pár štartovacích prvkov
function initBoard() {
  board = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push(0);
    }
    board.push(row);
  }

  // Pár náhodných prvkov na začiatku
  for (let i = 0; i < 4; i++) {
    spawnRandomTile(BASE_SPAWN_LEVEL);
  }
}

function renderBoard() {
  boardEl.innerHTML = "";

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;

      const level = board[y][x];
      if (level > 0) {
        const tile = createTileElement(level, x, y);
        cell.appendChild(tile);
      }

      boardEl.appendChild(cell);
    }
  }
}

// Vytvorenie DOM prvku pre jednu "tile"
function createTileElement(level, x, y) {
  const tile = document.createElement("div");
  tile.className = `tile level-${Math.min(level, 7)}`;
  tile.textContent = level;
  tile.dataset.x = x;
  tile.dataset.y = y;
  tile.dataset.level = level;

  // PC drag
  tile.addEventListener("mousedown", startDrag);
  // Touch drag
  tile.addEventListener("touchstart", startDragTouch, { passive: false });

  return tile;
}

// Spawn na náhodné prázdne políčko
function spawnRandomTile(level) {
  const emptyCells = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (board[y][x] === 0) emptyCells.push({ x, y });
    }
  }

  if (emptyCells.length === 0) {
    // Board plný. V tejto verzii nerobíme game over, len nespawnujeme.
    return;
  }

  const pos = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  board[pos.y][pos.x] = level;
}

// Ďalší tile (panel vpravo)
function generateNextTile() {
  // Jednoduchá logika: väčšinou level 1–3, sem tam 2–4
  const r = Math.random();
  if (r < 0.7) {
    nextTileLevel = BASE_SPAWN_LEVEL;
  } else if (r < 0.9) {
    nextTileLevel = 2;
  } else {
    nextTileLevel = 3;
  }
}

function renderNextTile() {
  nextTileContainer.innerHTML = "";
  const tile = document.createElement("div");
  tile.className = `tile level-${Math.min(nextTileLevel, 7)}`;
  tile.textContent = nextTileLevel;
  // tu nie je drag – tile sa používa "virtuálne", hdáme ho na board
  nextTileContainer.appendChild(tile);
}

// PC drag handlers

function startDrag(e) {
  e.preventDefault();
  const tile = e.currentTarget;
  const level = parseInt(tile.dataset.level, 10);
  const x = parseInt(tile.dataset.x, 10);
  const y = parseInt(tile.dataset.y, 10);

  // Toto nie je "existing tile drag", ale dragujeme "next tile" na board
  // -> preto použijeme nextTileLevel a prázdne bunky
  // Jednoduchšia verzia: dragujeme next tile z panelu, nie existujúci
  // PRETO tu spravíme: ak drag začal na cell, ignorujeme
  return;
}

// Touch drag z existujúceho tile ignorujeme rovnako
function startDragTouch(e) {
  e.preventDefault();
  return;
}

// ----
// Reálne dragujeme "next tile" z panelu na board
// ----

let nextTileDragging = false;
let dragGhost = null;

nextTileContainer.addEventListener("mousedown", (e) => {
  e.preventDefault();
  beginNextTileDrag(e.clientX, e.clientY);
  window.addEventListener("mousemove", onNextTileDragMove);
  window.addEventListener("mouseup", endNextTileDrag);
});

nextTileContainer.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  beginNextTileDrag(touch.clientX, touch.clientY);
  window.addEventListener("touchmove", onNextTileDragMoveTouch, {
    passive: false
  });
  window.addEventListener("touchend", endNextTileDragTouch);
});

function beginNextTileDrag(clientX, clientY) {
  if (nextTileDragging) return;
  nextTileDragging = true;

  dragGhost = document.createElement("div");
  dragGhost.className = `tile level-${Math.min(nextTileLevel, 7)} dragging`;
  dragGhost.textContent = nextTileLevel;
  dragGhost.style.position = "fixed";
  dragGhost.style.pointerEvents = "none";
  dragGhost.style.width = "60px";
  dragGhost.style.height = "60px";
  dragGhost.style.transform = "translate(-50%, -50%)";
  dragGhost.style.zIndex = 9999;
  document.body.appendChild(dragGhost);

  moveDragGhost(clientX, clientY);
}

function moveDragGhost(clientX, clientY) {
  if (!dragGhost) return;
  dragGhost.style.left = clientX + "px";
  dragGhost.style.top = clientY + "px";
}

function onNextTileDragMove(e) {
  if (!nextTileDragging) return;
  moveDragGhost(e.clientX, e.clientY);
}

function onNextTileDragMoveTouch(e) {
  if (!nextTileDragging) return;
  e.preventDefault();
  const touch = e.touches[0];
  moveDragGhost(touch.clientX, touch.clientY);
}

function endNextTileDrag(e) {
  if (!nextTileDragging) return;
  placeNextTileAtPoint(e.clientX, e.clientY);
  cleanupGhostDrag();
  window.removeEventListener("mousemove", onNextTileDragMove);
  window.removeEventListener("mouseup", endNextTileDrag);
}

function endNextTileDragTouch(e) {
  if (!nextTileDragging) return;
  const touch = e.changedTouches[0];
  placeNextTileAtPoint(touch.clientX, touch.clientY);
  cleanupGhostDrag();
  window.removeEventListener("touchmove", onNextTileDragMoveTouch);
  window.removeEventListener("touchend", endNextTileDragTouch);
}

function cleanupGhostDrag() {
  nextTileDragging = false;
  if (dragGhost && dragGhost.parentNode) {
    dragGhost.parentNode.removeChild(dragGhost);
  }
  dragGhost = null;
}

// Umiesť next tile na najbližšiu bunku, ak je prázdna
function placeNextTileAtPoint(clientX, clientY) {
  const elem = document.elementFromPoint(clientX, clientY);
  if (!elem) return;

  let cellEl = elem;
  if (!cellEl.classList.contains("cell")) {
    cellEl = elem.closest(".cell");
  }
  if (!cellEl) return;

  const x = parseInt(cellEl.dataset.x, 10);
  const y = parseInt(cellEl.dataset.y, 10);

  if (board[y][x] !== 0) {
    // Už obsadené – nič sa nestane
    return;
  }

  // Položíme tile
  board[y][x] = nextTileLevel;
  moves++;
  updateStatsUI();

  // Merge logika
  const mergedLevel = tryMergeAt(x, y);

  // Spawn ďalšieho tile
  generateNextTile();
  renderBoard();
  renderNextTile();
}

// Merge logika: nájdeme skupinu rovnakého levelu, ak >= 3, mergneme
function tryMergeAt(x, y) {
  const level = board[y][x];
  if (level <= 0) return level;

  const group = floodFillSameLevel(x, y, level);
  const count = group.length;
  if (count < 3) {
    updateMaxLevel(level);
    return level;
  }

  // Spočítaj score, bonusy
  let levelIncrease = 1;
  if (count >= COMBO_BONUS_THRESHOLD) {
    levelIncrease = 2; // 5+ ikon -> +2 level
  }

  // Základné score: level * count
  score += level * count * 10;
  // Malý bonus za veľký merge
  if (count >= COMBO_BONUS_THRESHOLD) {
    score += (count - COMBO_BONUS_THRESHOLD + 1) * 20;
  }

  // Odstráň všetky v skupine okrem cieľovej bunky
  group.forEach((pos) => {
    if (!(pos.x === x && pos.y === y)) {
      board[pos.y][pos.x] = 0;
    }
  });

  // Zvýš level cieľovej bunky
  const newLevel = level + levelIncrease;
  board[y][x] = newLevel;

  updateMaxLevel(newLevel);
  updateStatsUI();

  // Potenciálne chain merge – rekurzívne
  return tryMergeAt(x, y);
}

// Flood fill na nájdenie všetkých susedov s rovnakým levelom
function floodFillSameLevel(startX, startY, level) {
  const visited = new Set();
  const stack = [{ x: startX, y: startY }];
  const group = [];

  const key = (x, y) => `${x},${y}`;

  while (stack.length > 0) {
    const { x, y } = stack.pop();
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
    if (visited.has(key(x, y))) continue;
    if (board[y][x] !== level) continue;

    visited.add(key(x, y));
    group.push({ x, y });

    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }

  return group;
}

function updateMaxLevel(level) {
  if (level > maxLevel) {
    maxLevel = level;
  }
}

function updateStatsUI() {
  document.getElementById("score").textContent = score;
  document.getElementById("moves").textContent = moves;
  document.getElementById("max-level").textContent = maxLevel;
}

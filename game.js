const GRID_SIZE = 5;

const ELEMENTS = ["air", "life", "stone", "fire", "water"];

function randomElement() {
  return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
}

let board = [];
let nextTile = null;

let score = 0;
let moves = 0;
let maxLevel = 1;

let boardEl;
let nextTileContainer;

document.addEventListener("DOMContentLoaded", () => {
  boardEl = document.getElementById("board");
  nextTileContainer = document.getElementById("next-tile");

  initBoard();
  renderBoard();
  generateNextTile();
  renderNextTile();
});

/* -------------------------
   BOARD INITIALIZATION
-------------------------- */

function initBoard() {
  board = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) row.push(null);
    board.push(row);
  }

  for (let i = 0; i < 4; i++) spawnRandomTile();
}

function spawnRandomTile() {
  const empty = [];
  for (let y = 0; y < GRID_SIZE; y++)
    for (let x = 0; x < GRID_SIZE; x++)
      if (board[y][x] === null) empty.push({ x, y });

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  board[pos.y][pos.x] = {
    element: randomElement()
  };
}

/* -------------------------
   RENDER BOARD
-------------------------- */

function renderBoard() {
  boardEl.innerHTML = "";

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;

      const tile = board[y][x];
      if (tile) {
        const el = document.createElement("div");
        el.className = "tile";
        el.style.backgroundImage = `url("assets/${tile.element}.png")`;
        cell.appendChild(el);
      }

      boardEl.appendChild(cell);
    }
  }
}

/* -------------------------
   NEXT TILE
-------------------------- */

function generateNextTile() {
  nextTile = {
    element: randomElement()
  };
}

function renderNextTile() {
  nextTileContainer.innerHTML = "";

  const el = document.createElement("div");
  el.className = "tile";
  el.style.backgroundImage = `url("assets/${nextTile.element}.png")`;
  el.setAttribute("draggable", "false");

  const handle = document.createElement("div");
  handle.style.position = "absolute";
  handle.style.top = "0";
  handle.style.left = "0";
  handle.style.width = "100%";
  handle.style.height = "100%";
  handle.style.zIndex = "50";
  handle.style.touchAction = "none";
  handle.style.background = "transparent";

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", endDrag);
  });

  handle.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
    window.addEventListener("touchmove", onDragMoveTouch, { passive: false });
    window.addEventListener("touchend", endDragTouch);
  });

  nextTileContainer.appendChild(el);
  nextTileContainer.appendChild(handle);
}

/* -------------------------
   DRAG & DROP
-------------------------- */

let dragging = false;
let ghost = null;

function startDrag(x, y) {
  dragging = true;

  ghost = document.createElement("div");
  ghost.className = "tile dragging";
  ghost.style.position = "fixed";
  ghost.style.width = "80px";
  ghost.style.height = "80px";
  ghost.style.pointerEvents = "none";
  ghost.style.transform = "translate(-50%, -50%)";
  ghost.style.zIndex = 9999;
  ghost.style.backgroundImage = `url("assets/${nextTile.element}.png")`;
  ghost.setAttribute("draggable", "false");

  document.body.appendChild(ghost);
  moveGhost(x, y);
}

function moveGhost(x, y) {
  if (!ghost) return;
  ghost.style.left = x + "px";
  ghost.style.top = y + "px";
}

function onDragMove(e) {
  if (!dragging) return;
  e.preventDefault();
  moveGhost(e.clientX, e.clientY);
}

function onDragMoveTouch(e) {
  if (!dragging) return;
  e.preventDefault();
  const t = e.touches[0];
  moveGhost(t.clientX, t.clientY);
}

function endDrag(e) {
  finishDrop(e.clientX, e.clientY);
  cleanupDrag();
}

function endDragTouch(e) {
  const t = e.changedTouches[0];
  finishDrop(t.clientX, t.clientY);
  cleanupDrag();
}

function cleanupDrag() {
  dragging = false;
  if (ghost) ghost.remove();
  ghost = null;

  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", endDrag);
  window.removeEventListener("touchmove", onDragMoveTouch);
  window.removeEventListener("touchend", endDragTouch);
}

/* -------------------------
   DROP LOGIC
-------------------------- */

function finishDrop(x, y) {
  const elem = document.elementFromPoint(x, y);
  if (!elem) return;

  const cell = elem.closest(".cell");
  if (!cell) return;

  const cx = parseInt(cell.dataset.x, 10);
  const cy = parseInt(cell.dataset.y, 10);

  if (board[cy][cx] !== null) return;

  board[cy][cx] = { ...nextTile };
  moves++;

  handleMergeAndCore(cx, cy);

  generateNextTile();
  renderBoard();
  renderNextTile();
}

/* -------------------------
   MERGE + CORE LOGIC
-------------------------- */

function handleMergeAndCore(x, y) {
  const tile = board[y][x];
  if (!tile) return;

  const group = findGroup(x, y, tile.element);
  if (group.length < 3) return;

  const isCore = hasCorePattern(group, tile.element);

  if (isCore) {
    explodeArea3x3(x, y);
  } else {
    // klasický merge – zmizne celá skupina
    group.forEach((p) => {
      board[p.y][p.x] = null;
    });
  }
}

/* 4-susedná skupina rovnakých elementov */

function findGroup(x, y, element) {
  const stack = [{ x, y }];
  const visited = new Set();
  const result = [];

  const key = (x, y) => `${x},${y}`;

  while (stack.length) {
    const p = stack.pop();
    if (
      p.x < 0 ||
      p.x >= GRID_SIZE ||
      p.y < 0 ||
      p.y >= GRID_SIZE ||
      visited.has(key(p.x, p.y))
    )
      continue;

    const tile = board[p.y][p.x];
    if (!tile || tile.element !== element) continue;

    visited.add(key(p.x, p.y));
    result.push(p);

    stack.push({ x: p.x + 1, y: p.y });
    stack.push({ x: p.x - 1, y: p.y });
    stack.push({ x, y: p.y + 1 });
    stack.push({ x, y: p.y - 1 });
  }

  return result;
}

/* -------------------------
   CORE PATTERN DETEKCIA
-------------------------- */

function hasCorePattern(group, element) {
  const set = new Set(group.map((p) => `${p.x},${p.y}`));

  const inGroup = (x, y) => set.has(`${x},${y}`);

  // horizontálne línie (4 alebo 5)
  const xs = group.map((p) => p.x);
  const ys = group.map((p) => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // skús horizontálne segmenty v každom riadku
  for (let y = minY; y <= maxY; y++) {
    let run = 0;
    for (let x = minX; x <= maxX + 1; x++) {
      if (inGroup(x, y)) {
        run++;
      } else {
        if (run >= 4 && run <= 5) return true;
        run = 0;
      }
    }
  }

  // skús vertikálne segmenty v každom stĺpci
  for (let x = minX; x <= maxX; x++) {
    let run = 0;
    for (let y = minY; y <= maxY + 1; y++) {
      if (inGroup(x, y)) {
        run++;
      } else {
        if (run >= 4 && run <= 5) return true;
        run = 0;
      }
    }
  }

  // 2×2 kocka
  for (let y = minY; y <= maxY - 1; y++) {
    for (let x = minX; x <= maxX - 1; x++) {
      if (
        inGroup(x, y) &&
        inGroup(x + 1, y) &&
        inGroup(x, y + 1) &&
        inGroup(x + 1, y + 1)
      ) {
        return true;
      }
    }
  }

  return false;
}

/* -------------------------
   CORE EFEKT – VYCISTI 3×3
-------------------------- */

function explodeArea3x3(cx, cy) {
  const affected = [];

  for (let y = cy - 1; y <= cy + 1; y++) {
    for (let x = cx - 1; x <= cx + 1; x++) {
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
      affected.push({ x, y });
    }
  }

  // vizuálny efekt
  affected.forEach(({ x, y }) => {
    const cell = boardEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (cell) {
      cell.classList.remove("pulse");
      void cell.offsetWidth;
      cell.classList.add("pulse");
    }
  });

  // čistíme okamžite, bez timeoutu (stabilná logika)
  affected.forEach(({ x, y }) => {
    board[y][x] = null;
  });
}

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

  // spawn pár ikoniek
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
    element: randomElement(),
    level: 1
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
    element: randomElement(),
    level: 1
  };
}

function renderNextTile() {
  nextTileContainer.innerHTML = "";
  const el = document.createElement("div");
  el.className = "tile";
  el.style.backgroundImage = `url("assets/${nextTile.element}.png")`;
  nextTileContainer.appendChild(el);
}

/* -------------------------
   DRAG & DROP
-------------------------- */

let dragging = false;
let ghost = null;

nextTileContainer.addEventListener("mousedown", (e) => {
  startDrag(e.clientX, e.clientY);
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", endDrag);
});

nextTileContainer.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  startDrag(t.clientX, t.clientY);
  window.addEventListener("touchmove", onDragMoveTouch, { passive: false });
  window.addEventListener("touchend", endDragTouch);
});

function startDrag(x, y) {
  dragging = true;

  ghost = document.createElement("div");
  ghost.className = "tile dragging";
  ghost.style.position = "fixed";
  ghost.style.width = "60px";
  ghost.style.height = "60px";
  ghost.style.pointerEvents = "none";
  ghost.style.transform = "translate(-50%, -50%)";
  ghost.style.zIndex = 9999;
  ghost.style.backgroundImage = `url("assets/${nextTile.element}.png")`;

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
  moveGhost(e.clientX, e.clientY);
}

function onDragMoveTouch(e) {
  if (!dragging) return;
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

  let cell = elem.closest(".cell");
  if (!cell) return;

  const cx = parseInt(cell.dataset.x);
  const cy = parseInt(cell.dataset.y);

  if (board[cy][cx] !== null) return;

  board[cy][cx] = { ...nextTile };
  moves++;

  tryMerge(cx, cy);

  generateNextTile();
  renderBoard();
  renderNextTile();
}

/* -------------------------
   MERGE LOGIC
-------------------------- */

function tryMerge(x, y) {
  const tile = board[y][x];
  const group = findGroup(x, y, tile.element, tile.level);

  if (group.length < 3) return;

  group.forEach((p) => {
    if (!(p.x === x && p.y === y)) board[p.y][p.x] = null;
  });

  board[y][x].level++;

  tryMerge(x, y);
}

function findGroup(x, y, element, level) {
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
    if (!tile || tile.element !== element || tile.level !== level) continue;

    visited.add(key(p.x, p.y));
    result.push(p);

    stack.push({ x: p.x + 1, y: p.y });
    stack.push({ x: p.x - 1, y: p.y });
    stack.push({ x: p.x, y: p.y + 1 });
    stack.push({ x: p.x, y: p.y - 1 });
  }

  return result;
}

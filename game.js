const GRID_SIZE = 5;

const ELEMENTS = ["air", "life", "stone", "fire", "water"];

function randomElement() {
  return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
}

let board = [];
let nextTile = null;

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
   INIT
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
  board[pos.y][pos.x] = { element: randomElement() };
}

/* -------------------------
   RENDER
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
  nextTile = { element: randomElement() };
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
   DROP
-------------------------- */

function finishDrop(x, y) {
  const elem = document.elementFromPoint(x, y);
  if (!elem) return;

  const cell = elem.closest(".cell");
  if (!cell) return;

  const cx = parseInt(cell.dataset.x);
  const cy = parseInt(cell.dataset.y);

  if (board[cy][cx] !== null) return;

  board[cy][cx] = { ...nextTile };

  handleMerge(cx, cy);

  generateNextTile();
  renderBoard();
  renderNextTile();
}

/* -------------------------
   MERGE LOGIC (A)
-------------------------- */

function handleMerge(x, y) {
  const element = board[y][x].element;

  const horiz = getHorizontalLine(x, y, element);
  const vert = getVerticalLine(x, y, element);
  const square = getSquare2x2(x, y, element);

  const longest = Math.max(horiz.length, vert.length, square.length);

  if (longest < 3) return;

  if (longest >= 4) {
    explodeArea3x3(x, y);
    return;
  }

  // classic merge: remove only the line
  if (horiz.length >= 3) horiz.forEach(p => board[p.y][p.x] = null);
  if (vert.length >= 3) vert.forEach(p => board[p.y][p.x] = null);
}

/* -------------------------
   LINE DETECTION
-------------------------- */

function getHorizontalLine(x, y, element) {
  const line = [{ x, y }];

  let lx = x - 1;
  while (lx >= 0 && board[y][lx] && board[y][lx].element === element) {
    line.push({ x: lx, y });
    lx--;
  }

  let rx = x + 1;
  while (rx < GRID_SIZE && board[y][rx] && board[y][rx].element === element) {
    line.push({ x: rx, y });
    rx++;
  }

  return line;
}

function getVerticalLine(x, y, element) {
  const line = [{ x, y }];

  let uy = y - 1;
  while (uy >= 0 && board[uy][x] && board[uy][x].element === element) {
    line.push({ x, y: uy });
    uy--;
  }

  let dy = y + 1;
  while (dy < GRID_SIZE && board[dy][x] && board[dy][x].element === element) {
    line.push({ x, y: dy });
    dy++;
  }

  return line;
}

function getSquare2x2(x, y, element) {
  const squares = [];

  const offsets = [
    [0, 0],
    [-1, 0],
    [0, -1],
    [-1, -1]
  ];

  for (const [ox, oy] of offsets) {
    const sx = x + ox;
    const sy = y + oy;

    if (
      sx >= 0 && sx + 1 < GRID_SIZE &&
      sy >= 0 && sy + 1 < GRID_SIZE &&
      board[sy][sx] && board[sy][sx].element === element &&
      board[sy][sx + 1] && board[sy][sx + 1].element === element &&
      board[sy + 1][sx] && board[sy + 1][sx].element === element &&
      board[sy + 1][sx + 1] && board[sy + 1][sx + 1].element === element
    ) {
      squares.push({ x: sx, y: sy });
      squares.push({ x: sx + 1, y: sy });
      squares.push({ x: sx, y: sy + 1 });
      squares.push({ x: sx + 1, y: sy + 1 });
    }
  }

  return squares;
}

/* -------------------------
   CORE EFFECT
-------------------------- */

function explodeArea3x3(cx, cy) {
  const affected = [];

  for (let y = cy - 1; y <= cy + 1; y++) {
    for (let x = cx - 1; x <= cx + 1; x++) {
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
      affected.push({ x, y });
    }
  }

  // visual pulse
  affected.forEach(({ x, y }) => {
    const cell = boardEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (cell) {
      cell.classList.remove("pulse");
      void cell.offsetWidth;
      cell.classList.add("pulse");
    }
  });

  // delay to show animation
  setTimeout(() => {
    affected.forEach(({ x, y }) => {
      board[y][x] = null;
    });
    renderBoard();
  }, 180);
}

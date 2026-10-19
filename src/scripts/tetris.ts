type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
type Cell = PieceType | null;
type Board = Cell[][];
type Mode = 'agent' | 'human';

const COLS = 10;
const ROWS = 20;
const TYPES: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

const SHAPES: Record<PieceType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

const COLORS: Record<PieceType, string> = {
  I: '#d99a4e',
  J: '#7f8f7a',
  L: '#c46f5a',
  O: '#c9b98f',
  S: '#8a9bb0',
  T: '#b58cae',
  Z: '#9a7f6b',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

const emptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));

const emptyRow = (): Cell[] => Array<Cell>(COLS).fill(null);

function rotateCW(m: number[][]): number[][] {
  const n = m.length;
  const out = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) out[x][n - 1 - y] = m[y][x];
  }
  return out;
}

function shape(type: PieceType, rot: number): number[][] {
  let m = SHAPES[type];
  for (let i = 0; i < rot % 4; i++) m = rotateCW(m);
  return m;
}

function collides(board: Board, mat: number[][], px: number, py: number): boolean {
  for (let y = 0; y < mat.length; y++) {
    for (let x = 0; x < mat[y].length; x++) {
      if (!mat[y][x]) continue;
      const bx = px + x;
      const by = py + y;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  }
  return false;
}

function fullRows(board: Board): number[] {
  const rows: number[] = [];
  for (let y = 0; y < ROWS; y++) {
    if (board[y].every((c) => c !== null)) rows.push(y);
  }
  return rows;
}

function countFull(board: Board): number {
  return fullRows(board).length;
}

function removeRows(board: Board, rows: number[]): void {
  if (rows.length === 0) return;
  const kept = board.filter((_, i) => !rows.includes(i));
  while (kept.length < ROWS) kept.unshift(emptyRow());
  for (let y = 0; y < ROWS; y++) board[y] = kept[y];
}

interface Plan {
  rot: number;
  x: number;
  score: number;
}

interface Features {
  holes: number;
  rowTransitions: number;
  colTransitions: number;
  wells: number;
}

function featuresOf(board: Board): Features {
  let holes = 0;
  let rowTransitions = 0;
  let colTransitions = 0;
  let wells = 0;

  for (let y = 0; y < ROWS; y++) {
    let prev = 1;
    for (let x = 0; x < COLS; x++) {
      const cur = board[y][x] ? 1 : 0;
      if (cur !== prev) rowTransitions++;
      prev = cur;
    }
    if (prev !== 1) rowTransitions++;
  }

  for (let x = 0; x < COLS; x++) {
    let prev = 1;
    for (let y = ROWS - 1; y >= 0; y--) {
      const cur = board[y][x] ? 1 : 0;
      if (cur !== prev) colTransitions++;
      prev = cur;
    }
    if (prev !== 0) colTransitions++;
  }

  for (let x = 0; x < COLS; x++) {
    let seen = false;
    for (let y = 0; y < ROWS; y++) {
      if (board[y][x]) seen = true;
      else if (seen) holes++;
    }

    let depth = 0;
    for (let y = 0; y < ROWS; y++) {
      const left = x === 0 ? 1 : board[y][x - 1] ? 1 : 0;
      const right = x === COLS - 1 ? 1 : board[y][x + 1] ? 1 : 0;
      if (left && right && !board[y][x]) {
        depth++;
      } else {
        wells += (depth * (depth + 1)) / 2;
        depth = 0;
      }
    }
    wells += (depth * (depth + 1)) / 2;
  }

  return { holes, rowTransitions, colTransitions, wells };
}

function evaluate(board: Board, type: PieceType, rot: number, x: number): Plan | null {
  const mat = shape(type, rot);
  if (collides(board, mat, x, 0)) return null;

  const sim: Board = board.map((row) => row.slice());
  let y = 0;
  while (!collides(sim, mat, x, y + 1)) y++;

  let topRow = ROWS;
  for (let my = 0; my < mat.length; my++) {
    for (let mx = 0; mx < mat[my].length; mx++) {
      if (!mat[my][mx]) continue;
      const by = y + my;
      if (by < 0) return null;
      sim[by][x + mx] = type;
      if (by < topRow) topRow = by;
    }
  }

  const landingHeight = ROWS - topRow;
  const lines = countFull(sim);
  removeRows(sim, fullRows(sim));
  const f = featuresOf(sim);

  const score =
    -4.500158825082766 * landingHeight +
    3.4181268101392694 * lines -
    3.2178882868487753 * f.rowTransitions -
    9.348695305445199 * f.colTransitions -
    7.899265427351652 * f.holes -
    3.3855972247263626 * f.wells;

  return { rot, x, score };
}

function bestPlan(board: Board, type: PieceType): Plan {
  let best: Plan = { rot: 0, x: Math.floor((COLS - SHAPES[type].length) / 2), score: -Infinity };
  const seen = new Set<string>();

  for (let rot = 0; rot < 4; rot++) {
    const mat = shape(type, rot);
    const key = mat.map((r) => r.join('')).join('|');
    if (seen.has(key)) continue;
    seen.add(key);

    for (let x = -4; x < COLS + 2; x++) {
      const plan = evaluate(board, type, rot, x);
      if (plan && plan.score > best.score) best = plan;
    }
  }
  return best;
}

export function mountTetris(): void {
  const canvas = document.getElementById('tetris') as HTMLCanvasElement | null;
  const panel = document.querySelector<HTMLElement>('[data-tetris-panel]');
  if (!canvas || !panel) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const modeEl = panel.querySelector<HTMLElement>('[data-tetris-mode]');
  const hintEl = panel.querySelector<HTMLElement>('[data-tetris-hint]');
  const linesEl = panel.querySelector<HTMLElement>('[data-tetris-lines]');
  const dotEl = panel.querySelector<HTMLElement>('[data-tetris-dot]');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let board: Board = emptyBoard();
  let type: PieceType = 'T';
  let mat: number[][] = SHAPES.T;
  let px = 3;
  let py = 0;
  let plan: Plan | null = null;
  let nextType: PieceType = TYPES[Math.floor(Math.random() * TYPES.length)];

  let mode: Mode = 'agent';
  let running = false;
  let allowAuto = !reduced;
  let ambient = false;
  let raf = 0;
  let last = 0;
  let dropAcc = 0;
  let moveAcc = 0;
  let thinkAcc = 0;
  let softDrop = false;
  let lastInput = 0;
  let lines = 0;
  let cell = 20;
  let width = 0;
  let height = 0;

  let clearing: { rows: number[]; elapsed: number; settled: boolean } | null = null;
  const particles: Particle[] = [];

  const pickType = (): PieceType => {
    const t = nextType;
    nextType = TYPES[Math.floor(Math.random() * TYPES.length)];
    return t;
  };

  function updateDom(): void {
    if (modeEl) modeEl.textContent = mode === 'human' ? 'you · playing' : 'agent · playing';
    if (dotEl) dotEl.dataset.mode = mode;
    if (hintEl) hintEl.textContent = mode === 'human' ? 'esc to release' : 'autonomous';
    if (linesEl) linesEl.textContent = String(lines);
    panel!.classList.toggle('is-player', mode === 'human');
  }

  function setMode(next: Mode): void {
    mode = next;
    lastInput = performance.now();
    dropAcc = 0;
    moveAcc = 0;
    if (mode === 'human') {
      canvas!.focus({ preventScroll: true });
    } else {
      plan = bestPlan(board, type);
      thinkAcc = 140;
    }
    updateDom();
  }

  function seededBoard(n: number): void {
    board = emptyBoard();
    for (let i = 0; i < n; i++) {
      const t = TYPES[Math.floor(Math.random() * TYPES.length)];
      const p = bestPlan(board, t);
      const m = shape(t, p.rot);
      if (collides(board, m, p.x, 0)) break;
      let y = 0;
      while (!collides(board, m, p.x, y + 1)) y++;
      for (let my = 0; my < m.length; my++) {
        for (let mx = 0; mx < m[my].length; mx++) {
          if (!m[my][mx]) continue;
          const by = y + my;
          const bx = p.x + mx;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) board[by][bx] = t;
        }
      }
      removeRows(board, fullRows(board));
    }
  }

  function spawn(): void {
    type = pickType();
    plan = bestPlan(board, type);

    mat = shape(type, plan.rot);
    px = Math.floor((COLS - SHAPES[type].length) / 2);
    py = 0;

    if (collides(board, mat, px, 0)) {
      mat = shape(type, 0);
      plan = { ...plan, rot: 0, x: Math.floor((COLS - SHAPES[type].length) / 2) };
      if (collides(board, mat, px, 0)) {
        flush();
        return;
      }
    }

    thinkAcc = 220;
    moveAcc = 0;
    dropAcc = 0;
  }

  function flush(): void {
    for (let x = 0; x < COLS; x++) {
      for (let y = ROWS - 6; y < ROWS; y++) {
        if (board[y][x]) burstCell(x, y, board[y][x]!, 2);
      }
    }
    board = emptyBoard();
    lines = 0;
    spawn();
    updateDom();
  }

  function lock(): void {
    let above = false;
    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[y].length; x++) {
        if (!mat[y][x]) continue;
        const by = py + y;
        const bx = px + x;
        if (by < 0) {
          above = true;
          continue;
        }
        if (by < ROWS && bx >= 0 && bx < COLS) board[by][bx] = type;
      }
    }

    if (above) {
      flush();
      return;
    }

    const rows = fullRows(board);
    if (rows.length) {
      clearing = { rows, elapsed: 0, settled: false };
      if (rows.length >= 4) {
        panel!.classList.remove('is-clearing');
        void panel!.offsetWidth;
        panel!.classList.add('is-clearing');
        window.setTimeout(() => panel!.classList.remove('is-clearing'), 500);
      }
    } else {
      spawn();
    }
  }

  function stepDown(): void {
    if (!collides(board, mat, px, py + 1)) {
      py++;
    } else {
      lock();
    }
  }

  function movePiece(dx: number): boolean {
    if (!collides(board, mat, px + dx, py)) {
      px += dx;
      return true;
    }
    return false;
  }

  function rotatePiece(): void {
    const next = rotateCW(mat);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(board, next, px + kick, py)) {
        mat = next;
        px += kick;
        return;
      }
    }
  }

  function hardDrop(): void {
    while (!collides(board, mat, px, py + 1)) py++;
    lock();
  }

  function burstCell(cx: number, cy: number, typeKey: PieceType, power = 1): void {
    const color = COLORS[typeKey];
    const px0 = (cx + 0.5) * cell;
    const py0 = (cy + 0.5) * cell;
    const count = power > 1 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: px0,
        y: py0,
        vx: (Math.random() - 0.5) * 0.34 * power,
        vy: (Math.random() - 0.9) * 0.28 * power,
        life: 520 + Math.random() * 260,
        max: 780,
        size: cell * (0.14 + Math.random() * 0.16),
        color,
      });
    }
  }

  function settleClear(): void {
    if (!clearing) return;
    const { rows } = clearing;

    for (const row of rows) {
      for (let x = 0; x < COLS; x++) {
        const t = board[row][x];
        if (t) burstCell(x, row, t);
      }
    }

    lines += rows.length;
    removeRows(board, rows);
    updateDom();
  }

  function update(dt: number, now: number): void {
    if (clearing) {
      clearing.elapsed += dt;
      if (!clearing.settled && clearing.elapsed > 170) {
        clearing.settled = true;
        settleClear();
      }
      if (clearing.elapsed > 420) {
        clearing = null;
        spawn();
      }
      updateParticles(dt);
      return;
    }

    if (mode === 'human' && now - lastInput > 15000) {
      setMode('agent');
    }

    if (mode === 'agent' && plan) {
      thinkAcc -= dt;
      moveAcc += dt;

      if (thinkAcc <= 0) {
        if (px !== plan.x) {
          if (moveAcc >= 88) {
            moveAcc = 0;
            const dir = px < plan.x ? 1 : -1;
            if (!movePiece(dir)) {
              // blocked; rotate the remaining way or drop
              stepDown();
            }
          }
        } else if (moveAcc >= 48) {
          moveAcc = 0;
          stepDown();
        }
      }
    } else if (mode === 'human') {
      dropAcc += dt;
      const speed = softDrop ? 42 : 720;
      if (dropAcc >= speed) {
        dropAcc = 0;
        stepDown();
      }
    }

    updateParticles(dt);
  }

  function updateParticles(dt: number): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.vy += 0.0016 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas!.clientWidth || 240;
    const cssH = cssW * 2;
    canvas!.width = Math.round(cssW * dpr);
    canvas!.height = Math.round(cssH * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    width = cssW;
    height = cssH;
    cell = cssW / COLS;
  }

  function block(x: number, y: number, color: string, alpha = 1): void {
    const pad = Math.max(1, cell * 0.055);
    const s = cell - pad * 2;
    ctx!.globalAlpha = alpha;
    ctx!.fillStyle = color;
    ctx!.beginPath();
    if (typeof ctx!.roundRect === 'function') {
      ctx!.roundRect(x * cell + pad, y * cell + pad, s, s, Math.max(1.5, cell * 0.1));
    } else {
      ctx!.rect(x * cell + pad, y * cell + pad, s, s);
    }
    ctx!.fill();

    ctx!.globalAlpha = alpha * 0.22;
    ctx!.fillStyle = '#ffffff';
    ctx!.fillRect(x * cell + pad + 1, y * cell + pad + 1, s - 2, Math.max(1, cell * 0.045));
    ctx!.globalAlpha = 1;
  }

  function draw(): void {
    const w = width;
    const h = height;
    ctx!.clearRect(0, 0, w, h);
    ctx!.fillStyle = '#070708';
    ctx!.fillRect(0, 0, w, h);

    // grid
    ctx!.strokeStyle = 'rgba(236, 231, 221, 0.045)';
    ctx!.lineWidth = 1;
    ctx!.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx!.moveTo(Math.round(x * cell) + 0.5, 0);
      ctx!.lineTo(Math.round(x * cell) + 0.5, h);
    }
    for (let y = 1; y < ROWS; y++) {
      ctx!.moveTo(0, Math.round(y * cell) + 0.5);
      ctx!.lineTo(w, Math.round(y * cell) + 0.5);
    }
    ctx!.stroke();

    // settled cells
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = board[y][x];
        if (t) block(x, y, COLORS[t]);
      }
    }

    // ghost + active piece
    if (!clearing) {
      if (mode === 'human') {
        let gy = py;
        while (!collides(board, mat, px, gy + 1)) gy++;
        ctx!.globalAlpha = 0.16;
        for (let y = 0; y < mat.length; y++) {
          for (let x = 0; x < mat[y].length; x++) {
            if (!mat[y][x]) continue;
            const bx = px + x;
            const by = gy + y;
            if (by < 0) continue;
            ctx!.strokeStyle = COLORS[type];
            ctx!.lineWidth = 1.5;
            ctx!.strokeRect(bx * cell + 2, by * cell + 2, cell - 4, cell - 4);
          }
        }
        ctx!.globalAlpha = 1;
      }

      for (let y = 0; y < mat.length; y++) {
        for (let x = 0; x < mat[y].length; x++) {
          if (!mat[y][x]) continue;
          const bx = px + x;
          const by = py + y;
          if (by < 0) continue;
          block(bx, by, COLORS[type]);
        }
      }
    }

    // line-clear flash
    if (clearing && clearing.elapsed < 200) {
      const t = Math.min(clearing.elapsed / 170, 1);
      const alpha = 0.9 * (1 - t) ** 1.5;
      for (const row of clearing.rows) {
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = '#f6e7c8';
        ctx!.fillRect(0, row * cell, w, cell);
      }
      ctx!.globalAlpha = Math.max(0, 0.9 - t);
      ctx!.fillStyle = '#ffffff';
      const sweepW = w * Math.min(1, t * 1.25);
      ctx!.fillRect((w - sweepW) / 2, clearing.rows[0] * cell + cell / 2 - 1, sweepW, 2);
      ctx!.globalAlpha = 1;
    }

    // particles
    for (const p of particles) {
      const a = Math.max(0, p.life / p.max);
      ctx!.globalAlpha = a;
      ctx!.fillStyle = p.color;
      ctx!.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx!.globalAlpha = 1;
  }

  function frame(now: number): void {
    if (!running) return;
    const dt = Math.min(now - last, 48);
    last = now;
    update(dt, now);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start(): void {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop(): void {
    running = false;
    cancelAnimationFrame(raf);
  }

  // ── interaction ──────────────────────────────────────────────

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (ambient) return;
    allowAuto = true;
    if (mode !== 'human') {
      setMode('human');
      start();
    } else {
      lastInput = performance.now();
    }
  });

  canvas.addEventListener('keydown', (e) => {
    if (mode !== 'human') return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar'].includes(e.key)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (mode !== 'human' || ambient) return;
    lastInput = performance.now();

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        movePiece(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        movePiece(1);
        break;
      case 'ArrowUp':
      case 'x':
      case 'X':
        e.preventDefault();
        rotatePiece();
        break;
      case 'ArrowDown':
        e.preventDefault();
        softDrop = true;
        break;
      case ' ':
      case 'Spacebar':
        e.preventDefault();
        hardDrop();
        break;
      case 'Escape':
        setMode('agent');
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown') softDrop = false;
  });

  const actions: Record<string, () => void> = {
    left: () => movePiece(-1),
    right: () => movePiece(1),
    rotate: rotatePiece,
    down: stepDown,
    drop: hardDrop,
  };

  panel.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (ambient) return;
      allowAuto = true;
      if (mode !== 'human') setMode('human');
      lastInput = performance.now();
      actions[btn.dataset.action || '']?.();
      start();
    });
  });

  const heroEl = document.querySelector<HTMLElement>('.hero');
  const wide = window.matchMedia('(min-width: 1000px)');

  function updateAmbient(): void {
    const threshold = heroEl ? heroEl.offsetHeight * 0.6 : 340;
    const next = wide.matches && window.scrollY > threshold;
    if (next === ambient) return;
    ambient = next;
    panel!.classList.toggle('is-ambient', ambient);
    if (ambient && mode === 'human') setMode('agent');
  }

  window.addEventListener('scroll', updateAmbient, { passive: true });
  window.addEventListener('resize', updateAmbient);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (allowAuto) start();
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && allowAuto) {
          start();
        } else if (!entry.isIntersecting) {
          stop();
          if (mode === 'human') setMode('agent');
        }
      },
      { threshold: 0.02 },
    );
    io.observe(canvas);
  }

  const ro = new ResizeObserver(() => {
    resize();
    draw();
  });
  ro.observe(canvas);

  // ── boot ─────────────────────────────────────────────────────

  resize();
  seededBoard(14);
  updateAmbient();

  if (reduced) {
    // static until the visitor chooses to play
    spawn();
    draw();
    updateDom();
    return;
  }

  spawn();
  updateDom();
  start();
}

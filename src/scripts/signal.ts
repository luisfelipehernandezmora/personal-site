export function mountSignal(): void {
  const scene = document.querySelector<HTMLElement>('[data-signal]');
  const stage = scene?.querySelector<HTMLElement>('[data-signal-stage]');
  if (!scene || !stage) return;

  const path = stage.querySelector<SVGPathElement>('[data-signal-path]');
  const spark = stage.querySelector<SVGGElement>('[data-spark]');
  if (!path || !spark) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CYCLE = 6600;
  const TRAVEL = 4300;

  let total = 0;
  try {
    total = path.getTotalLength();
  } catch {
    total = 0;
  }

  let visible = false;
  let raf = 0;
  let start = performance.now();

  const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

  function frame(now: number): void {
    if (!visible || reduced || total === 0) return;

    const t = (now - start) % CYCLE;
    const p = Math.min(t / TRAVEL, 1);
    const point = path!.getPointAtLength(total * ease(p));

    spark!.setAttribute('transform', `translate(${point.x} ${point.y})`);
    spark!.style.opacity = p < 1 ? '1' : '0';
    scene!.classList.toggle('is-ringing', p > 0.84 && p < 1);

    raf = requestAnimationFrame(frame);
  }

  function play(): void {
    if (reduced) return;
    cancelAnimationFrame(raf);
    start = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop(): void {
    cancelAnimationFrame(raf);
    spark!.style.opacity = '0';
    scene!.classList.remove('is-ringing');
  }

  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    stage.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    stage.style.setProperty('--my', `${event.clientY - rect.top}px`);
  });

  stage.addEventListener('pointerleave', () => {
    stage.style.setProperty('--mx', '-500px');
    stage.style.setProperty('--my', '-500px');
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) play();
        else stop();
      },
      { threshold: 0.15 },
    );
    io.observe(scene);
  } else {
    visible = true;
    play();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (visible) play();
  });
}

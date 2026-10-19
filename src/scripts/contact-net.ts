const NS = "http://www.w3.org/2000/svg";

interface Point {
  x: number;
  y: number;
}

interface Trace {
  el: SVGPathElement;
  length: number;
}

interface Pulse {
  el: SVGCircleElement;
  trace: Trace;
  start: number;
  duration: number;
  from: number;
  to: number;
}

export function mountContactNet(): void {
  const container = document.querySelector<HTMLElement>("[data-contact-cards]");
  const svg = container?.querySelector<SVGSVGElement>("[data-contact-net]");
  if (!container || !svg) return;

  const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-card]"));
  if (cards.length < 2) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let traces: Trace[] = [];
  let pulses: Pulse[] = [];
  let centers: Point[] = [];
  let sourceEl: SVGCircleElement | null = null;
  let raf = 0;
  let activeIndex = -1;
  let leaveTimer = 0;
  let rebuildFrame = 0;
  let beatTimer = 0;
  let beatIndex = 0;
  let beatClassTimer = 0;
  let inView = false;

  const make = <K extends keyof SVGElementTagNameMap>(
    name: K,
    attrs: Record<string, string | number> = {},
  ): SVGElementTagNameMap[K] => {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) {
      node.setAttribute(key, String(value));
    }
    return node;
  };

  function build(): void {
    const rect = container!.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    svg!.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg!.setAttribute("width", String(width));
    svg!.setAttribute("height", String(height));
    svg!.replaceChildren();

    const defs = make("defs");

    const filter = make("filter", {
      id: "contactNetGlow",
      x: "-200%",
      y: "-200%",
      width: "500%",
      height: "500%",
    });
    filter.append(make("feGaussianBlur", { stdDeviation: "2", result: "blur" }));
    const merge = make("feMerge");
    merge.append(
      make("feMergeNode", { in: "blur" }),
      make("feMergeNode", { in: "SourceGraphic" }),
    );
    filter.append(merge);
    defs.append(filter);

    const glow = make("radialGradient", { id: "contactSourceGlow" });
    glow.append(
      make("stop", { offset: "0%", "stop-color": "rgba(240,185,104,0.42)" }),
      make("stop", { offset: "45%", "stop-color": "rgba(240,185,104,0.16)" }),
      make("stop", { offset: "100%", "stop-color": "rgba(240,185,104,0)" }),
    );
    defs.append(glow);

    centers = cards.map((card) => {
      const r = card.getBoundingClientRect();
      return {
        x: r.left - rect.left + r.width / 2,
        y: r.top - rect.top + r.height / 2,
      };
    });

    const sourceRadius = Math.min(190, Math.max(110, Math.min(width, height) * 0.36));
    sourceEl = make("circle", {
      class: "net-source",
      cx: width / 2,
      cy: height / 2,
      r: sourceRadius,
      fill: "url(#contactSourceGlow)",
    });

    const deco = make("g", {
      stroke: "rgba(236,231,221,0.075)",
      "stroke-width": "1",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });

    deco.append(
      make("rect", {
        x: 6,
        y: 6,
        width: width - 12,
        height: height - 12,
        rx: 8,
      }),
    );
    deco.append(make("path", { d: `M 12 26 L 30 8 H 54` }));
    deco.append(make("path", { d: `M ${width - 12} ${height - 26} L ${width - 30} ${height - 8} H ${width - 54}` }));
    deco.append(make("path", { d: `M ${width - 12} 26 L ${width - 30} 8 H ${width - 54}` }));
    deco.append(make("path", { d: `M 12 ${height - 26} L 30 ${height - 8} H 54` }));

    const inner = 10;
    const traceDefs: string[] = [];
    const pads: Point[] = [];

    const hCount = 8;
    for (let i = 0; i < hCount; i++) {
      const y = 12 + ((height - 24) * (i + 0.5)) / hCount;
      const a = width * (0.16 + (i % 3) * 0.08);
      const b = width * (0.56 + (i % 2) * 0.09);
      const jog = 8;
      traceDefs.push(
        `M ${inner} ${y} H ${a} L ${a + jog} ${y + jog} H ${b} L ${b + jog} ${y} H ${
          width - inner
        }`,
      );
      if (i % 2 === 0) {
        pads.push({ x: a + jog, y: y + jog }, { x: b, y: y + jog });
      }
    }

    const vCount = 6;
    for (let i = 0; i < vCount; i++) {
      const x = 12 + ((width - 24) * (i + 0.5)) / vCount;
      const a = height * (0.18 + (i % 3) * 0.1);
      const b = height * (0.58 + (i % 2) * 0.08);
      const jog = 8;
      traceDefs.push(
        `M ${x} ${inner} V ${a} L ${x + jog} ${a + jog} V ${b} L ${x} ${
          b + jog
        } V ${height - inner}`,
      );
      if (i % 2 === 0) {
        pads.push({ x: x + jog, y: a + jog }, { x: x, y: b + jog });
      }
    }

    for (let a = 0; a < centers.length; a++) {
      for (let b = a + 1; b < centers.length; b++) {
        const start = centers[a];
        const end = centers[b];
        const offset = b % 2 === 0 ? 12 : -12;
        const midX = (start.x + end.x) / 2 + offset;
        traceDefs.push(`M ${start.x} ${start.y} H ${midX} V ${end.y} H ${end.x}`);
      }
    }

    const base = make("g", {
      stroke: "rgba(236,231,221,0.125)",
      "stroke-width": "1",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    const lit = make("g", {
      class: "net-lit",
      stroke: "#f0b968",
      "stroke-width": "1",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });

    const litPaths: SVGPathElement[] = [];
    for (const d of traceDefs) {
      base.append(make("path", { d }));
      const litPath = make("path", { d });
      lit.append(litPath);
      litPaths.push(litPath);
    }

    const padsBase = make("g", { fill: "rgba(236,231,221,0.2)" });
    const padsLit = make("g", { fill: "#f0b968" });
    pads.forEach((pad) => {
      padsBase.append(make("circle", { cx: pad.x, cy: pad.y, r: 1.7 }));
      padsLit.append(make("circle", { cx: pad.x, cy: pad.y, r: 1.7 }));
    });
    lit.append(padsLit);

    const pulseLayer = make("g", {
      class: "net-pulses",
      filter: "url(#contactNetGlow)",
      "aria-hidden": "true",
    });

    svg!.append(defs, sourceEl, deco, base, lit, padsBase, pulseLayer);

    traces = litPaths.map((el) => ({ el, length: el.getTotalLength() }));

    pulses = [];
    activeIndex = -1;
    container!.classList.remove("is-active");
  }

  function clearPulses(): void {
    svg!.querySelector(".net-pulses")?.replaceChildren();
    pulses = [];
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  const easeInOut = (t: number): number =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  function addPulse(trace: Trace, start: number, from: number, to: number): void {
    const layer = svg!.querySelector(".net-pulses");
    if (!layer) return;

    const circle = make("circle", {
      cx: -10,
      cy: -10,
      r: 2.4,
      fill: "#f0b968",
      opacity: "0",
    });
    layer.append(circle);

    const distance = Math.abs(to - from);
    pulses.push({
      el: circle,
      trace,
      start,
      duration: Math.min(1500, 340 + distance * 0.8),
      from,
      to,
    });
  }

  function ensureTick(): void {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick(now: number): void {
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pulse = pulses[i];
      const elapsed = now - pulse.start;
      if (elapsed < 0) continue;

      const t = Math.min(1, elapsed / pulse.duration);
      const eased = easeInOut(t);
      const position = pulse.from + (pulse.to - pulse.from) * eased;
      const point = pulse.trace.el.getPointAtLength(position);

      pulse.el.setAttribute("cx", String(point.x));
      pulse.el.setAttribute("cy", String(point.y));
      pulse.el.style.opacity = t < 1 ? "1" : "0";

      if (t >= 1) {
        pulse.el.remove();
        pulses.splice(i, 1);
      }
    }

    if (pulses.length) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
    }
  }

  function nearestPoint(
    trace: Trace,
    x: number,
    y: number,
  ): { at: number; distance: number } {
    const steps = 24;
    let bestAt = 0;
    let bestDistance = Infinity;

    for (let i = 0; i <= steps; i++) {
      const at = (trace.length * i) / steps;
      const point = trace.el.getPointAtLength(at);
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAt = at;
      }
    }

    return { at: bestAt, distance: bestDistance };
  }

  function fire(index: number, limit: number): void {
    const center = centers[index];
    if (!center) return;

    const candidates = traces
      .map((trace) => ({
        trace,
        ...nearestPoint(trace, center.x, center.y),
      }))
      .filter((item) => item.distance < 340)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    const baseStart = performance.now() + 50;

    candidates.forEach((candidate) => {
      const start = baseStart + candidate.distance * 0.85;
      const length = candidate.trace.length;

      if (candidate.at > 30) {
        addPulse(candidate.trace, start, candidate.at, 0);
      }
      if (length - candidate.at > 30) {
        addPulse(candidate.trace, start, candidate.at, length);
      }
    });

    ensureTick();
  }

  function activate(index: number): void {
    activeIndex = index;
    window.clearTimeout(leaveTimer);
    container!.classList.add("is-active");

    const center = centers[index];
    if (sourceEl && center) {
      sourceEl.setAttribute("cx", String(center.x));
      sourceEl.setAttribute("cy", String(center.y));
    }

    if (reduced || !center) return;

    clearPulses();
    fire(index, 20);
  }

  function beat(): void {
    if (!inView || activeIndex !== -1 || reduced) return;

    const index = beatIndex % cards.length;
    beatIndex += 1;

    const center = centers[index];
    if (sourceEl && center) {
      sourceEl.setAttribute("cx", String(center.x));
      sourceEl.setAttribute("cy", String(center.y));
    }

    container!.classList.add("is-beating");
    window.clearTimeout(beatClassTimer);
    beatClassTimer = window.setTimeout(() => {
      container!.classList.remove("is-beating");
    }, 280);

    fire(index, 6);
  }

  function startBeats(): void {
    if (reduced) return;
    window.clearInterval(beatTimer);
    beatTimer = window.setInterval(beat, 500);
    beat();
  }

  function stopBeats(): void {
    window.clearInterval(beatTimer);
    beatTimer = 0;
    window.clearTimeout(beatClassTimer);
    container!.classList.remove("is-beating");
  }

  function deactivate(): void {
    activeIndex = -1;
    window.clearTimeout(leaveTimer);
    leaveTimer = window.setTimeout(() => {
      if (activeIndex !== -1) return;
      container!.classList.remove("is-active");
      clearPulses();
    }, 380);
  }

  cards.forEach((card, index) => {
    card.addEventListener("pointerenter", () => activate(index));
    card.addEventListener("pointerleave", deactivate);
    card.addEventListener("focus", () => activate(index));
    card.addEventListener("blur", deactivate);
  });

  const scheduleBuild = (): void => {
    if (rebuildFrame) cancelAnimationFrame(rebuildFrame);
    rebuildFrame = requestAnimationFrame(() => {
      rebuildFrame = 0;
      build();
    });
  };

  build();

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) startBeats();
        else stopBeats();
      },
      { threshold: 0.15 },
    );
    io.observe(container);
  } else {
    inView = true;
    startBeats();
  }

  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(scheduleBuild);
    ro.observe(container);
  } else {
    window.addEventListener("resize", scheduleBuild);
  }
}

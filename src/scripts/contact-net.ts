const NS = "http://www.w3.org/2000/svg";

interface Point {
  x: number;
  y: number;
}

interface Link {
  el: SVGPathElement;
  a: number;
  b: number;
}

interface Pulse {
  el: SVGCircleElement;
  path: SVGPathElement;
  start: number;
  duration: number;
  forward: boolean;
}

export function mountContactNet(): void {
  const container = document.querySelector<HTMLElement>("[data-contact-cards]");
  const svg = container?.querySelector<SVGSVGElement>("[data-contact-net]");
  if (!container || !svg) return;

  const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-card]"));
  if (cards.length < 2) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let links: Link[] = [];
  let pulses: Pulse[] = [];
  let raf = 0;
  let activeIndex = -1;
  let leaveTimer = 0;
  let rebuildFrame = 0;

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
    filter.append(make("feGaussianBlur", { stdDeviation: "2.2", result: "blur" }));
    const merge = make("feMerge");
    merge.append(
      make("feMergeNode", { in: "blur" }),
      make("feMergeNode", { in: "SourceGraphic" }),
    );
    filter.append(merge);
    defs.append(filter);

    const centers: Point[] = cards.map((card) => {
      const r = card.getBoundingClientRect();
      return {
        x: r.left - rect.left + r.width / 2,
        y: r.top - rect.top + r.height / 2,
      };
    });

    const deco = make("g", {
      stroke: "rgba(236,231,221,0.09)",
      "stroke-width": "1",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });

    centers.forEach((center, index) => {
      const top = index < 2;
      const left = index % 2 === 0;
      const edgeX = left ? 7 : width - 7;
      const edgeY = top ? 7 : height - 7;
      const d = `M ${center.x} ${center.y} H ${
        left ? center.x - 28 : center.x + 28
      } V ${edgeY} H ${edgeX}`;
      deco.append(make("path", { d }));
      deco.append(
        make("circle", {
          cx: edgeX,
          cy: edgeY,
          r: 2,
          fill: "rgba(236,231,221,0.2)",
          stroke: "none",
        }),
      );
    });

    const gapY = centers[0].y + (centers[2].y - centers[0].y) / 2;
    deco.append(make("path", { d: `M 8 ${gapY} H ${width - 8}` }));
    deco.append(make("path", { d: `M ${width / 2} 8 V ${height - 8}` }));

    for (let i = 1; i <= 3; i++) {
      const y = gapY - i * 5;
      deco.append(make("path", { d: `M 18 ${y} H ${width * 0.34}` }));
      deco.append(make("path", { d: `M ${width * 0.66} ${y} H ${width - 18}` }));
    }

    const base = make("g", {
      stroke: "rgba(236,231,221,0.13)",
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

    links = [];
    for (let a = 0; a < centers.length; a++) {
      for (let b = a + 1; b < centers.length; b++) {
        const start = centers[a];
        const end = centers[b];
        const offset = b % 3 === 0 ? 14 : -14;
        const midX = (start.x + end.x) / 2 + offset;
        const d = `M ${start.x} ${start.y} H ${midX} V ${end.y} H ${end.x}`;
        base.append(make("path", { d }));
        const litPath = make("path", { d });
        lit.append(litPath);
        links.push({ el: litPath, a, b });
      }
    }

    const pads = make("g", { fill: "rgba(236,231,221,0.2)" });
    pads.append(make("circle", { cx: width / 2, cy: gapY, r: 2.4 }));
    pads.append(make("circle", { cx: width / 2, cy: 8, r: 1.8 }));
    pads.append(make("circle", { cx: width / 2, cy: height - 8, r: 1.8 }));

    const pulseLayer = make("g", {
      class: "net-pulses",
      filter: "url(#contactNetGlow)",
      "aria-hidden": "true",
    });

    svg!.append(defs, deco, base, lit, pads, pulseLayer);
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

  function tick(now: number): void {
    let alive = false;

    for (const pulse of pulses) {
      const elapsed = now - pulse.start;
      if (elapsed < 0) {
        alive = true;
        continue;
      }

      const t = Math.min(1, elapsed / pulse.duration);
      const length = pulse.path.getTotalLength();
      const eased = easeInOut(t);
      const point = pulse.path.getPointAtLength(
        pulse.forward ? length * eased : length * (1 - eased),
      );

      pulse.el.setAttribute("cx", String(point.x));
      pulse.el.setAttribute("cy", String(point.y));
      pulse.el.style.opacity = t < 1 ? "1" : "0";

      if (t < 1) alive = true;
    }

    if (alive) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
    }
  }

  function activate(index: number): void {
    activeIndex = index;
    window.clearTimeout(leaveTimer);
    container!.classList.add("is-active");

    if (reduced) return;

    clearPulses();
    const layer = svg!.querySelector(".net-pulses");
    if (!layer) return;

    const connected = links.filter((link) => link.a === index || link.b === index);
    const startBase = performance.now() + 60;

    connected.forEach((link, order) => {
      const circle = make("circle", {
        cx: -10,
        cy: -10,
        r: 2.6,
        fill: "#f0b968",
        opacity: "0",
      });
      layer.append(circle);
      pulses.push({
        el: circle,
        path: link.el,
        start: startBase + order * 90,
        duration: 820,
        forward: link.a === index,
      });
    });

    if (pulses.length) raf = requestAnimationFrame(tick);
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

  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(scheduleBuild);
    ro.observe(container);
  } else {
    window.addEventListener("resize", scheduleBuild);
  }
}

export interface LoopConfig {
  update: (dt: number) => void;
  render: (alpha: number) => void;
  timestepMs: number;
}

export interface LoopControls {
  start: () => void;
  stop: () => void;
}

export function createLoop({ update, render, timestepMs }: LoopConfig): LoopControls {
  let raf = 0;
  let accumulator = 0;
  let last = 0;
  let running = false;

  function frame(now: number) {
    if (!running) {
      return;
    }
    raf = window.requestAnimationFrame(frame);
    if (!last) {
      last = now;
      return;
    }

    let delta = now - last;
    if (delta > 1000) {
      delta = timestepMs;
    }
    last = now;
    accumulator += delta;

    const maxFrame = timestepMs * 5;
    if (accumulator > maxFrame) {
      accumulator = maxFrame;
    }

    while (accumulator >= timestepMs) {
      update(timestepMs / 1000);
      accumulator -= timestepMs;
    }

    const alpha = accumulator / timestepMs;
    render(alpha);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      accumulator = 0;
      raf = window.requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
    },
  };
}

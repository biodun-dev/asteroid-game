import { config } from './config';
import { createLoop } from './engine/loop';
import { createHUD } from './hud';
import type { createGame } from './game';
import type { HUDRefs, InputState } from './types';

const keyBindings: Record<string, keyof InputState> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'thrust',
  a: 'left',
  d: 'right',
  w: 'thrust',
};

type GameHandle = ReturnType<typeof createGame>;

export function bootstrapGame(canvas: HTMLCanvasElement, game: GameHandle, hudRefs: HUDRefs) {
  const hud = createHUD(hudRefs);
  const input = game.input;
  let instructionsVisible = true;
  const boundTouchHandlers: Array<{
    target: HTMLElement;
    down: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
  }> = [];

  const loop = createLoop({
    timestepMs: config.timestepMs,
    update: (dt) => {
      game.update(dt);
      const hudState = game.consumeHudState();
      if (hudState) {
        hud.update(hudState);
      }
    },
    render: (alpha) => {
      game.render(alpha);
    },
  });

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    game.setSize(width, height);
  }

  function markInteraction() {
    if (instructionsVisible) {
      hud.showInstructions(false);
      instructionsVisible = false;
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.repeat) return;
    const action = keyBindings[event.key];
    if (action) {
      event.preventDefault();
      input[action] = true;
      markInteraction();
    }
    if (event.code === 'Space') {
      event.preventDefault();
      input.shoot = true;
      markInteraction();
    }
  }

  function onKeyUp(event: KeyboardEvent) {
    const action = keyBindings[event.key];
    if (action) {
      event.preventDefault();
      input[action] = false;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      input.shoot = false;
    }
  }

  function preventScroll(event: Event) {
    event.preventDefault();
  }

  function bindTouchControls() {
    const touchTargets = Array.from(document.querySelectorAll('[data-key]')) as HTMLElement[];
    for (const target of touchTargets) {
      const key = target.dataset.key;
      if (!key) continue;
      const down = (event: PointerEvent) => {
        markInteraction();
        if (key === ' ') {
          input.shoot = true;
        } else {
          const action = keyBindings[key];
          if (action) input[action] = true;
        }
        target.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      };
      const release = (event: PointerEvent) => {
        if (key === ' ') {
          input.shoot = false;
        } else {
          const action = keyBindings[key];
          if (action) input[action] = false;
        }
        event.preventDefault();
      };
      target.addEventListener('pointerdown', down);
      target.addEventListener('pointerup', release);
      target.addEventListener('pointercancel', release);
      target.addEventListener('pointerleave', release);
      boundTouchHandlers.push({ target, down, up: release });
    }
    document.addEventListener('touchmove', preventScroll, { passive: false });
  }

  function unbindTouchControls() {
    document.removeEventListener('touchmove', preventScroll);
    for (const binding of boundTouchHandlers) {
      binding.target.removeEventListener('pointerdown', binding.down);
      binding.target.removeEventListener('pointerup', binding.up);
      binding.target.removeEventListener('pointercancel', binding.up);
      binding.target.removeEventListener('pointerleave', binding.up);
    }
    boundTouchHandlers.length = 0;
  }

  function restart() {
    input.left = input.right = input.thrust = input.shoot = false;
    instructionsVisible = true;
    hud.showInstructions(true);
    game.reset();
    const hudState = game.consumeHudState();
    if (hudState) {
      hud.update(hudState);
    }
  }

  resize();
  restart();

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  const restartButton = hudRefs.restart.current;
  const onRestart = () => restart();
  restartButton?.addEventListener('click', onRestart);

  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    bindTouchControls();
  }

  const hudState = game.consumeHudState();
  if (hudState) {
    hud.update(hudState);
  }

  return {
    start() {
      loop.start();
    },
    destroy() {
      loop.stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      restartButton?.removeEventListener('click', onRestart);
      unbindTouchControls();
    },
  };
}

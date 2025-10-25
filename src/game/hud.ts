import type { HUDRefs, HUDSnapshot } from './types';

export function createHUD(refs: HUDRefs) {
  function setText(el: HTMLElement | null, text: string) {
    if (el) {
      el.textContent = text;
    }
  }

  function setDisplay(el: HTMLElement | null, value: 'none' | 'flex' | 'block') {
    if (el) {
      el.style.display = value;
    }
  }

  function update(snapshot: HUDSnapshot) {
    setText(refs.score.current, `Score: ${snapshot.score}`);
    if (refs.lives.current) {
      refs.lives.current.innerHTML = '❤️'.repeat(Math.max(0, snapshot.lives));
    }
    setText(refs.wave.current, `Wave: ${snapshot.wave}`);
    setText(refs.multiplier.current, `x${snapshot.multiplier.toFixed(1)}`);

    if (snapshot.isGameOver) {
      setDisplay(refs.gameOver.current, 'flex');
      setDisplay(refs.instructions.current, 'none');
      if (refs.finalScore.current) {
        refs.finalScore.current.textContent = `${snapshot.score}`;
      }
    } else {
      setDisplay(refs.gameOver.current, 'none');
    }
  }

  function showInstructions(value: boolean) {
    setDisplay(refs.instructions.current, value ? 'block' : 'none');
  }

  return {
    update,
    showInstructions,
  };
}

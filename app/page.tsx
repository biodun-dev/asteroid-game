'use client';

import Head from 'next/head';
import { useEffect, useRef } from 'react';
import { bootstrapGame } from '@/src/game/bootstrap';
import { createGame } from '@/src/game/game';
import type { HUDRefs } from '@/src/game/types';

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scoreRef = useRef<HTMLDivElement | null>(null);
  const livesRef = useRef<HTMLDivElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const multiplierRef = useRef<HTMLDivElement | null>(null);
  const gameOverRef = useRef<HTMLDivElement | null>(null);
  const finalScoreRef = useRef<HTMLSpanElement | null>(null);
  const restartButtonRef = useRef<HTMLButtonElement | null>(null);
  const instructionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const hudRefs: HUDRefs = {
      score: scoreRef,
      lives: livesRef,
      wave: waveRef,
      multiplier: multiplierRef,
      gameOver: gameOverRef,
      finalScore: finalScoreRef,
      instructions: instructionsRef,
      restart: restartButtonRef,
    };

    const game = createGame(ctx);
    const { start, destroy } = bootstrapGame(canvas, game, hudRefs);
    start();
    return () => {
      destroy();
    };
  }, []);

  return (
    <>
      <Head>
        <title>Asteroid Shooter</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <canvas ref={canvasRef} id="gameCanvas" />

      <div id="gameUI">
        <div className="left">
          <div id="score" ref={scoreRef}>
            Score: 0
          </div>
          <div id="wave" ref={waveRef}>
            Wave: 1
          </div>
        </div>
        <div className="right">
          <div id="multiplier" ref={multiplierRef}>
            x1.0
          </div>
          <div id="lives" ref={livesRef}>
            ❤️❤️❤️
          </div>
        </div>
      </div>

      <div id="instructions" ref={instructionsRef}>
        Use [↑] to Thrust, [←] [→] to Rotate, [Space] to Shoot
      </div>

      <div id="gameOver" ref={gameOverRef}>
        <h1>GAME OVER</h1>
        <p>
          Final Score: <span id="finalScore" ref={finalScoreRef}>0</span>
        </p>
        <button id="restartButton" ref={restartButtonRef}>
          Restart Game
        </button>
      </div>

      <div id="controls" aria-hidden="true">
        <div className="cluster left">
          <button className="ctl" data-key="ArrowLeft" aria-label="Rotate Left">
            ⟲
          </button>
          <button className="ctl" data-key="ArrowRight" aria-label="Rotate Right">
            ⟳
          </button>
          <button className="ctl thrust" data-key="ArrowUp" aria-label="Thrust">
            ↑
          </button>
        </div>
        <div className="cluster right">
          <button className="ctl shoot" data-key=" " aria-label="Shoot">
            ⦿
          </button>
        </div>
      </div>

      <style jsx global>{`
        html,
        body,
        #__next {
          height: 100%;
        }
        body {
          font-family: 'Inter', sans-serif;
          background-color: #000;
          color: #fff;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        canvas {
          display: block;
          background-color: #000;
        }
        #gameUI {
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          display: flex;
          justify-content: space-between;
          font-size: 1.2rem;
          font-weight: 700;
          color: white;
          pointer-events: none;
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.7);
          z-index: 10;
          gap: 1rem;
        }
        #gameUI .left,
        #gameUI .right {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          align-items: flex-start;
        }
        #gameUI .right {
          align-items: flex-end;
        }
        #lives {
          font-size: 1.8rem;
          letter-spacing: 0.2em;
        }
        #multiplier {
          font-size: 1rem;
          color: #7dd3fc;
        }
        #wave {
          font-size: 1rem;
          color: #c4b5fd;
        }
        #gameOver {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(20, 20, 30, 0.85);
          border: 2px solid #fff;
          border-radius: 16px;
          padding: 2rem 3rem;
          text-align: center;
          display: none;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 0 20px rgba(0, 200, 255, 0.5);
          backdrop-filter: blur(5px);
          z-index: 20;
        }
        #gameOver h1 {
          margin: 0 0 1rem 0;
          font-size: 3rem;
          color: #ff4d4d;
        }
        #gameOver p {
          margin: 0.5rem 0;
          font-size: 1.5rem;
        }
        #restartButton {
          font-family: 'Inter', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: #000;
          background-image: linear-gradient(to right, #00c6ff, #0072ff);
          border: none;
          border-radius: 12px;
          padding: 0.8rem 1.5rem;
          margin-top: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 198, 255, 0.4);
          pointer-events: auto;
        }
        #restartButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 198, 255, 0.6);
        }
        #instructions {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255, 255, 255, 0.7);
          font-size: 1rem;
          pointer-events: none;
          z-index: 10;
        }
        #controls {
          position: absolute;
          inset: 0;
          display: none;
          justify-content: space-between;
          align-items: flex-end;
          padding: 16px;
          pointer-events: none;
          z-index: 15;
        }
        #controls .cluster {
          display: flex;
          gap: 12px;
          pointer-events: auto;
        }
        .ctl {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.08);
          border: 2px solid rgba(255, 255, 255, 0.25);
          color: #fff;
          font-size: 1.4rem;
          border-radius: 14px;
          backdrop-filter: blur(6px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
          touch-action: none;
        }
        .ctl:active {
          transform: scale(0.98);
        }
        .thrust {
          width: 84px;
        }
        .shoot {
          width: 90px;
          height: 90px;
          font-size: 1.8rem;
          border-radius: 50%;
        }

        @media (pointer: coarse) {
          #controls {
            display: flex;
          }
          #instructions {
            display: none;
          }
          body {
            touch-action: none;
          }
        }
      `}</style>
    </>
  );
}

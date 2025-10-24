'use client';

import Head from 'next/head';
import { useEffect, useRef } from 'react';

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scoreRef = useRef<HTMLDivElement | null>(null);
  const livesRef = useRef<HTMLDivElement | null>(null);
  const gameOverRef = useRef<HTMLDivElement | null>(null);
  const finalScoreRef = useRef<HTMLSpanElement | null>(null);
  const restartButtonRef = useRef<HTMLButtonElement | null>(null);
  const instructionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let score = 0;
    let lives = 3;
    let isGameOver = false;
    let player: any;
    let bullets: any[] = [];
    let asteroids: any[] = [];
    let particles: any[] = [];
    let keys: Record<string, boolean> = {};
    let level = 1;
    let raf = 0;

    const PLAYER_SIZE = 20;
    const BULLET_SPEED = 7;
    const ASTEROID_BASE_SPEED = 1.5;
    const FRICTION = 0.99;
    const THRUST_POWER = 0.1;
    const ROTATION_SPEED = 0.05;
    const SHOOT_COOLDOWN = 200;
    const INVINCIBILITY_TIME = 2000;
    const PARTICLE_LIFETIME = 50;
    const PARTICLE_COUNT = 5;

    const scoreEl = scoreRef.current as HTMLDivElement;
    const livesEl = livesRef.current as HTMLDivElement;
    const gameOverEl = gameOverRef.current as HTMLDivElement;
    const finalScoreEl = finalScoreRef.current as HTMLSpanElement;
    const restartButton = restartButtonRef.current as HTMLButtonElement;
    const instructionsEl = instructionsRef.current as HTMLDivElement;

    class Player {
      x: number;
      y: number;
      radius: number;
      angle: number;
      velocity: { x: number; y: number };
      rotation: number;
      thrusting: boolean;
      canShoot: boolean;
      isInvincible: boolean;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.radius = PLAYER_SIZE / 2;
        this.angle = 0;
        this.velocity = { x: 0, y: 0 };
        this.rotation = 0;
        this.thrusting = false;
        this.canShoot = true;
        this.isInvincible = false;
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius * 0.8, this.radius * 0.8);
        ctx.lineTo(-this.radius * 0.8, this.radius * 0.8);
        ctx.closePath();
        if (this.isInvincible && Math.floor(Date.now() / 200) % 2 === 0) {
          ctx.strokeStyle = 'cyan';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'cyan';
        } else {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (this.thrusting && !isGameOver) {
          ctx.beginPath();
          const flameLength = this.radius * 1.5 + Math.random() * 5;
          ctx.moveTo(0, this.radius * 0.9);
          ctx.lineTo(this.radius * 0.5, flameLength);
          ctx.lineTo(-this.radius * 0.5, flameLength);
          ctx.closePath();
          ctx.fillStyle = Math.random() < 0.5 ? 'orange' : 'yellow';
          ctx.fill();
        }
        ctx.restore();
      }

      update() {
        this.angle += this.rotation;
        if (this.thrusting) {
          this.velocity.x += Math.sin(this.angle) * THRUST_POWER;
          this.velocity.y -= Math.cos(this.angle) * THRUST_POWER;
        }
        this.velocity.x *= FRICTION;
        this.velocity.y *= FRICTION;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.wrapEdges();
      }

      wrapEdges() {
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      }

      shoot() {
        if (this.canShoot && !isGameOver) {
          bullets.push(
            new Bullet(
              this.x + Math.sin(this.angle) * this.radius,
              this.y - Math.cos(this.angle) * this.radius,
              this.angle
            )
          );
          this.canShoot = false;
          setTimeout(() => (this.canShoot = true), SHOOT_COOLDOWN);
        }
      }

      hit() {
        if (this.isInvincible) return;
        lives--;
        createParticles(this.x, this.y, 'cyan');
        updateUI();
        if (lives <= 0) {
          gameOver();
        } else {
          this.reset();
        }
      }

      reset() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.velocity = { x: 0, y: 0 };
        this.angle = 0;
        this.isInvincible = true;
        setTimeout(() => (this.isInvincible = false), INVINCIBILITY_TIME);
      }
    }

    class Bullet {
      x: number;
      y: number;
      angle: number;
      velocity: { x: number; y: number };
      radius: number;
      lifetime: number;

      constructor(x: number, y: number, angle: number) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.velocity = {
          x: Math.sin(angle) * BULLET_SPEED,
          y: -Math.cos(angle) * BULLET_SPEED,
        };
        this.radius = 3;
        this.lifetime = 80;
      }

      draw() {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.lifetime--;
      }
    }

    class Asteroid {
      size: number;
      radius: number;
      x: number;
      y: number;
      velocity: { x: number; y: number };
      angle: number;
      rotationSpeed: number;
      shapePoints: { x: number; y: number }[];

      constructor(x: number | null, y: number | null, size: number) {
        this.size = size;
        this.radius = size * 15;
        this.x = x ?? Math.random() * canvas.width;
        this.y = y ?? Math.random() * canvas.height;
        if (player) {
          while (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius + 100) {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
          }
        }
        this.velocity = {
          x: (Math.random() - 0.5) * ASTEROID_BASE_SPEED * (4 - size) * (1 + level * 0.1),
          y: (Math.random() - 0.5) * ASTEROID_BASE_SPEED * (4 - size) * (1 + level * 0.1),
        };
        this.angle = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.shapePoints = [];
        const numPoints = 10 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numPoints; i++) {
          const a = (i / numPoints) * Math.PI * 2;
          const r = this.radius + (Math.random() - 0.5) * this.radius * 0.5;
          this.shapePoints.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.shapePoints[0].x, this.shapePoints[0].y);
        for (let i = 1; i < this.shapePoints.length; i++) {
          ctx.lineTo(this.shapePoints[i].x, this.shapePoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.angle += this.rotationSpeed;
        this.wrapEdges();
      }

      wrapEdges() {
        if (this.x < -this.radius) this.x = canvas.width + this.radius;
        if (this.x > canvas.width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = canvas.height + this.radius;
        if (this.y > canvas.height + this.radius) this.y = -this.radius;
      }

      break() {
        createParticles(this.x, this.y, 'white');
        if (this.size > 1) {
          asteroids.push(new Asteroid(this.x, this.y, this.size - 1));
          asteroids.push(new Asteroid(this.x, this.y, this.size - 1));
        }
        if (this.size === 3) score += 20;
        else if (this.size === 2) score += 50;
        else score += 100;
        updateUI();
      }
    }

    class Particle {
      x: number;
      y: number;
      color: string;
      radius: number;
      velocity: { x: number; y: number };
      lifetime: number;
      opacity: number;

      constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 2 + 1;
        this.velocity = { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 };
        this.lifetime = PARTICLE_LIFETIME + Math.random() * 20;
        this.opacity = 1;
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.lifetime--;
        this.opacity = this.lifetime / PARTICLE_LIFETIME;
      }
    }

    function createParticles(x: number, y: number, color: string) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle(x, y, color));
      }
    }

    function dist(x1: number, y1: number, x2: number, y2: number) {
      return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    function checkCollision(obj1: any, obj2: any) {
      return dist(obj1.x, obj1.y, obj2.x, obj2.y) < obj1.radius + obj2.radius;
    }

    function updateUI() {
      scoreEl.textContent = `Score: ${score}`;
      livesEl.innerHTML = '❤️'.repeat(lives);
    }

    function initGame() {
      score = 0;
      lives = 3;
      level = 1;
      isGameOver = false;
      bullets = [];
      asteroids = [];
      particles = [];
      player = new Player(canvas.width / 2, canvas.height / 2);
      spawnAsteroids(level + 4);
      updateUI();
      gameOverEl.style.display = 'none';
      instructionsEl.style.display = 'block';
    }

    function spawnAsteroids(count: number) {
      for (let i = 0; i < count; i++) {
        asteroids.push(new Asteroid(null, null, 3));
      }
    }

    function gameOver() {
      isGameOver = true;
      finalScoreEl.textContent = String(score);
      gameOverEl.style.display = 'flex';
      instructionsEl.style.display = 'none';
    }

    function restartGame() {
      initGame();
      gameLoop();
    }

    function handleInput() {
      if (isGameOver) return;
      player.rotation = 0;
      player.thrusting = false;
      if (keys['ArrowLeft'] || keys['a']) player.rotation = -ROTATION_SPEED;
      if (keys['ArrowRight'] || keys['d']) player.rotation = ROTATION_SPEED;
      if (keys['ArrowUp'] || keys['w']) player.thrusting = true;
      if (keys[' ']) {
        player.shoot();
        keys[' '] = false;
      }
    }

    function gameLoop() {
      if (isGameOver) return;
      raf = requestAnimationFrame(gameLoop);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      handleInput();
      player.update();
      player.draw();

      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].lifetime <= 0) particles.splice(i, 1);
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        bullets[i].draw();
        if (bullets[i].lifetime <= 0) bullets.splice(i, 1);
      }

      for (let i = asteroids.length - 1; i >= 0; i--) {
        asteroids[i].update();
        asteroids[i].draw();
        if (checkCollision(player, asteroids[i])) player.hit();
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = asteroids.length - 1; j >= 0; j--) {
          if (checkCollision(bullets[i], asteroids[j])) {
            asteroids[j].break();
            asteroids.splice(j, 1);
            bullets.splice(i, 1);
            break;
          }
        }
      }

      if (asteroids.length === 0) {
        level++;
        player.reset();
        spawnAsteroids(level + 4);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      keys[e.key] = true;
    }

    function onKeyUp(e: KeyboardEvent) {
      keys[e.key] = false;
    }

    function onResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (player) {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
      }
    }

    const isTouch = typeof window !== 'undefined' &&
      (navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches);

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: false });
    window.addEventListener('resize', onResize, { passive: true });
    restartButton.addEventListener('click', restartGame, { passive: true });

    function setKey(key: string, v: boolean) {
      keys[key] = v;
    }

    function preventScroll(e: Event) {
      e.preventDefault();
    }

    if (isTouch) {
      const touchTargets = Array.from(document.querySelectorAll('[data-key]')) as HTMLElement[];
      for (const el of touchTargets) {
        const key = el.dataset.key as string;
        el.addEventListener('pointerdown', (e) => {
          setKey(key, true);
          (e as PointerEvent).preventDefault();
          (e as PointerEvent).stopPropagation();
          (el as HTMLElement).setPointerCapture?.((e as PointerEvent).pointerId);
        });
        el.addEventListener('pointerup', (e) => {
          setKey(key, false);
          (e as PointerEvent).preventDefault();
          (e as PointerEvent).stopPropagation();
        });
        el.addEventListener('pointercancel', () => setKey(key, false));
        el.addEventListener('pointerleave', () => setKey(key, false));
      }
      document.addEventListener('touchmove', preventScroll, { passive: false });
    }

    initGame();
    gameLoop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      restartButton.removeEventListener('click', restartGame);
      document.removeEventListener('touchmove', preventScroll as any);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Asteroid Shooter</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <canvas ref={canvasRef} id="gameCanvas" />

      <div id="gameUI">
        <div id="score" ref={scoreRef}>Score: 0</div>
        <div id="lives" ref={livesRef}>❤️❤️❤️</div>
      </div>

      <div id="instructions" ref={instructionsRef}>
        Use [↑] to Thrust, [←] [→] to Rotate, [Space] to Shoot
      </div>

      <div id="gameOver" ref={gameOverRef}>
        <h1>GAME OVER</h1>
        <p>Final Score: <span id="finalScore" ref={finalScoreRef}>0</span></p>
        <button id="restartButton" ref={restartButtonRef}>Restart Game</button>
      </div>

      <div id="controls" aria-hidden="true">
        <div className="cluster left">
          <button className="ctl" data-key="ArrowLeft" aria-label="Rotate Left">⟲</button>
          <button className="ctl" data-key="ArrowRight" aria-label="Rotate Right">⟳</button>
          <button className="ctl thrust" data-key="ArrowUp" aria-label="Thrust">↑</button>
        </div>
        <div className="cluster right">
          <button className="ctl shoot" data-key=" " aria-label="Shoot">⦿</button>
        </div>
      </div>

      <style jsx global>{`
        html, body, #__next { height: 100%; }
        body {
          font-family: 'Inter', sans-serif;
          background-color: #000;
          color: #fff;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        canvas { display: block; background-color: #000; }
        #gameUI {
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          display: flex;
          justify-content: space-between;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          pointer-events: none;
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.7);
          z-index: 10;
        }
        #score { text-align: left; }
        #lives { text-align: right; font-size: 2rem; letter-spacing: 0.2em; }
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
        #gameOver h1 { margin: 0 0 1rem 0; font-size: 3rem; color: #ff4d4d; }
        #gameOver p { margin: 0.5rem 0; font-size: 1.5rem; }
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
        #restartButton:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 198, 255, 0.6); }
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
        #controls .cluster { display: flex; gap: 12px; pointer-events: auto; }
        .ctl {
          width: 64px;
          height: 64px;
          background: rgba(255,255,255,0.08);
          border: 2px solid rgba(255,255,255,0.25);
          color: #fff;
          font-size: 1.4rem;
          border-radius: 14px;
          backdrop-filter: blur(6px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.5);
          touch-action: none;
        }
        .ctl:active { transform: scale(0.98); }
        .thrust { width: 84px; }
        .shoot { width: 90px; height: 90px; font-size: 1.8rem; border-radius: 50%; }

        @media (pointer: coarse) {
          #controls { display: flex; }
          #instructions { display: none; }
          body { touch-action: none; }
        }
      `}</style>
    </>
  );
}

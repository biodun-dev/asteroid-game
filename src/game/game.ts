import { config } from './config';
import type {
  Asteroid,
  AsteroidSize,
  Bullet,
  GamePublicState,
  InputState,
  Particle,
  Player,
  Vector2,
} from './types';

interface GameState {
  player: Player;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  input: InputState;
  score: number;
  lives: number;
  wave: number;
  multiplier: number;
  isGameOver: boolean;
  awaitingNextWave: boolean;
  spawnTimer: number;
  hudDirty: boolean;
  width: number;
  height: number;
}

const frameNorm = config.timestepMs / 1000;

export function createGame(ctx: CanvasRenderingContext2D) {
  const canvas = ctx.canvas;
  const state: GameState = {
    player: createPlayer(canvas.width / 2, canvas.height / 2),
    bullets: createBulletPool(),
    asteroids: [],
    particles: createParticlePool(),
    input: { left: false, right: false, thrust: false, shoot: false },
    score: 0,
    lives: config.player.lives,
    wave: 1,
    multiplier: config.difficulty.multiplierBase,
    isGameOver: false,
    awaitingNextWave: false,
    spawnTimer: 0,
    hudDirty: true,
    width: canvas.width,
    height: canvas.height,
  };

  function reset() {
    state.score = 0;
    state.lives = config.player.lives;
    state.wave = 1;
    state.multiplier = config.difficulty.multiplierBase;
    state.isGameOver = false;
    state.awaitingNextWave = false;
    state.spawnTimer = 0;
    resetPlayer(state.player, state.width / 2, state.height / 2, true);
    for (const bullet of state.bullets) {
      bullet.active = false;
    }
    state.asteroids.length = 0;
    for (const particle of state.particles) {
      particle.active = false;
    }
    spawnWave();
    state.hudDirty = true;
  }

  function setSize(width: number, height: number) {
    state.width = width;
    state.height = height;
    ctx.canvas.width = width;
    ctx.canvas.height = height;
  }

  function update(dt: number) {
    if (state.isGameOver) {
      return;
    }
    const frameFactor = dt / frameNorm;
    handlePlayerInput(state, frameFactor, dt);
    updatePlayer(state, frameFactor);
    updateBullets(state, frameFactor);
    updateAsteroids(state, frameFactor);
    updateParticles(state, frameFactor);
    handleCollisions(state);
    handleWaveProgress(state, dt);
  }

  function render(_: number) {
    drawBackground(ctx, state.width, state.height);
    drawParticles(ctx, state.particles);
    drawPlayer(ctx, state.player, state.input.thrust && !state.isGameOver, state.isGameOver);
    drawBullets(ctx, state.bullets);
    drawAsteroids(ctx, state.asteroids);
  }

  function consumeHudState(): GamePublicState | null {
    if (!state.hudDirty) {
      return null;
    }
    state.hudDirty = false;
    return {
      score: state.score,
      lives: state.lives,
      wave: state.wave,
      multiplier: state.multiplier,
      isGameOver: state.isGameOver,
    };
  }

  function spawnWave() {
    const largeCount = Math.min(
      config.waves.maxLarge,
      Math.round(config.waves.initialLarge * Math.pow(config.waves.growthRate, state.wave - 1))
    );
    const speedRamp = 1 + (state.wave - 1) * config.difficulty.asteroidSpeedRamp;
    for (let i = 0; i < largeCount; i++) {
      const asteroid = createAsteroid(state, config.asteroids.sizes.large.size, speedRamp);
      state.asteroids.push(asteroid);
    }
    state.hudDirty = true;
  }

  function handleWaveProgress(localState: GameState, dt: number) {
    if (localState.isGameOver) return;
    const hasAsteroids = localState.asteroids.some((a) => a.active);
    if (!hasAsteroids && !localState.awaitingNextWave) {
      localState.awaitingNextWave = true;
      localState.spawnTimer = config.waves.spawnDelayMs;
    }

    if (localState.awaitingNextWave) {
      localState.spawnTimer -= dt * 1000;
      if (localState.spawnTimer <= 0) {
        localState.wave += 1;
        localState.multiplier =
          config.difficulty.multiplierBase +
          (localState.wave - 1) * config.difficulty.multiplierPerWave;
        localState.awaitingNextWave = false;
        spawnWave();
        localState.hudDirty = true;
      }
    }
  }

  function damagePlayer(localState: GameState) {
    if (localState.player.invincibleTimer > 0) {
      return;
    }
    localState.lives -= 1;
    if (localState.lives < 0) {
      localState.lives = 0;
    }
    localState.hudDirty = true;
    spawnPlayerHit(localState, localState.player.position);
    if (localState.lives <= 0) {
      localState.isGameOver = true;
      return;
    }
    resetPlayer(localState.player, localState.width / 2, localState.height / 2, true);
  }

  function handleCollisions(localState: GameState) {
    const { player } = localState;
    if (player.invincibleTimer <= 0) {
      for (const asteroid of localState.asteroids) {
        if (!asteroid.active) continue;
        if (circleIntersect(player.position, player.radius, asteroid.position, asteroid.radius)) {
          asteroid.active = false;
          spawnExplosion(localState, asteroid.position, asteroid.radius);
          damagePlayer(localState);
          break;
        }
      }
    }

    for (const bullet of localState.bullets) {
      if (!bullet.active) continue;
      for (const asteroid of localState.asteroids) {
        if (!asteroid.active) continue;
        if (circleIntersect(bullet.position, bullet.radius, asteroid.position, asteroid.radius)) {
          bullet.active = false;
          destroyAsteroid(localState, asteroid);
          break;
        }
      }
    }
  }

  function destroyAsteroid(localState: GameState, asteroid: Asteroid) {
    asteroid.active = false;
    localState.score += Math.round(asteroid.score * localState.multiplier);
    spawnExplosion(localState, asteroid.position, asteroid.radius);
    localState.hudDirty = true;
    if (asteroid.size > 1) {
      const childSize = (asteroid.size - 1) as AsteroidSize;
      for (let i = 0; i < config.asteroids.splitCount; i++) {
        const child = createAsteroid(localState, childSize, 1 + (localState.wave - 1) * 0.05, asteroid.position);
        child.velocity.x += (Math.random() - 0.5) * 0.8;
        child.velocity.y += (Math.random() - 0.5) * 0.8;
        localState.asteroids.push(child);
      }
    }
  }

  reset();

  return {
    update,
    render,
    reset,
    setSize,
    consumeHudState,
    get input() {
      return state.input;
    },
    get isGameOver() {
      return state.isGameOver;
    },
  };
}

function createPlayer(x: number, y: number): Player {
  return {
    position: { x, y },
    velocity: { x: 0, y: 0 },
    angle: 0,
    radius: config.player.radius,
    cooldown: 0,
    invincibleTimer: config.player.invincibilityMs,
  };
}

function resetPlayer(player: Player, x: number, y: number, resetAngle: boolean) {
  player.position.x = x;
  player.position.y = y;
  player.velocity.x = 0;
  player.velocity.y = 0;
  if (resetAngle) {
    player.angle = 0;
  }
  player.cooldown = 0;
  player.invincibleTimer = config.player.invincibilityMs;
}

function createBulletPool(): Bullet[] {
  return new Array(config.bullets.poolSize).fill(null).map(() => ({
    active: false,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    radius: config.bullets.radius,
    life: 0,
  }));
}

function createParticlePool(): Particle[] {
  return new Array(config.particles.poolSize).fill(null).map(() => ({
    active: false,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    radius: 1,
    life: 0,
    color: config.particles.colors.explosion,
    maxLife: config.particles.lifetimeFrames,
  }));
}

function handlePlayerInput(state: GameState, frameFactor: number, dt: number) {
  const { input, player } = state;
  const rotationSpeed = config.player.rotationSpeed * frameFactor;
  if (input.left && !input.right) {
    player.angle -= rotationSpeed;
  } else if (input.right && !input.left) {
    player.angle += rotationSpeed;
  }

  if (input.thrust) {
    const thrustFactor = config.player.thrust * frameFactor;
    player.velocity.x += Math.sin(player.angle) * thrustFactor;
    player.velocity.y -= Math.cos(player.angle) * thrustFactor;
    spawnThrustParticles(state, player.position, player.angle);
  }

  player.cooldown -= dt * 1000;
  if (input.shoot && player.cooldown <= 0) {
    if (emitBullet(state, player)) {
      player.cooldown = config.player.shootCooldownMs;
    }
  }
}

function emitBullet(state: GameState, player: Player) {
  const bullet = state.bullets.find((b) => !b.active);
  if (!bullet) return false;
  bullet.active = true;
  bullet.position.x = player.position.x + Math.sin(player.angle) * player.radius;
  bullet.position.y = player.position.y - Math.cos(player.angle) * player.radius;
  bullet.velocity.x = Math.sin(player.angle) * config.bullets.speed;
  bullet.velocity.y = -Math.cos(player.angle) * config.bullets.speed;
  bullet.life = config.bullets.lifetimeFrames;
  return true;
}

function updatePlayer(state: GameState, frameFactor: number) {
  const { player, width, height } = state;
  const frictionPower = Math.pow(config.player.friction, frameFactor);
  player.velocity.x *= frictionPower;
  player.velocity.y *= frictionPower;
  player.position.x += player.velocity.x * frameFactor;
  player.position.y += player.velocity.y * frameFactor;
  wrapEntity(player.position, width, height, player.radius);
  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= frameFactor * frameNorm * 1000;
    if (player.invincibleTimer < 0) player.invincibleTimer = 0;
  }
}

function updateBullets(state: GameState, frameFactor: number) {
  const { bullets, width, height } = state;
  for (const bullet of bullets) {
    if (!bullet.active) continue;
    bullet.position.x += bullet.velocity.x * frameFactor;
    bullet.position.y += bullet.velocity.y * frameFactor;
    bullet.life -= frameFactor;
    if (bullet.life <= 0) {
      bullet.active = false;
      continue;
    }
    if (
      bullet.position.x < -bullet.radius ||
      bullet.position.x > width + bullet.radius ||
      bullet.position.y < -bullet.radius ||
      bullet.position.y > height + bullet.radius
    ) {
      bullet.active = false;
    }
  }
}

function updateAsteroids(state: GameState, frameFactor: number) {
  let needsTrim = false;
  for (const asteroid of state.asteroids) {
    if (!asteroid.active) {
      needsTrim = true;
      continue;
    }
    asteroid.position.x += asteroid.velocity.x * frameFactor;
    asteroid.position.y += asteroid.velocity.y * frameFactor;
    asteroid.angle += asteroid.rotation * frameFactor;
    wrapEntity(asteroid.position, state.width, state.height, asteroid.radius);
  }
  if (needsTrim) {
    state.asteroids = state.asteroids.filter((a) => a.active);
  }
}

function updateParticles(state: GameState, frameFactor: number) {
  for (const particle of state.particles) {
    if (!particle.active) continue;
    particle.position.x += particle.velocity.x * frameFactor;
    particle.position.y += particle.velocity.y * frameFactor;
    particle.life -= frameFactor;
    if (particle.life <= 0) {
      particle.active = false;
    }
  }
}

function spawnExplosion(state: GameState, origin: Vector2, radius: number) {
  const count = Math.min(20, 6 + Math.floor(radius / 4));
  for (let i = 0; i < count; i++) {
    const particle = state.particles.find((p) => !p.active);
    if (!particle) break;
    particle.active = true;
    particle.position.x = origin.x;
    particle.position.y = origin.y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.4 + 0.6;
    particle.velocity.x = Math.cos(angle) * speed;
    particle.velocity.y = Math.sin(angle) * speed;
    particle.radius = Math.random() * 2 + 1;
    particle.life = particle.maxLife;
    particle.color = config.particles.colors.explosion;
  }
}

function spawnPlayerHit(state: GameState, origin: Vector2) {
  for (let i = 0; i < 12; i++) {
    const particle = state.particles.find((p) => !p.active);
    if (!particle) break;
    particle.active = true;
    particle.position.x = origin.x;
    particle.position.y = origin.y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 0.5;
    particle.velocity.x = Math.cos(angle) * speed;
    particle.velocity.y = Math.sin(angle) * speed;
    particle.radius = Math.random() * 2 + 1;
    particle.life = particle.maxLife;
    particle.color = config.particles.colors.player;
  }
}

function spawnThrustParticles(state: GameState, origin: Vector2, angle: number) {
  const particle = state.particles.find((p) => !p.active);
  if (!particle) return;
  particle.active = true;
  particle.position.x = origin.x - Math.sin(angle) * 12;
  particle.position.y = origin.y + Math.cos(angle) * 12;
  const spread = (Math.random() - 0.5) * 0.6;
  const speed = Math.random() * 1.2 + 0.6;
  particle.velocity.x = -Math.sin(angle + spread) * speed;
  particle.velocity.y = Math.cos(angle + spread) * speed;
  particle.radius = Math.random() * 1.5 + 1;
  particle.life = config.particles.lifetimeFrames * 0.6;
  particle.color = config.particles.colors.thrust[Math.round(Math.random())];
}

function createAsteroid(
  state: GameState,
  size: AsteroidSize,
  speedRamp: number,
  position?: Vector2
): Asteroid {
  const sizeConfig = getSizeConfig(size);
  const asteroid: Asteroid = {
    active: true,
    position: { x: position?.x ?? 0, y: position?.y ?? 0 },
    velocity: { x: 0, y: 0 },
    radius: sizeConfig.radius,
    angle: Math.random() * Math.PI * 2,
    rotation: (Math.random() - 0.5) * config.asteroids.rotationSpeedRange,
    size,
    score: sizeConfig.score,
  };

  if (!position) {
    const spawn = randomSpawnPosition(state, sizeConfig.radius);
    asteroid.position.x = spawn.x;
    asteroid.position.y = spawn.y;
  }
  const angle = Math.random() * Math.PI * 2;
  const speed = randomRange(sizeConfig.minSpeed, sizeConfig.maxSpeed) * speedRamp;
  asteroid.velocity.x = Math.cos(angle) * speed;
  asteroid.velocity.y = Math.sin(angle) * speed;
  return asteroid;
}

function randomSpawnPosition(state: GameState, radius: number): Vector2 {
  const { width, height, player } = state;
  const minDistance = radius + config.asteroids.spawnDistance + player.radius;
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const dx = x - player.position.x;
    const dy = y - player.position.y;
    if (Math.hypot(dx, dy) > minDistance) {
      return { x, y };
    }
  }
  return { x: Math.random() * width, y: Math.random() * height };
}

function getSizeConfig(size: AsteroidSize) {
  if (size === 3) return config.asteroids.sizes.large;
  if (size === 2) return config.asteroids.sizes.medium;
  return config.asteroids.sizes.small;
}

function wrapEntity(position: Vector2, width: number, height: number, radius: number) {
  if (position.x < -radius) position.x = width + radius;
  else if (position.x > width + radius) position.x = -radius;
  if (position.y < -radius) position.y = height + radius;
  else if (position.y > height + radius) position.y = -radius;
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = config.world.background;
  ctx.fillRect(0, 0, width, height);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  thrusting: boolean,
  isGameOver: boolean
) {
  ctx.save();
  ctx.translate(player.position.x, player.position.y);
  ctx.rotate(player.angle);
  ctx.beginPath();
  ctx.moveTo(0, -player.radius);
  ctx.lineTo(player.radius * 0.7, player.radius * 0.7);
  ctx.lineTo(-player.radius * 0.7, player.radius * 0.7);
  ctx.closePath();
  if (player.invincibleTimer > 0) {
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
  if (thrusting && !isGameOver) {
    ctx.beginPath();
    ctx.moveTo(0, player.radius * 0.8);
    const flameLength = player.radius * (1.6 + Math.random() * 0.3);
    ctx.lineTo(player.radius * 0.4, flameLength);
    ctx.lineTo(-player.radius * 0.4, flameLength);
    ctx.closePath();
    ctx.fillStyle = Math.random() < 0.5 ? '#f97316' : '#fb923c';
    ctx.fill();
  }
  ctx.restore();
}

function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]) {
  ctx.fillStyle = '#facc15';
  for (const bullet of bullets) {
    if (!bullet.active) continue;
    ctx.beginPath();
    ctx.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAsteroids(ctx: CanvasRenderingContext2D, asteroids: Asteroid[]) {
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  for (const asteroid of asteroids) {
    if (!asteroid.active) continue;
    ctx.save();
    ctx.translate(asteroid.position.x, asteroid.position.y);
    ctx.rotate(asteroid.angle);
    ctx.beginPath();
    const points = 10 + Math.floor(Math.random() * 4);
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2;
      const r = asteroid.radius * (0.7 + Math.random() * 0.3);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const particle of particles) {
    if (!particle.active) continue;
    ctx.save();
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.position.x, particle.position.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function circleIntersect(aPos: Vector2, aRadius: number, bPos: Vector2, bRadius: number) {
  const dx = aPos.x - bPos.x;
  const dy = aPos.y - bPos.y;
  const distance = Math.hypot(dx, dy);
  return distance < aRadius + bRadius;
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

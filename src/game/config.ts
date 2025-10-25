export const config = {
  timestepMs: 1000 / 60,
  world: {
    background: '#000000',
    wrapPadding: 0,
  },
  player: {
    radius: 18,
    thrust: 0.1,
    friction: 0.99,
    rotationSpeed: 0.05,
    shootCooldownMs: 180,
    invincibilityMs: 2000,
    respawnDelayMs: 500,
    lives: 3,
  },
  bullets: {
    speed: 8,
    radius: 3,
    lifetimeFrames: 90,
    poolSize: 30,
  },
  asteroids: {
    spawnDistance: 140,
    splitCount: 2,
    sizes: {
      large: {
        size: 3 as const,
        radius: 45,
        minSpeed: 0.6,
        maxSpeed: 1.4,
        score: 20,
      },
      medium: {
        size: 2 as const,
        radius: 28,
        minSpeed: 1.0,
        maxSpeed: 2.1,
        score: 50,
      },
      small: {
        size: 1 as const,
        radius: 16,
        minSpeed: 1.6,
        maxSpeed: 2.8,
        score: 100,
      },
    },
    rotationSpeedRange: 0.02,
  },
  particles: {
    poolSize: 120,
    lifetimeFrames: 50,
    colors: {
      explosion: 'white',
      player: 'cyan',
      thrust: ['#fbbf24', '#f97316'] as const,
    },
  },
  waves: {
    initialLarge: 4,
    growthRate: 1.3,
    spawnDelayMs: 2000,
    maxLarge: 9,
  },
  difficulty: {
    asteroidSpeedRamp: 0.12,
    multiplierBase: 1,
    multiplierPerWave: 0.15,
  },
};

export type Config = typeof config;

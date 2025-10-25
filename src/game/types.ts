import type { RefObject } from 'react';

export type AsteroidSize = 1 | 2 | 3;

export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  position: Vector2;
  velocity: Vector2;
  angle: number;
  radius: number;
  cooldown: number;
  invincibleTimer: number;
}

export interface Bullet {
  active: boolean;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  life: number;
}

export interface Asteroid {
  active: boolean;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  angle: number;
  rotation: number;
  size: AsteroidSize;
  score: number;
}

export interface Particle {
  active: boolean;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  life: number;
  color: string;
  maxLife: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  thrust: boolean;
  shoot: boolean;
}

export interface HUDRefs {
  score: RefObject<HTMLDivElement | null>;
  lives: RefObject<HTMLDivElement | null>;
  wave: RefObject<HTMLDivElement | null>;
  multiplier: RefObject<HTMLDivElement | null>;
  gameOver: RefObject<HTMLDivElement | null>;
  finalScore: RefObject<HTMLSpanElement | null>;
  instructions: RefObject<HTMLDivElement | null>;
  restart: RefObject<HTMLButtonElement | null>;
}

export interface HUDSnapshot {
  score: number;
  lives: number;
  wave: number;
  multiplier: number;
  isGameOver: boolean;
}

export interface GamePublicState extends HUDSnapshot {}

import { CONFIG } from './config.js';
import { normalize } from './physicsLite.js';

export function createProjectile(targetX, targetY) {
  const direction = normalize(targetX - CONFIG.SHOOTER.X, targetY - CONFIG.SHOOTER.Y);
  if (!direction) {
    return null;
  }

  return {
    x: CONFIG.SHOOTER.X,
    y: CONFIG.SHOOTER.Y,
    vx: direction.x * CONFIG.PROJECTILE.SPEED,
    vy: direction.y * CONFIG.PROJECTILE.SPEED,
    radius: CONFIG.PROJECTILE.RADIUS,
    age: 0,
    alive: true
  };
}
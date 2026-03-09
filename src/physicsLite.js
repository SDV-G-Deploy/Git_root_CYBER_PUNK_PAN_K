import { CONFIG } from './config.js';

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length <= CONFIG.EPSILON) {
    return null;
  }

  return {
    x: x / length,
    y: y / length
  };
}

export function findHitNodeAt(nodes, x, y, projectileRadius) {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.resolved) {
      continue;
    }

    const hitRadius = node.radius + projectileRadius;
    if (distance(x, y, node.x, node.y) <= hitRadius) {
      return node;
    }
  }

  return null;
}

export function findHitNodeSwept(nodes, fromX, fromY, toX, toY, projectileRadius) {
  const segmentX = toX - fromX;
  const segmentY = toY - fromY;
  const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;

  let bestNode = null;
  let bestT = Number.POSITIVE_INFINITY;

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.resolved) {
      continue;
    }

    const hitRadius = node.radius + projectileRadius;
    let t = 0;

    if (segmentLengthSq > CONFIG.EPSILON) {
      const dot = (node.x - fromX) * segmentX + (node.y - fromY) * segmentY;
      t = clamp(dot / segmentLengthSq, 0, 1);
    }

    const closestX = fromX + segmentX * t;
    const closestY = fromY + segmentY * t;

    if (distance(closestX, closestY, node.x, node.y) <= hitRadius && t < bestT) {
      bestT = t;
      bestNode = node;
    }
  }

  return bestNode;
}

export function integrateProjectile(projectile, dt) {
  const previousX = projectile.x;
  const previousY = projectile.y;

  projectile.age += dt;

  const drag = Math.max(0, 1 - CONFIG.PROJECTILE.DRAG_PER_SECOND * dt);
  projectile.vx *= drag;
  projectile.vy *= drag;

  projectile.x += projectile.vx * dt;
  projectile.y += projectile.vy * dt;

  const speed = Math.hypot(projectile.vx, projectile.vy);

  const outOfBounds =
    projectile.x < 0 ||
    projectile.x > CONFIG.ARENA.WIDTH ||
    projectile.y < 0 ||
    projectile.y > CONFIG.ARENA.HEIGHT;

  const lifetimeExpired = projectile.age >= CONFIG.PROJECTILE.MAX_LIFETIME;
  const speedDropped = speed <= CONFIG.PROJECTILE.MIN_SPEED;

  return {
    previousX,
    previousY,
    outOfBounds,
    lifetimeExpired,
    speedDropped
  };
}

export function predictTrajectory(state, targetX, targetY) {
  const direction = normalize(targetX - CONFIG.SHOOTER.X, targetY - CONFIG.SHOOTER.Y);
  if (!direction) {
    return [];
  }

  const points = [{ x: CONFIG.SHOOTER.X, y: CONFIG.SHOOTER.Y }];

  let x = CONFIG.SHOOTER.X;
  let y = CONFIG.SHOOTER.Y;
  let vx = direction.x * CONFIG.PROJECTILE.SPEED;
  let vy = direction.y * CONFIG.PROJECTILE.SPEED;

  for (let i = 0; i < CONFIG.TRAJECTORY.STEPS; i += 1) {
    const drag = Math.max(0, 1 - CONFIG.PROJECTILE.DRAG_PER_SECOND * CONFIG.TRAJECTORY.STEP_TIME);
    vx *= drag;
    vy *= drag;

    x += vx * CONFIG.TRAJECTORY.STEP_TIME;
    y += vy * CONFIG.TRAJECTORY.STEP_TIME;

    if (x < 0 || x > CONFIG.ARENA.WIDTH || y < 0 || y > CONFIG.ARENA.HEIGHT) {
      break;
    }

    points.push({ x, y });

    const hitNode = findHitNodeAt(state.nodes, x, y, CONFIG.PROJECTILE.RADIUS);
    if (hitNode) {
      return points;
    }
  }

  return points;
}
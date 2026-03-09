import { CONFIG } from './config.js';
import { clamp, predictTrajectory } from './physicsLite.js';

function drawArena(ctx) {
  ctx.fillStyle = CONFIG.ARENA.BACKGROUND;
  ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);

  ctx.lineWidth = 2;
  ctx.strokeStyle = CONFIG.ARENA.BORDER;
  ctx.strokeRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);
}

function drawShooter(ctx) {
  ctx.beginPath();
  ctx.arc(CONFIG.SHOOTER.X, CONFIG.SHOOTER.Y, CONFIG.SHOOTER.RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.SHOOTER.COLOR;
  ctx.fill();
}

function drawNodes(ctx, state) {
  ctx.font = CONFIG.LABEL.FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    const typeConfig = CONFIG.NODES.TYPES[node.type];

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = node.resolved ? CONFIG.NODES.RESOLVED_COLOR : typeConfig.color;
    ctx.fill();

    ctx.fillStyle = CONFIG.LABEL.COLOR;
    ctx.fillText(typeConfig.label, node.x, node.y);
  }
}

function drawProjectile(ctx, state) {
  if (!state.projectile || !state.projectile.alive) {
    return;
  }

  ctx.beginPath();
  ctx.arc(state.projectile.x, state.projectile.y, state.projectile.radius, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.PROJECTILE.COLOR;
  ctx.fill();
}

function drawAimPreview(ctx, state) {
  if (state.phase !== 'aim' || !state.aim.active || state.shotsRemaining <= 0) {
    return;
  }

  const points = predictTrajectory(state, state.aim.x, state.aim.y);
  if (points.length < 2) {
    return;
  }

  ctx.save();

  ctx.strokeStyle = CONFIG.VISUAL.TRAJECTORY_UNDERLAY_COLOR;
  ctx.lineWidth = CONFIG.VISUAL.TRAJECTORY_UNDERLAY_WIDTH;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.strokeStyle = CONFIG.TRAJECTORY.COLOR;
  ctx.lineWidth = CONFIG.TRAJECTORY.WIDTH;
  ctx.setLineDash(CONFIG.TRAJECTORY.DASH_PATTERN);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.fillStyle = CONFIG.TRAJECTORY.COLOR;
  for (let i = 0; i < points.length; i += CONFIG.VISUAL.TRAJECTORY_DOT_STEP) {
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, CONFIG.VISUAL.TRAJECTORY_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  const endPoint = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(endPoint.x, endPoint.y, CONFIG.VISUAL.AIM_END_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = CONFIG.VISUAL.AIM_END_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.stroke();

  ctx.restore();
}

function drawChainLinks(ctx, state) {
  if (state.visualLinks.length === 0) {
    return;
  }

  ctx.save();
  ctx.lineWidth = CONFIG.VISUAL.CHAIN_LINK_WIDTH;

  for (let i = 0; i < state.visualLinks.length; i += 1) {
    const link = state.visualLinks[i];
    const alpha = clamp(link.ttl / CONFIG.VISUAL.CHAIN_LINK_TTL, 0, 1);
    ctx.strokeStyle = `rgba(255, 224, 130, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(link.x1, link.y1);
    ctx.lineTo(link.x2, link.y2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawParticles(ctx, state) {
  if (state.particles.length === 0) {
    return;
  }

  ctx.save();
  for (let i = 0; i < state.particles.length; i += 1) {
    const particle = state.particles[i];
    const alpha = clamp(particle.ttl / CONFIG.VISUAL.PARTICLE_TTL, 0, 1);
    ctx.fillStyle = `rgba(255, 226, 150, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, CONFIG.VISUAL.PARTICLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawChainCues(ctx, state) {
  if (state.chainCues.length === 0) {
    return;
  }

  ctx.save();
  ctx.font = CONFIG.VISUAL.CHAIN_CUE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < state.chainCues.length; i += 1) {
    const cue = state.chainCues[i];
    const alpha = clamp(cue.ttl / CONFIG.VISUAL.CHAIN_CUE_TTL, 0, 1);
    ctx.fillStyle = `rgba(255, 244, 188, ${alpha.toFixed(3)})`;
    ctx.fillText(`#${cue.step}`, cue.x, cue.y);
  }

  ctx.restore();
}

function drawHitFlash(ctx, state) {
  if (state.hitFlashTtl <= 0) {
    return;
  }

  const alphaBase = clamp(state.hitFlashTtl / CONFIG.VISUAL.HIT_FLASH_TTL, 0, 1);
  const alpha = alphaBase * CONFIG.VISUAL.HIT_FLASH_MAX_ALPHA;
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
  ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);
  ctx.restore();
}

function drawEndHint(ctx, state) {
  if (state.phase !== 'end') {
    return;
  }

  ctx.font = CONFIG.RUN.LABEL_FONT;
  ctx.fillStyle = state.result === 'win' ? CONFIG.RUN.WIN_COLOR : CONFIG.RUN.LOSE_COLOR;
  ctx.fillText(
    state.result === 'win' ? CONFIG.RUN.WIN_TEXT : CONFIG.RUN.LOSE_TEXT,
    CONFIG.RUN.LABEL_X,
    CONFIG.RUN.LABEL_Y
  );
}

export function renderState(ctx, state) {
  if (!state || !ctx) {
    return;
  }

  const shakeIntensity = clamp(state.screenShakeTtl / CONFIG.VISUAL.SCREEN_SHAKE_TTL, 0, 1);
  const shakePower = CONFIG.VISUAL.SCREEN_SHAKE_POWER * shakeIntensity;
  const offsetX = (Math.random() * 2 - 1) * shakePower;
  const offsetY = (Math.random() * 2 - 1) * shakePower;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  drawArena(ctx);
  drawAimPreview(ctx, state);
  drawChainLinks(ctx, state);
  drawParticles(ctx, state);
  drawShooter(ctx);
  drawNodes(ctx, state);
  drawProjectile(ctx, state);
  drawChainCues(ctx, state);
  ctx.restore();

  drawHitFlash(ctx, state);
  drawEndHint(ctx, state);
}
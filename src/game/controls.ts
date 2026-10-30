// Frame-rate-independent arcade controls shared by vendor and police.
// Pure simulation step: safe to test without a browser or Three.js renderer.
export interface MovementState {
  x: number;
  z: number;
  heading: number;
  speed: number;
}
export interface MovementObstacle { x: number; z: number; hw: number; hd: number; }
export type MovementRole = 'vendor' | 'police';

export function frameBlend(rate: number, dt: number): number {
  return 1 - Math.exp(-Math.max(0, rate) * Math.max(0, dt));
}

export function advanceMovement(
  previous: MovementState,
  input: ReadonlySet<string>,
  role: MovementRole,
  obstacles: readonly MovementObstacle[],
  elapsed: number
): MovementState {
  const dt = Math.max(0, Math.min(0.05, elapsed));
  if (dt === 0) return { ...previous };
  const forward = input.has('w') || input.has('arrowup');
  const backward = input.has('s') || input.has('arrowdown');
  const left = input.has('a') || input.has('arrowleft');
  const right = input.has('d') || input.has('arrowright');
  const running = input.has('shift') || input.has(' ');
  const baseSpeed = role === 'vendor' ? 6.3 : 7.2;
  const maxSpeed = running ? baseSpeed * 1.42 : baseSpeed;
  const targetSpeed = forward === backward ? 0 : forward ? maxSpeed : -baseSpeed * 0.46;
  const accel = targetSpeed === 0 ? 15 : (Math.sign(targetSpeed) === Math.sign(previous.speed) ? 11.5 : 18);
  const deltaSpeed = Math.max(-accel * dt, Math.min(accel * dt, targetSpeed - previous.speed));
  let speed = previous.speed + deltaSpeed;
  if (Math.abs(speed) < 0.015 && targetSpeed === 0) speed = 0;

  // A turns LEFT (decreasing yaw), D turns RIGHT (increasing yaw).
  // Steering is responsive even at low speeds, with controlled higher-speed turning.
  const steerInput = Number(right) - Number(left);
  const steering = (role === 'vendor' ? 1.78 : 2.12) * (0.48 + 0.52 * Math.min(1, Math.abs(speed) / baseSpeed));
  const reverse = speed < -0.08 ? -1 : 1;
  const heading = previous.heading + steerInput * steering * dt * reverse;
  const dx = Math.sin(heading) * speed * dt;
  const dz = -Math.cos(heading) * speed * dt;
  const margin = role === 'vendor' ? 0.8 : 0.44;
  const free = (x: number, z: number) =>
    Math.abs(x) < 110.5 && Math.abs(z) < 110.5 &&
    obstacles.every(o => Math.abs(x - o.x) >= o.hw + margin || Math.abs(z - o.z) >= o.hd + margin);

  // Slide independently along walls rather than sticking on contact.
  let x = previous.x;
  let z = previous.z;
  const nextX = previous.x + dx;
  const nextZ = previous.z + dz;
  if (free(nextX, nextZ)) {
    x = nextX;
    z = nextZ;
  } else {
    if (free(nextX, z)) x = nextX;
    if (free(x, nextZ)) z = nextZ;
    if (x === previous.x && z === previous.z) speed *= 0.4;
  }
  return { x, z, heading, speed };
}

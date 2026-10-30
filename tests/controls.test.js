import { expect, test } from 'bun:test';
import { advanceMovement, frameBlend } from '../src/game/controls.ts';

const start = { x: 0, z: 0, heading: 0, speed: 0 };
const noWalls = [];
const run = (keys, frames = 60, role = 'vendor', obstacles = noWalls) => {
  let state = { ...start };
  for (let i = 0; i < frames; i++) state = advanceMovement(state, new Set(keys), role, obstacles, 1 / 60);
  return state;
};

test('W accelerates smoothly forward and no-key movement decelerates', () => {
  const p = run(['w'], 60);
  expect(p.speed).toBeGreaterThan(5.0);
  expect(p.z).toBeLessThan(-2);
  const stopped = advanceMovement(p, new Set(), 'vendor', noWalls, 0.05);
  expect(stopped.speed).toBeLessThan(p.speed);
});

test('A steers left; D steers right, unlike old reversed controls', () => {
  const left = run(['w', 'a']);
  const right = run(['w', 'd']);
  expect(left.heading).toBeLessThan(0);
  expect(right.heading).toBeGreaterThan(0);
  expect(left.x).toBeLessThan(0);
  expect(right.x).toBeGreaterThan(0);
});

test('S reverses gradually, never teleports or instantly switches speed', () => {
  const backward = run(['s']);
  expect(backward.speed).toBeLessThan(0);
  expect(backward.z).toBeGreaterThan(0);
  const switched = advanceMovement(backward, new Set(['w']), 'vendor', noWalls, 0.016);
  expect(switched.speed - backward.speed).toBeLessThan(0.5);
});

test('walls block penetration and allow sliding', () => {
  const wall = [{ x: 0, z: -5, hw: 1.4, hd: 1.2 }];
  const result = run(['w'], 150, 'vendor', wall);
  expect(result.z).toBeGreaterThan(-3);
  expect(result.z).toBeLessThan(-2);
  expect(result.speed).toBeGreaterThanOrEqual(0);
});

test('movement stays reasonably consistent across 30 and 60 FPS', () => {
  let fast = { ...start }, slow = { ...start };
  for (let i = 0; i < 120; i++) fast = advanceMovement(fast, new Set(['w', 'd']), 'vendor', noWalls, 1 / 60);
  for (let i = 0; i < 60; i++) slow = advanceMovement(slow, new Set(['w', 'd']), 'vendor', noWalls, 1 / 30);
  expect(Math.abs(fast.x - slow.x)).toBeLessThan(0.55);
  expect(Math.abs(fast.z - slow.z)).toBeLessThan(0.55);
});

test('frame smoothing is time based and bounded', () => {
  expect(frameBlend(12, 0)).toBe(0);
  expect(frameBlend(12, 0.016)).toBeGreaterThan(0);
  expect(frameBlend(12, 0.016)).toBeLessThan(1);
});

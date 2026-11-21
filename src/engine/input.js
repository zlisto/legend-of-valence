// Keyboard + mouse + gamepad, mapped to game actions. Read once per frame with input.poll().
//
// Keyboard/mouse: WASD move · mouse look (click the game to capture the mouse) · Left click attack (hold to charge)
// Right click / Tab lock-on · Space roll (sidestep/backhop when locked) · Shift block · E interact
// R switch hybrid stance · Q hookshot · G Newman Lantern · 1–4 items · Esc release mouse / pause.
// Gamepad: left stick move · right stick camera · X attack · A roll/interact · LT lock-on · RB block · Y stance.

const keys = new Set()
const pressed = new Set() // edge-triggered this frame
let mouseDX = 0
let mouseDY = 0
let lmb = false
let rmb = false
let lmbPressed = false
let lmbReleased = false
let rmbPressed = false
let enabled = true
let cursorX = 0.5 // where the free (uncaptured) cursor sits across the window, 0..1
let overGame = false
const gpPrev = {}
// touch: an on-screen stick, a drag-to-look area and buttons (see ui/TouchControls.jsx)
const touch = { mx: 0, my: 0, dx: 0, dy: 0, rev: false }
export const isTouch = typeof window !== 'undefined' && (/[?&]touch(&|=|$)/.test(window.location.search) || (!!window.matchMedia?.('(pointer: coarse)').matches && !/[?&]desktop(&|=|$)/.test(window.location.search)))
export function touchStick(x, y) { touch.mx = x; touch.my = y }
export function touchLook(dx, dy) { touch.dx += dx; touch.dy += dy }
/** A touch button acts like its key: the same events reach every listener (dialogue, pause, map). */
export function touchKey(code, isDown) {
  window.dispatchEvent(new KeyboardEvent(isDown ? 'keydown' : 'keyup', { code, key: code, bubbles: true }))
}
export function touchLanternRev(v) { touch.rev = v }
/** Let go of everything the touch controls hold (a button vanished, or the overlay hid mid-press). */
export function touchReleaseAll() {
  for (const c of ['KeyE', 'KeyG', 'KeyQ', 'KeyR', 'Tab', 'Space', 'ShiftLeft']) keys.delete(c)
  if (lmb) { lmb = false; lmbReleased = true }
  touch.mx = touch.my = 0; touch.rev = false
}
export function touchAttack(isDown) {
  if (isDown) { lmb = true; lmbPressed = true } else if (lmb) { lmb = false; lmbReleased = true }
}

function down(code) {
  if (!keys.has(code)) pressed.add(code)
  keys.add(code)
}

export function initInput(target) {
  const kd = (e) => {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault()
    down(e.code)
  }
  const ku = (e) => keys.delete(e.code)
  const mm = (e) => {
    if (document.pointerLockElement) { mouseDX += e.movementX; mouseDY += e.movementY; return }
    // some views refuse to capture the mouse; then moving it over the game still turns the camera
    overGame = e.target && e.target.tagName === 'CANVAS'
    cursorX = e.clientX / Math.max(1, window.innerWidth)
    if (overGame && !lmb) { mouseDX += e.movementX; mouseDY += e.movementY }
  }
  const md = (e) => {
    if (isTouch) return
    if (e.button === 0) { lmb = true; lmbPressed = true }
    if (e.button === 2) { rmb = true; rmbPressed = true }
  }
  const mu = (e) => {
    if (isTouch) return
    if (e.button === 0) { lmb = false; lmbReleased = true }
    if (e.button === 2) rmb = false
  }
  const cm = (e) => e.preventDefault()
  const blur = () => { keys.clear(); lmb = rmb = false; touch.mx = touch.my = 0 }
  window.addEventListener('keydown', kd)
  window.addEventListener('keyup', ku)
  window.addEventListener('mousemove', mm)
  target.addEventListener('mousedown', md)
  window.addEventListener('mouseup', mu)
  target.addEventListener('contextmenu', cm)
  window.addEventListener('blur', blur)
  const out = (e) => { if (!e.relatedTarget) overGame = false }
  window.addEventListener('mouseout', out)
  return () => {
    window.removeEventListener('mouseout', out)
    window.removeEventListener('keydown', kd)
    window.removeEventListener('keyup', ku)
    window.removeEventListener('mousemove', mm)
    target.removeEventListener('mousedown', md)
    window.removeEventListener('mouseup', mu)
    target.removeEventListener('contextmenu', cm)
    window.removeEventListener('blur', blur)
  }
}

export function setInputEnabled(v) {
  enabled = v
  if (!v) { keys.clear(); lmb = rmb = false; overGame = false; touch.mx = touch.my = 0 }
}

const DEAD = 0.18
// with a free cursor parked at the left or right edge of the game, keep turning that way
function edgeTurn() {
  if (document.pointerLockElement || !overGame) return 0
  return cursorX < 0.04 ? -0.03 : cursorX > 0.96 ? 0.03 : 0
}
const axis = (v) => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD))

/** Snapshot of the actions for this frame. */
export function poll() {
  const gp = (navigator.getGamepads ? [...navigator.getGamepads()] : []).find(Boolean)
  const g = { mx: 0, my: 0, cx: 0, cy: 0, attack: false, attackP: false, attackR: false, roll: false, lock: false, lockP: false, block: false, stanceP: false, interactP: false }
  if (gp) {
    const b = (i) => !!gp.buttons[i]?.pressed
    const edge = (i) => { const now = b(i); const was = gpPrev[i]; gpPrev[i] = now; return now && !was }
    const rel = (i) => { const now = b(i); const was = gpPrev['r' + i]; gpPrev['r' + i] = now; return !now && was }
    g.mx = axis(gp.axes[0] || 0)
    g.my = axis(gp.axes[1] || 0)
    g.cx = axis(gp.axes[2] || 0)
    g.cy = axis(gp.axes[3] || 0)
    g.attack = b(2)
    g.attackP = edge(2)
    g.attackR = rel(2)
    g.roll = edge(0)
    g.lock = b(6)
    g.lockP = edge(6)
    g.block = b(5)
    g.stanceP = edge(3)
    g.interactP = g.roll
    g.hookP = edge(1)
    g.lanternP = edge(4)
  }
  const k = (c) => keys.has(c)
  const p = (c) => pressed.has(c)
  const out = {
    moveX: (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0) + g.mx + touch.mx,
    moveY: (k('KeyS') || k('ArrowDown') ? 1 : 0) - (k('KeyW') || k('ArrowUp') ? 1 : 0) + g.my + touch.my,
    lookX: (mouseDX + touch.dx * 1.6) * 0.0024 + edgeTurn() + g.cx * 0.05 + ((k('KeyL') ? 1 : 0) - (k('KeyJ') ? 1 : 0)) * 0.035,
    lookY: (mouseDY + touch.dy * 1.6) * 0.0018 + g.cy * 0.03,
    attack: lmb || g.attack,
    attackPressed: lmbPressed || p('KeyF') || g.attackP,
    attackReleased: lmbReleased || g.attackR,
    roll: p('Space') || g.roll,
    lockHeld: rmb || g.lock,
    lockPressed: rmbPressed || p('Tab') || g.lockP,
    block: k('ShiftLeft') || k('ShiftRight') || g.block,
    stance: p('KeyR') || g.stanceP,
    interact: p('KeyE') || g.interactP,
    hook: p('KeyQ') || !!g.hookP,
    lantern: p('KeyG') || !!g.lanternP,
    // Shift+G (or LB while blocking) turns the Lantern the other way
    lanternRev: k('ShiftLeft') || k('ShiftRight') || g.block || touch.rev,
    item: ['Digit1', 'Digit2', 'Digit3', 'Digit4'].findIndex((c) => p(c)),
    advance: p('Space') || p('Enter') || p('KeyE') || g.roll,
    pause: p('Escape') || p('KeyP'),
  }
  const len = Math.hypot(out.moveX, out.moveY)
  if (len > 1) { out.moveX /= len; out.moveY /= len }
  pressed.clear()
  mouseDX = mouseDY = 0
  touch.dx = touch.dy = 0
  lmbPressed = lmbReleased = rmbPressed = false
  if (!enabled) {
    return { ...out, moveX: 0, moveY: 0, lookX: 0, lookY: 0, attack: false, attackPressed: false, attackReleased: false, roll: false, lockHeld: false, lockPressed: false, block: false, stance: false, interact: false, hook: false, lantern: false, item: -1 }
  }
  return out
}

/** Dialogue / menu advance without consuming game input. */
export function peekAdvance() {
  return pressed.has('Space') || pressed.has('Enter') || pressed.has('KeyE')
}

// Let go of the mouse on purpose (a panel opened, the scene ended) — so the app can tell that apart
// from the player pressing Esc, which the browser turns into a pointer-lock exit.
let intentionalRelease = 0
export function releaseMouse() {
  if (!document.pointerLockElement) return
  intentionalRelease = performance.now()
  document.exitPointerLock()
}
export function wasIntentionalRelease() { return performance.now() - intentionalRelease < 600 }

// Capture the mouse for camera look; quietly does nothing where the browser refuses (embedded views, too soon after Esc).
export function captureMouse(el) {
  if (isTouch) return
  if (!el || !el.requestPointerLock || document.pointerLockElement) return
  try { const r = el.requestPointerLock(); if (r && r.catch) r.catch(() => {}) } catch { /* not allowed here */ }
}

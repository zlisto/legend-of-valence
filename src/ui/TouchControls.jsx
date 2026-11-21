import { useEffect, useRef } from 'react'
import { useGame } from '../engine/store'
import { touchStick, touchLook, touchKey, touchAttack, touchLanternRev, touchReleaseAll } from '../engine/input'

// Phone and tablet controls: a stick that appears where the left thumb lands, drag anywhere else to turn
// the camera, and buttons on the right. Each button acts like its keyboard key, so the game logic is unchanged.

const R = 56 // stick radius in px
const capture = (e) => { try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* not every pointer can be captured */ } }

function Stick() {
  const base = useRef(), knob = useRef(), id = useRef(null), o = useRef([0, 0])
  useEffect(() => () => touchStick(0, 0), [])
  const move = (e) => {
    if (e.pointerId !== id.current) return
    let dx = e.clientX - o.current[0], dy = e.clientY - o.current[1]
    const d = Math.hypot(dx, dy)
    if (d > R) { dx *= R / d; dy *= R / d }
    knob.current.style.transform = `translate(${dx}px, ${dy}px)`
    const m = Math.min(1, d / R) < 0.15 ? 0 : 1 // a small dead zone
    touchStick((dx / R) * m, (dy / R) * m)
  }
  const end = (e) => {
    if (e.pointerId !== id.current) return
    id.current = null; touchStick(0, 0)
    base.current.style.opacity = 0.45
    knob.current.style.transform = 'translate(0,0)'
  }
  return (
    <div className="tc-stickzone"
      onPointerDown={(e) => {
        e.preventDefault()
        if (id.current != null) return
        id.current = e.pointerId; capture(e)
        const r = e.currentTarget.getBoundingClientRect()
        o.current = [e.clientX, e.clientY]
        base.current.style.left = e.clientX - r.left - R + 'px'
        base.current.style.top = e.clientY - r.top - R + 'px'
        base.current.style.opacity = 0.9
      }}
      onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <div ref={base} className="tc-stick"><div ref={knob} className="tc-knob" /></div>
    </div>
  )
}

function LookZone() {
  const last = useRef({})
  const end = (e) => { delete last.current[e.pointerId] }
  // only one finger turns the camera, so two don't add up
  return (
    <div className="tc-look"
      onPointerDown={(e) => { e.preventDefault(); if (Object.keys(last.current).length) return; capture(e); last.current[e.pointerId] = [e.clientX, e.clientY] }}
      onPointerMove={(e) => {
        const l = last.current[e.pointerId]; if (!l) return
        touchLook(e.clientX - l[0], e.clientY - l[1])
        last.current[e.pointerId] = [e.clientX, e.clientY]
      }}
      onPointerUp={end} onPointerCancel={end} />
  )
}

/** A button that holds its key down while touched. */
function Btn({ code, label, cls = '', onDown, onUp, extra }) {
  const held = useRef(false)
  const down = (e) => {
    e.preventDefault(); e.stopPropagation()
    capture(e)
    if (held.current) return
    held.current = true
    if (extra) touchKey(extra, true)
    onDown ? onDown() : touchKey(code, true)
  }
  const up = () => {
    if (!held.current) return
    held.current = false
    onUp ? onUp() : touchKey(code, false)
    if (extra) touchKey(extra, false)
  }
  const upRef = useRef(up); upRef.current = up
  useEffect(() => () => upRef.current(), []) // vanished mid-press: let go
  return <button className={'tc-btn ' + cls} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}>{label}</button>
}

export default function TouchControls() {
  const s = useGame()
  const save = s.save
  const hidden = s.dialogue || s.panel || s.paused || s.mapOpen || s.cutscene || s.warpIn
  useEffect(() => { if (hidden) touchReleaseAll() }, [hidden])
  useEffect(() => { document.body.classList.toggle('tc-newman', !!s.newman) }, [!!s.newman])
  if (hidden) return null
  return (
    <div className="touch">
      <LookZone />
      <Stick />
      <div className="tc-right">
        <div className="tc-small">
          {save.hasCrystal && <Btn code="KeyR" label={<>Stance<small>{s.stance === 'sp3' ? 'sp³' : s.stance === 'sp2' ? 'sp²' : 'sp'}</small></>} />}
          {save.hasHookshot && <Btn code="KeyQ" label="Hook" cls="tc-hook" />}
          <Btn code="Tab" label={s.lockTarget ? 'Unlock' : 'Lock'} cls={s.lockTarget ? 'on' : ''} />
        </div>
        {(s.lanternPrompt || s.prompt) && (
          <div className="tc-item">
            {s.prompt && <Btn code="KeyE" label={<>Talk<small>/ use</small></>} cls="tc-e" />}
            {s.lanternPrompt && <Btn code="KeyG" label={<>Use<small>item</small></>} cls="tc-g" />}
            {s.lanternPrompt && s.lanternNeeds === 'hasLantern' && <Btn code="KeyG" onDown={() => { touchLanternRev(true); touchKey('KeyG', true) }} onUp={() => { touchKey('KeyG', false); touchLanternRev(false) }} label={<>Back<small>−60°</small></>} cls="tc-g rev" />}
          </div>
        )}
        <div className="tc-main">
          <Btn code="ShiftLeft" label="Block" cls="tc-block" />
          <Btn code="Space" label="Roll" cls="tc-roll" />
          <Btn label="Attack" cls="tc-attack" onDown={() => touchAttack(true)} onUp={() => touchAttack(false)} />
        </div>
      </div>
    </div>
  )
}

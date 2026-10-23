import { Component, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { getState, setState, useGame, resetSave, saveGame } from './engine/store'
import { initInput } from './engine/input'
import Intro, { IntroScene } from './scenes/Intro'
import Village from './scenes/Village'
import Caverns from './scenes/Caverns'
import HUD, { PauseMenu, Fade } from './ui/HUD'
import Dialogue from './ui/Dialogue'
import Panels from './ui/Panels'
import { MiniMap, FullMap } from './ui/MapView'
import { playMusic, stopMusic, sfx } from './audio/sfx'

// If a 3D scene throws, show a way back instead of a black screen.
class SceneGuard extends Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { console.error('[valence] scene crashed', err) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="credits"><div className="cbox">
        <h1>The cave shook…</h1>
        <p>Something went wrong in this scene. Your progress is saved at the last checkpoint.</p>
        <div className="title-buttons"><button className="primary" onClick={() => { this.setState({ err: null }); this.props.onReset() }}>Back to title</button></div>
      </div></div>
    )
  }
}

function Title({ onNew, onContinue }) {
  const save = useGame((s) => s.save)
  const canContinue = save.introSeen
  return (
    <div className="title" style={{ backgroundImage: 'url(art/cover.png)' }}>
      <div className="title-shade" />
      <div className="title-inner">
        <p className="eyebrow">Arcade of Alexandria</p>
        <h1>The Legend of Valence</h1>
        <p className="tag">Four bonds. One kingdom. Every reaction has a mechanism.</p>
        <div className="title-buttons">
          {canContinue && <button className="primary" onClick={onContinue}>Continue</button>}
          <button className={canContinue ? '' : 'primary'} onClick={onNew}>{canContinue ? 'New game' : 'Start'}</button>
        </div>
        <p className="credit">Based on <i>Organic Chemistry: A Tenth Edition</i>, Chapter 1 — John McMurry, OpenStax (CC BY-NC-SA 4.0). Best with keyboard + mouse or a gamepad.</p>
      </div>
    </div>
  )
}

function Credits({ onTitle, onKeep }) {
  return (
    <div className="credits">
      <div className="cbox">
        <h1>Bond Shard 1 of 12</h1>
        <p>You cleared <b>The Orbital Caverns</b> — Chapter 1, <i>Structure and Bonding</i>.</p>
        <ul>
          <li>Atoms: protons set the element (Z); isotopes differ only in neutrons (§1.1)</li>
          <li>Electron configurations: Aufbau, Pauli, Hund (§1.3)</li>
          <li>Bonds needed for an octet: H 1, C 4, N 3, O 2; bond length at the energy minimum (§1.4–1.5)</li>
          <li>Hybrid orbitals: sp³ 109.5°, sp² 120° + π, sp 180° + 2π (§1.6–1.10)</li>
          <li>Skeletal structures: carbons at corners, hydrogens implied (§1.12)</li>
        </ul>
        <p className="small">Next: the road to Carbon Castle and the Tide Temple (Chapter 2) — coming soon.</p>
        <div className="title-buttons">
          <button className="primary" onClick={onKeep}>Keep exploring the caverns</button>
          <button onClick={onTitle}>Back to title</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const screen = useGame((s) => s.screen)
  const mapOpen = useGame((s) => s.mapOpen)
  const [sceneKey, setSceneKey] = useState(0)
  const wrap = useRef()

  // one input system + pointer lock for the whole app
  useEffect(() => {
    const el = wrap.current
    const off = initInput(el)
    const click = () => {
      const s = getState()
      const playing = s.screen === 'village' || s.screen === 'caverns'
      if (playing && !s.dialogue && !s.panel && !s.paused && !document.pointerLockElement && el.requestPointerLock) el.requestPointerLock()
    }
    const key = (e) => {
      const s = getState()
      if (e.code === 'KeyP') { if (!s.dialogue && !s.panel) setState({ paused: !s.paused }) }
      if (e.code === 'KeyM' && (s.screen === 'village' || s.screen === 'caverns') && !s.panel && !s.paused) setState({ mapOpen: !s.mapOpen })
      if (e.code === 'Escape' && s.mapOpen) setState({ mapOpen: false })
    }
    el.addEventListener('click', click)
    window.addEventListener('keydown', key)
    return () => { off(); el.removeEventListener('click', click); window.removeEventListener('keydown', key) }
  }, [])
  useEffect(() => { if (screen !== 'village' && screen !== 'caverns' && document.pointerLockElement) document.exitPointerLock() }, [screen])

  const go = (next) => {
    setState({ fade: 1 })
    setTimeout(() => {
      setState({ screen: next, fade: 0, prompt: null, dialogue: null, panel: null, lockTarget: null, bossHp: null, hp: getState().maxHp, paused: false, mapOpen: false })
      setSceneKey((k) => k + 1)
    }, 450)
  }

  useEffect(() => { if (screen === 'title') stopMusic() }, [screen])

  const onNew = () => { resetSave(); sfx('lock'); go('intro') }
  const onContinue = () => {
    const s = getState().save
    sfx('lock')
    go(s.checkpoint && s.checkpoint.scene === 'caverns' ? 'caverns' : 'village')
  }
  const playing = screen === 'village' || screen === 'caverns'
  const show3d = screen === 'intro' || playing
  return (
    <div className="app">
      <div ref={wrap} className="screen" style={{ visibility: show3d ? 'visible' : 'hidden' }}>
        <SceneGuard onReset={() => go('title')}>
        <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 50, near: 0.1, far: 300, position: [0, 4, 16] }} gl={{ antialias: true, powerPreference: 'high-performance' }} frameloop={show3d && !mapOpen ? 'always' : 'never'}>
          {screen === 'intro' && <IntroScene />}
          {screen === 'village' && <Village key={sceneKey} onExit={(to) => { saveGame({ checkpoint: { scene: 'caverns', room: 'entrance' } }); go(to) }} />}
          {screen === 'caverns' && <Caverns key={sceneKey} onExit={(to) => go(to)} />}
        </Canvas>
        </SceneGuard>
      </div>
      {screen === 'title' && <Title onNew={onNew} onContinue={onContinue} />}
      {screen === 'intro' && <Intro onDone={() => { saveGame({ introSeen: true }); go('village') }} />}
      {screen === 'credits' && <Credits onTitle={() => go('title')} onKeep={() => go('caverns')} />}
      {playing && <HUD />}
      {playing && <Panels />}
      {playing && <MiniMap />}
      {playing && <FullMap />}
      <Dialogue />
      <PauseMenu onTitle={() => go('title')} />
      <Fade />
    </div>
  )
}

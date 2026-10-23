# The Legend of Valence

An action-adventure game in the browser that teaches organic chemistry. It's part of the [Arcade of Alexandria](https://github.com/zlisto/arcade_of_alexandria), which turns textbooks into games.

**Play:** https://zlisto.github.io/legend-of-valence/

Kai is a carbon knight with four bond sockets. He explores the kingdom to recover the twelve Bond Shards from the wizard Malradix. This build has the intro, Hydrogen Village and Dungeon 1, the Orbital Caverns (Chapter 1, *Structure and Bonding*): atoms and isotopes, electron configurations, octets, bond length, hybrid orbitals and skeletal structures.

## Controls

| Action | Keyboard + mouse |
| --- | --- |
| Move / camera | WASD / mouse (click to capture) |
| Attack (hold to charge a spin) | Left click |
| Lock on | Right click or Tab |
| Roll, sidestep and backhop while locked on | Space |
| Block | Shift |
| Change hybrid shape (sp³ / sp² / sp) | R |
| Talk / use | E |
| Map (shows where to go next) | M |
| Item menu and pause (items, notes, quest) | Esc or P |

Gamepads work too.

## Run locally

```bash
npm install
npm run dev
```

`npm run build -- --outDir docs` rebuilds the GitHub Pages copy.

## Source and attribution

The game content is based on *Organic Chemistry: A Tenth Edition* by John McMurry (OpenStax), used under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Puzzle hints cite the section they come from (for example §1.3). The game is non-commercial and shares its adaptations under the same license.

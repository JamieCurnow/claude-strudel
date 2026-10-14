// Sample banks loaded at boot. Shared by the browser (src/engine/sounds.ts) and the script that writes the
// sound list Claude sees (scripts/build-reference.mjs), so Claude only ever names sounds that exist.

export const STRUDEL_CDN = 'https://strudel.b-cdn.net'

export interface SoundBank {
  id: string
  /** URL of a strudel.json-style sample map (or `github:user/repo`). */
  map: string
  /** Base URL for the files, when the map doesn't carry `_base`. */
  base?: string
  tag?: string
  /** One-line description for Claude. */
  about: string
}

// Order matters: later banks win when two banks define the same name, so the strudel.cc defaults go last.
export const SOUND_BANKS: SoundBank[] = [
  {
    id: 'dirt-samples',
    map: 'github:tidalcycles/dirt-samples',
    about:
      'Classic TidalCycles Dirt-Samples: breaks (amencutup, breaks125/152/157/165, jungle), jungbass, hoover, stabs, vox, fx'
  },
  {
    id: 'switchangel-breaks',
    map: 'github:switchangel/breaks',
    about: 'Switch Angel break loops (s("breaks").n(0..4)), made for .fit() / .scrub() / .splice()'
  },
  {
    id: 'tidal-drum-machines',
    map: `${STRUDEL_CDN}/tidal-drum-machines.json`,
    base: `${STRUDEL_CDN}/tidal-drum-machines/machines/`,
    tag: 'drum-machines',
    about:
      'Classic drum machines, used with .bank(): RolandTR909, RolandTR808, RolandTR707, LinnDrum, AkaiMPC60, ...'
  },
  {
    id: 'uzu-drumkit',
    map: `${STRUDEL_CDN}/uzu-drumkit.json`,
    base: `${STRUDEL_CDN}/uzu-drumkit/`,
    tag: 'drum-machines',
    about: 'strudel.cc default kit: bd sd hh oh cp rim lt mt ht cr rd sh tb perc'
  },
  {
    id: 'vcsl',
    map: `${STRUDEL_CDN}/vcsl.json`,
    base: `${STRUDEL_CDN}/VCSL/`,
    about: 'VCSL orchestral/acoustic instruments (CC0)'
  },
  {
    id: 'piano',
    map: `${STRUDEL_CDN}/piano.json`,
    base: `${STRUDEL_CDN}/piano/`,
    about: 'Salamander grand piano: s("piano")'
  },
  {
    id: 'uzu-wavetables',
    map: `${STRUDEL_CDN}/uzu-wavetables.json`,
    base: `${STRUDEL_CDN}/uzu-wavetables/`,
    about: 'Wavetables (wt_*) for the wavetable oscillator'
  }
]

export const DRUM_MACHINE_ALIASES = `${STRUDEL_CDN}/tidal-drum-machines-alias.json`

/** Built-in synth sounds (no samples needed). */
export const SYNTH_SOUNDS = [
  'sine',
  'sawtooth',
  'square',
  'triangle',
  'supersaw',
  'pulse',
  'white',
  'pink',
  'brown',
  'crackle',
  'sbd',
  'bytebeat'
]

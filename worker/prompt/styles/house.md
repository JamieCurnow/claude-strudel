# House (deep, classic, garage-ish)

## Tempo

- 118-126 BPM: deep 118-122, classic/piano 122-126, tech-house 124-128. UK garage / 2-step 130-134. `setcpm(124/4)`.

## Key / harmony habits

- Chords carry house. Minor 7/9/11 and dominant 9 voicings, often a two-chord dorian vamp: `Am9 - D9`, `Fm9 - Bbm9`, `Cm9 - F9`, `Dm9 - G13`.
- Classic piano/organ house is more major/gospel: `C^7 - Am7 - Dm7 - G7`, `F^7 - Em7 - Dm7 - C^7`, `Bb^7 - Am7 - Gm7 - C7sus`... Change chord every 1-2 bars.
- Major 7 = `^7`. `maj7`, `sus2`, `sus4` give silence; use `sus`/`7sus`.
- Bass follows chord roots (an octave 1-2 register), with fifths/octaves/passing notes.

## Drums

- Four-on-the-floor kick (`RolandTR909` or `RolandTR808`, uzu `bd`), clap on 2 and 4 (`"~ cp ~ cp"`), open hat on every offbeat (`"[~ oh]*4"`).
- Shuffle is essential: 16th hats with `.swingBy(1/6, 8)` (light) to `.swingBy(1/3, 8)` (heavy MPC swing). swingBy(amount, n) delays the 2nd half of each of n slices; n=8 swings 16ths.
- Accents: `gain("[.25 .45 .3 .6]*4")`. Shaker `s("sh*16")` (default kit; of the banks only 808 has `sh`), conga/bongo (`conga`, `bongo` from VCSL) ghost patterns, tambourine `tambourine` on offbeats.
- Garage/2-step: skip the 2nd and 4th kicks: `s("bd").beat("0,7,10", 16)`, snare/clap on 2 and 4, heavy swing (`.swingBy(1/3, 8)`), rim shots `s("rim").euclidRot(3, 8, 3)`.
- Kits with character: `RolandTR909` (classic Chicago/NY), `RolandTR808` (deep), `LinnDrum`, `AkaiMPC60` (garage/soulful), `house` sample set (0 bd, 1 cb, 3 hh, 4 oh, 5-6 perc, 7 sn).

## Bass

- Offbeat bass (pumping, never with the kick): `note("a1").struct("~ x ~ x ~ x ~ x")`.
- Deep house bass: `sine`/`triangle` or `gm_synth_bass_1`/`gm_electric_bass_finger`, rhythm `"x ~ ~ x ~ ~ x ~"` or `"~ ~ x ~ x ~ ~ x"`, `.lpf(400-900)`.
- Organ bass (M1 style): `gm_drawbar_organ` an octave up, short decay.
- Sidechain pump: kick `.duckorbit(2).duckattack(.15).duckdepth(.5)`, bass + chords on `.orbit(2)`.

## Textures / leads

- Rhodes chords `gm_epiano1` / `gm_epiano2`; piano stabs `s("piano")` or `gm_piano`; organ stabs `gm_drawbar_organ`/`gm_percussive_organ`; strings `gm_string_ensemble_1`; pads `gm_pad_warm`.
- Stab rhythm with pushes: `.struct("~ ~ x ~ ~ x ~ ~ ~ ~ x ~ ~ x ~ ~")` or anticipations on the "and of 4" `"~ x@2 ~ x ~ ~ x"`. Short: `.decay(.2).sustain(0)` or `.clip(.5)`.
- Vocal snips: `yeah` (31), `rave` shouts, `gm_choir_aahs` pads. Filter house: `.lpf(sine.slow(16).range(800, 6000))` on the chords.
- Delay: `.delay(.3).delaysync(3/16).delayfeedback(.4)`, room on the chord orbit.

## Arrangement

- 8-bar phrases inside 32-bar sections. Intro: kick + hats (16-32 bars). Add bass, then chords.
- Breakdown: kick out, chords + vocal with filter opening (`rise`), clap roll into the drop.
- The "filter house" move: whole mix `all(x => x.djf(rise(16, .15, .5)))` (DJ filter closed, opening over 16 bars). `all(x => x.lpf(...))` would overwrite every block's own lpf.
- Mute/unmute one element per 8 bars; the groove does the work.

## Pitfalls

- No swing = sounds like techno. Swing hats/percussion (kick and clap straight).
- Chords that change every beat or wander out of key. Two to four chords, looped.
- Bass and kick both on the downbeat with long decay: offbeat the bass or duck it.
- Too much reverb on the chords on the same orbit as the drums.

## Example: deep house starting groove (A dorian, 122)

```strudel
setcpm(122/4)
kick: s("bd*4").bank("RolandTR909").decay(.5).gain(.95)
  .duckorbit(2).duckattack(.15).duckdepth(.45)
clap: s("~ cp ~ cp").bank("RolandTR909").gain(.55).room(.15)
oh: s("[~ oh]*4").bank("RolandTR909").gain(.35).cut(1)
hats: s("hh*16").bank("RolandTR909").gain("[.2 .35 .25 .45]*4").swingBy(1/5, 8).cut(1)
conga: s("conga").n("<3 5>").struct("~ ~ x ~ ~ x ~ ~ ~ x ~ ~ x ~ ~ ~").gain(.3).swingBy(1/5, 8).pan(.35)
bass: note("<[a1 ~ ~ a1 ~ ~ e2 ~] [d2 ~ ~ d2 ~ ~ a1 c2]>").s("triangle")
  .lpf(500).decay(.3).sustain(.4).gain(.75).orbit(2)
chords: chord("<Am9 D9>").voicing().struct("~ ~ x ~ ~ x ~ ~ ~ ~ x ~ ~ x ~ ~").s("gm_epiano1")
  .clip(.8).gain(.45).room(.3).orbit(2)
```

## Example: classic piano house peak, chords filter in over 8 bars (C major, 124)

```strudel
setcpm(124/4)
kick: s("bd*4").bank("RolandTR909").decay(.45).duckorbit(2).duckattack(.12).duckdepth(.5)
clap: s("~ cp ~ cp").bank("RolandTR909").gain(.6).room(.2).lastOf(4, x => x.ply("1 2"))
oh: s("[~ oh]*4").bank("RolandTR909").gain(.4).cut(1)
hats: s("hh*16").bank("RolandTR909").gain("[.25 .4 .3 .55]*4").swingBy(1/4, 8).cut(1)
tamb: s("tambourine*8").gain(.18).swingBy(1/4, 8).hpf(5000).pan(.7)
bass: note("<c2 a1 d2 g1>").struct("~ x ~ x ~ x ~ [x x]").s("sawtooth")
  .lpf(700).lpq(4).decay(.18).sustain(.2).gain(.55).orbit(2)
piano: chord("<C^7 Am7 Dm7 G7>").anchor("c5").voicing().s("piano")
  .struct("x ~ ~ x ~ ~ x ~ ~ ~ x ~ x ~ ~ ~").clip(.6).gain(.55)
  .lpf(rise(8, 600, 9000, 2)).room(.25).orbit(2)
organ: chord("<C^7 Am7 Dm7 G7>").voicing().struct("~ x ~ x ~ x ~ x").s("gm_drawbar_organ")
  .decay(.15).sustain(0).gain(.22).hpf(300).afterBars(8).orbit(2)
vox: s("yeah:4").struct("<~ ~ ~ x>").gain(.6).delay(.35).delaysync(3/16).delayfeedback(.4).orbit(3)
```

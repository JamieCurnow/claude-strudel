# Drum & Bass (liquid, rollers, neurofunk)

## Tempo

- 172-176 BPM, standard 174: `setcpm(174/4)`. Liquid sits 172-174, neuro/rollers 174-176.
- Phrases are 8/16/32 bars; DJs mix on 32-bar boundaries, so big changes land on bar 1 of a 16.

## Key / harmony habits

- Liquid: lush extended chords, soul/jazz moves. F minor `Fm9 - Db^7 - Bbm9 - C7` or `Fm9 - Bbm9 - Eb - Ab^7`. Change chord every 1-2 bars.
- Neuro/rollers: one root for 4-8 bars, tension from the b2/b5 (F -> Gb, F -> B) and octave jumps, not chord changes.
- Major 7 is `^7`; `maj7`, `sus2`, `sus4` give silence. Valid: `m7 m9 m11 ^7 ^9 7 9 13 7sus sus m7b5 6 69 add9`.
- Sub roots in 55-90 Hz: F (`f2` 87 Hz or `f1`), Bb1, C2, Db2. Below E1 is inaudible on most systems.

## Drums

- Two-step: kick on 1 and the "and of 3", snare on 2 and 4: `s("bd").beat("0,10", 16)`, `s("sd").beat("4,12", 16)`. `beat()` steps are 0-indexed 16ths. Variations: extra kick `"0,10,13"`, `"0,7,10"` for rollers.
- Layer a real break under the programmed hits at low gain with `.hpf(300)` for top-end movement: `s("breaks/2").n(2).fit()` (Switch Angel breaks are 2-bar loops at 165; `/2` keeps natural speed).
- Chopped break idiom: `s("breaks/2").n(1).fit().scrub(irand(16).div(16).seg(8).rib(5,.5))` = random 8th slices, looped every half bar by `rib`.
- Hats: 16th shaker/hh with accents `gain("[.25 .5]*8")`, offbeat open hat or ride `"~ x"` x4. Ghost snares on the "e"/"a": quiet sd at .2-.3.
- Kits: `RolandTR909` (bd sd hh oh rd cp), `RolandTR808`, uzu default `bd sd hh oh cp rim`, `jungle` kit (5/6 kick, 11/12 snare). Tight kick: `.decay(.25)`. Big snare: layer `sd` + `cp` with `.room(.2)`.
- Fills: `.lastOf(8, x => x.ply(2))`, snare `.almostNever(ply(2))`, `snareRoll(2)` before a drop.

## Bass

- Liquid: sine sub following chord roots, long notes, no glide; optional `gm_fretless_bass`/`gm_electric_bass_finger` an octave up.
- Reese (rollers/neuro): `s("supersaw")` or two `sawtooth` notes a few cents apart; `.lpf(300-800)`, `.lpenv(4-8).lpa(.005).lpd(.15)`, `.distort("2:.5")`, `.ftype("ladder")` for grit.
- Neuro stabs: 16th rhythms via `.struct("x ~ ~ x ~ ~ x ~ x ~ x ~ ~ x ~ ~")`, timbre per hit with `.lpenv("<4 7 3 8>")`, `.vowel("<o a>")`, `.fm(2).fmh(1.5)`, `.coarse`/`.crush` sparingly.
- Always split bass: clean `sine` sub (mono, unfiltered) + dirty mid-bass `.hpf(150)`. Keep sub on its own block so you can mute/swap.
- Sidechain feel: `kick` with `.duckorbit(2).duckattack(.12).duckdepth(.5)` and the reese on `.orbit(2)`.

## Textures / leads

- Atmos: `gm_pad_warm`, `gm_pad_halo`, `gm_string_ensemble_1`, `gm_choir_aahs` with `.attack(1).release(3).room(.7).roomsize(8)` on `.orbit(3)`.
- Liquid keys: `gm_epiano1` (rhodes), `piano`, `gm_vibraphone`; arp chord tones with `n("0 1 2 3 4 3 2 1").chord(...).voicing()` (n indexes the voicing).
- Vocal-ish: `gm_voice_oohs`, `gm_choir_aahs` long notes; `.delay(.4).delaysync(3/8)`.
- Neuro FX: short `hoover`, `stab`, `wt_digital` with `.wt(saw.slow(4))`.

## Arrangement

- Intro 16-32: atmos + hats + filtered break, no kick or sub. `all(x => x.djf(rise(16, .15, .5, 2)))` opens the whole mix like a DJ filter.
- Build 8: snare roll, riser, drop the kick out for the last bar.
- Drop: kick, snare, sub and reese all land on bar 1 together. 32 bars, then variation (second bass pattern, chopped break).
- Breakdown/second build 16: pads + vocal + filtered drums, then drop again with a bass switch-up.

## Pitfalls

- Four-on-the-floor kicks turn DnB into techno; kick goes 1 and "and of 3".
- Reese without a high-pass + sine sub under it = mud. hpf the reese 120-180.
- Too many chord changes in neuro; too few in liquid.
- Break loops played with `s("breaks").fit()` (no `/2`) run at double speed.

## Example: liquid starting groove (F minor, 174)

```strudel
setcpm(174/4)
kick: s("bd").bank("RolandTR909").beat("0,10", 16).decay(.3).gain(.9)
snare: s("sd").bank("RolandTR909").beat("4,12", 16).gain(.75).room(.15)
ghost: s("sd").struct("~ ~ ~ x ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~ x").gain(.18).hpf(500)
hats: s("hh*16").bank("RolandTR909").gain("[.22 .38]*8").hpf(6000).pan(.55)
brk: s("breaks/2").n(2).fit().hpf(400).gain(.32)
sub: note("<f2 db2 bb1 c2>").struct("x@3 x@3 x@2").s("sine").gain(.9)
keys: chord("<Fm9 Db^7 Bbm9 C7>").voicing().struct("x@3 x@3 x@2").s("gm_epiano1")
  .gain(.4).room(.35).orbit(2)
pad: chord("<Fm9 Db^7 Bbm9 C7>").voicing().s("gm_string_ensemble_1")
  .attack(1).release(2).gain(.22).lpf(2500).room(.7).roomsize(8).orbit(3)
```

## Example: neuro roller peak with an 8-bar build (F minor, 174)

```strudel
setcpm(174/4)
kick: s("bd").bank("RolandTR909").beat("<[0,10]!3 [0,7,10]>", 16).decay(.25)
  .duckorbit(2).duckattack(.12).duckdepth(.5).afterBars(8)
snare: s("[sd,cp]").bank("RolandTR909").beat("4,12", 16).gain(.8).room(.2).afterBars(8)
hats: s("hh*16").gain("[.2 .45]*8").hpf(5000).almostNever(ply(2))
  .lpf(rise(8, 1500, 16000, 2))
chops: s("breaks/2").n(1).fit().scrub(irand(16).div(16).seg(8).rib(5, .5))
  .hpf(fall(8, 2000, 250)).distort("2:.4").gain(.45).orbit(4)
sub: note("<f1!3 [f1 db2]>").s("sine").struct("x ~ ~ x ~ ~ x ~ x ~ ~ ~ x ~ ~ ~").gain(.95).afterBars(8)
neuro: note("<f2!3 [f2 gb2]>").s("supersaw").unison(4).detune(.3)
  .struct("x ~ ~ x ~ ~ x ~ x ~ x ~ ~ x ~ ~")
  .lpf(280).lpenv("<6 4 8 [3 9]>").lpa(.005).lpd(.16).lps(.2).lpq(6).ftype("ladder")
  .vowel("<o o a [o e]>").distort("3:.35").hpf(150).gain(.4).orbit(2).afterBars(8)
roll: snareRoll(4, "sd").late(4).afterBars(4)
noise: riser(8)
atmos: chord("<Fm11!2 Db^7 Bbm9>/2").voicing().s("gm_pad_halo")
  .attack(1.5).release(3).gain(.2).hpf(300).room(.7).roomsize(8).orbit(3)
```

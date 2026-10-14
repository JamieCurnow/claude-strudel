# Techno (driving, hypnotic, acid)

## Tempo

- 128-138 BPM. Hypnotic/dub 126-130, driving/peak 132-136, acid 130-136, hard 140+. `setcpm(132/4)`.
- Everything is loop-based: 1-bar or 2-bar loops that evolve by filter, density and mutes, not by new melodies.

## Key / harmony habits

- Mostly one root for the whole track (A, F, G, D). Minor, phrygian (b2) or no harmony at all.
- Chords are single stabs: minor 7, minor 9, sus or power chords (`Am7`, `Am9`, `Dm9`, `C69`), one chord for 8-16 bars, or two alternating.
- Acid lines stay on the root with octave jumps and 1-2 colour notes (b3, 4/5, b7, b2): `a1 a2 c2 g1 d#2`.

## Drums

- Four-on-the-floor: `s("bd*4").bank("RolandTR909")` (909 = classic/peak) or `RolandTR808` (deeper, boomy). `.decay(.4)` to tighten, `.distort("1.5:.6")` for hard techno.
- Rumble kick: a low sine pulsing on the 16ths between kicks, `note("a1").s("sine").struct("~ x x x ~ x x x ~ x x x ~ x x x")` with short decay, lpf 150-250, slight distort, `.duckorbit` from the kick. Add `.room(.3)` on its own orbit for the rumble wash.
- Hats: offbeat open hat `s("[~ oh]*4")`, 16th closed hats with accents `gain("[.3 .5 .8 .5]*4")`, `.cut(1)` so hh chokes oh.
- Clap/snare on 2 and 4 (`"~ cp ~ cp"`), or no snare at all in hypnotic sets: rim/perc euclid instead `s("rim").euclid(5, 16)` / `.euclidRot(3, 8, 2)`.
- Ride `s("rd*8")` (909 has `rd`, 808 does not) for peak sections. Toms `lt mt ht` in euclid rolls.
- Variation without new parts: `.degradeBy(.2)` hats, `.sometimesBy(.2, x => x.speed(1.5))`, `.lastOf(4, x => x.ply(2))` on percussion, `.mask("<1 1 1 [1 0]>")`.

## Bass

- Offbeat bass (between kicks) avoids kick clashes: `note("a1").struct("~ x ~ x ~ x ~ x")` or 16th rolling `"~ x x x"`.
- Acid 303: `s("sawtooth")` (or `square`), `.lpf(300-900).lpq(10-20).lpenv(3-6).lpd(.1-.2).lps(0)`, `.ftype("ladder").drive(...)` for squelch, accents by `gain`, filter opened slowly with `rise()` or `sine.slow(16).range(...)`.
- Sidechain: kick `.duckorbit(2).duckattack(.1).duckdepth(.6)`, bass/chords on `.orbit(2)`.

## Textures / leads

- Dub stab: `chord("Am7").voicing()` on `sawtooth`/`gm_pad_poly`, `.decay(.15).sustain(0)`, offbeat `struct`, `.delay(.5).delaysync(3/16).delayfeedback(.6)`, room on own orbit.
- Hypnotic sequences: 3-against-4 via polymeter `note("{a2 c3 e3}%16")` or euclid `.struct("x(3,8)")`; a repeating random riff with `n(irand(8)).seg(16).scale("A2:minor").ribbon(7, 1)` (ribbon loops one bar of randomness; change the offset for a new riff).
- FX: `s("white").hpf(8000)` crash-wash, `s("industrial:3")`, `s("metal")`, `techno` and `tech` sample sets, `gm_fx_*` sparse.
- Movement: `.lpf(sine.slow(16).range(600, 4000))`, `.pan(sine.slow(4))`, `.phaser(.5)`.

## Arrangement

- Phrases of 16/32 bars. Intro: kick + hats only (DJ friendly), add perc at 16, bass at 32.
- Breakdown: kick out 8-16 bars, keep hats/rumble wash, open the stab/acid filter, riser.
- Drop: kick + bass back on bar 1, often after one bar of silence or a snare roll.
- Keep loops; change one element every 8 bars (mute/unmute, filter, density).

## Pitfalls

- Swing kills drive: no swing on techno kicks/hats (a hint `swingBy(1/16, 4)` on perc at most).
- Bass on the downbeat with a 909 kick = flab. Offbeat it or duck it.
- Acid lpq above ~25 gets shrill; lpenv above 8 gets clicky.
- Long reverbs on the kick orbit smear the groove; reverb only on stabs/rumble orbits.

## Example: hypnotic starting groove (A minor, 130)

```strudel
setcpm(130/4)
kick: s("bd*4").bank("RolandTR909").decay(.45).gain(.95)
  .duckorbit(2).duckattack(.12).duckdepth(.6)
rumble: note("a1").s("sine").struct("~ x x x ~ x x x ~ x x x ~ x x x")
  .decay(.13).sustain(0).lpf(200).distort("1:.6").gain(.55).room(.3).orbit(2)
hats: s("[~ oh]*4").bank("RolandTR909").gain(.4).cut(1).hpf(4000)
ticks: s("hh*16").bank("RolandTR909").gain("[.18 .3 .45 .3]*4").cut(1).degradeBy(.15)
perc: s("rim").euclidRot(5, 16, 2).bank("RolandTR909").gain(.35).pan(sine.slow(4)).delay(.25).delaysync(3/16)
stab: chord("Am7").voicing().struct("~ ~ x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~").s("sawtooth")
  .decay(.15).sustain(0).lpf(sine.slow(16).range(700, 3000)).gain(.25)
  .delay(.5).delaysync(3/16).delayfeedback(.6).room(.4).orbit(3)
```

## Example: acid peak with a drop at bar 8 (A minor, 134)

```strudel
setcpm(134/4)
kick: s("bd*4").bank("RolandTR909").decay(.4).distort("1.3:.7")
  .duckorbit(2).duckattack(.1).duckdepth(.6).afterBars(8)
clap: s("~ cp ~ cp").bank("RolandTR909").gain(.6).room(.15).afterBars(8)
oh: s("[~ oh]*4").bank("RolandTR909").gain(.42).cut(1)
hats: s("hh*16").bank("RolandTR909").gain("[.25 .4 .7 .4]*4").cut(1)
ride: s("rd*8").bank("RolandTR909").gain(.22).hpf(6000).afterBars(8)
acid: note("<[a1 a1 a2 a1 c2 a1 g2 a1 a1 d#2 a1 a2 c2 a1 g1 a2] [a1 a1 a2 a1 c2 a1 g2 a1 a1 e2 a1 a2 g2 a1 c3 a2]>")
  .s("sawtooth").gain("[1 .7 .9 .7]*4".mul(.4))
  .lpf(rise(16, 350, 1600, 2)).lpq(14).lpenv("<4 5 3 6>").lpd(.13).lps(0).ftype("ladder")
  .distort("1.5:.5").orbit(2)
sub: note("a1").s("sine").struct("~ x ~ x ~ x ~ x").decay(.2).sustain(0).gain(.6).orbit(2).afterBars(8)
roll: snareRoll(4, "cp").bank("RolandTR909").late(4).afterBars(4)
noise: riser(8)
```

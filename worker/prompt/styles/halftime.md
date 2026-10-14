# Halftime / dubstep (140 felt at 70)

## Tempo

- Dubstep 138-142, written `setcpm(140/4)`: the kick on beat 1, the snare on beat 3, so the bar feels like 70 BPM.
- Halftime DnB: `setcpm(170/4)` or `174/4` with the same kick-1 / snare-3 skeleton (feels 85-87). Same tempo as DnB, so a DnB set can switch to halftime and back without a tempo change.
- Trap-leaning halftime 140-150 uses the same grid with rolling hats.

## Key / harmony habits

- Minor and phrygian: E, F, F#, G minor. The b2 (F over E, G over F#) is the menace note. Tritone (Bb over E) for nasty bits.
- Harmony is mostly implied by the bass root. Pads, if any, are one long minor chord or a two-chord drone (`Em - C`, `Fm - Db`).
- Sub: octave 1 roots (E1 41 Hz, F1 44 Hz, G1 49 Hz). Wobble/mid-bass an octave or two up.

## Drums

- Skeleton: `s("bd").beat("0", 16)` + `s("sd").beat("8", 16)`; push kicks on 16th 10/11 or 14 for bounce (`"0,10"`, `"0,11,14"`).
- The snare is huge: layer `sd` + `cp` (`s("[sd,cp]")`), `.room(.4).roomsize(4)` on its own orbit, `.distort("1:.6")`.
- Hats sparse: 8ths with `.degradeBy(.2)`, or trap-ish 16ths with ratchets `.sometimesBy(.15, x => x.ply("2 3"))`. 12-step triplet hats `s("hh*12")` feel halftime-y.
- Fills: tom runs `s("lt mt ht")`, snare ply on the last beat `.lastOf(4, x => x.ply("1 1 1 4"))`.
- Leave space. Fewer than ~30 drum events per bar is normal.

## Bass

- Always a clean sine sub under the mid-bass, mono, following the same root.
- Wobble = LFO on the lowpass. Use `.lpsync(n)` (LFO cycles per bar, phase-locked to the bar) so the wobble moves INSIDE one held note: `.lpf(500).lpsync("<4 8 [6 12] 16>").lpdepth(.9)`. Per-event signals like `.lpf(sine.fast(4)...)` only update at each note start.
- Wobble rates in 4/4 at 140: `lpsync(2)` half notes, `4` quarters, `6` triplets, `8` 8ths, `16` 16ths. Change the rate each bar with `"<...>"`.
- Growl/neuro: `sawtooth`/`supersaw` + `.fm(2-4).fmh("<1 1.5 2.01>")`, `.vowel("<a o e>")` on retriggered 16ths, `.distort("3:.4")`, `.ftype("ladder")`.
- Rhythmic bass: `.struct("x ~ ~ x ~ ~ x ~ ~ ~ x ~ x ~ ~ ~")`, triplet `"x(5,12)"`, long notes with `@`.
- High-pass the mid-bass at 150-200 so it never fights the sub.

## Textures / leads

- Dark atmos: `gm_pad_halo`, `gm_choir_aahs`, `gm_fx_atmosphere`, `s("brown").lpf(400)` rumble beds, `pad:0` (alien monolith), `padlong`.
- Leads: square/pulse lead in phrygian, `.delay(.4).delaysync(3/8)` for sparse calls. Plucks `gm_koto`, `gm_sitar` for "dubstep eastern" flavour.
- FX: `hoover`, `stab`, reversed hits `.speed(-1)`, `s("white").hpf(rise(8,...))` risers.

## Arrangement

- Intro 16-32: atmos + sub hints + filtered drums.
- Build 8: snare roll (`snareRoll(4)`), riser, everything high-passed upwards, one bar of silence or a vocal before the drop.
- Drop 16-32: sub + wobble + full drums on bar 1. Second half: new wobble rhythm/rate, switch-up of bass patch.
- Breakdown: drums out, pads + lead, sub drones.

## Pitfalls

- A four-on-the-floor kick or a snare on 2 and 4 kills the halftime feel.
- Wobble written with `sine.fast(n)` on long notes does not wobble (sampled once per note). Use `lpsync`, or retrigger with `.seg(16)`.
- Reverb on the bass or kick. Only the snare and FX get space.
- Too many drum hits. Halftime is about weight and gaps.

## Example: halftime starting groove (E minor, 140)

```strudel
setcpm(140/4)
kick: s("bd").bank("RolandTR808").beat("<0 0 [0,10] [0,11,14]>", 16).gain(.95)
snare: s("[sd,cp]").bank("RolandTR909").beat("8", 16).gain(.8).room(.35).roomsize(4).orbit(3)
hats: s("hh*8").bank("RolandTR909").gain("[.25 .4]*4").degradeBy(.2).hpf(5000)
sub: note("<e1 e1 c2 [d2 b1]>").s("sine").struct("x@6 ~ x@5 ~@4").gain(.95)
pad: chord("<Em9 Em9 C^7 [D B7]>").voicing().s("gm_pad_halo")
  .attack(1).release(3).gain(.22).hpf(250).room(.6).roomsize(6).orbit(2)
atmos: s("brown").lpf(sine.slow(16).range(200, 900)).gain(.12).attack(2).release(2).pan(sine.slow(8))
```

## Example: wobble drop after a 4-bar build (E minor, 140)

```strudel
setcpm(140/4)
kick: s("bd").bank("RolandTR808").beat("<[0,10] [0,11,14]>", 16).distort("1:.7").afterBars(4)
snare: s("[sd,cp]").bank("RolandTR909").beat("8", 16).distort("1:.6")
  .room(.4).roomsize(4).orbit(3).lastOf(4, x => x.ply("1 1 1 4")).afterBars(4)
hats: s("hh*16").bank("RolandTR909").gain("[.2 .35]*8").sometimesBy(.15, x => x.ply("2 3"))
  .hpf(6000).afterBars(4)
roll: snareRoll(4, "sd").bank("RolandTR909").hpf(rise(4, 200, 3000))
noise: riser(4)
choir: chord("Em9").voicing().s("gm_choir_aahs").attack(.8).release(2).gain(.25)
  .hpf(rise(4, 200, 1500)).room(.6).roomsize(6).orbit(2).forBars(4)
sub: note("<e1 e1 e1 [f1 e1]>").s("sine").struct("x@3 ~ x@4 ~@2 x@4 ~@2").gain(.95).afterBars(4)
wobble: note("<e2 e2 e2 [f2 e2]>").s("supersaw").unison(3).detune(.2)
  .struct("x@3 ~ x@4 ~@2 x@4 ~@2")
  .lpf(500).lpsync("<4 8 [6 12] [16 4]>").lpdepth(.9).lpq(8).ftype("ladder")
  .distort("3:.4").hpf(160).gain(.35).afterBars(4)
growl: note("e3").s("sawtooth").struct("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ x x x x").fm(3).fmh("<1.5 2.01>")
  .vowel("<o a e i>*4").lpf(1800).distort("2:.5").gain(.25).mask("<1 0>").afterBars(4)
```

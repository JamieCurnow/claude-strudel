# Ambient / downtempo / lofi

## Tempo

- Ambient 60-80 (tempo is just a grid; parts move in 2-8 bar spans), downtempo/trip-hop 80-95, lofi hip-hop 72-90. `setcpm(80/4)`.
- Slow things down with `/2`, `/4` in mini-notation or `.slow(2)` instead of dropping the tempo below 60.

## Key / harmony habits

- Major 7 / minor 9 / add9 colours, lydian (`D:lydian`, the #4) and dorian (`A:dorian`) for float. Pentatonic (`C:major:pentatonic`, `A:minor:pentatonic`) for random melodies that cannot clash.
- Lofi: jazzy ii-V-I and descending 7ths: `F^7 - Em7 - Dm7 - C^7`, `Dm9 - G13 - C^9 - A7`, `Ebm9 - Ab9 - Db^7`. One chord per bar.
- Ambient: one or two chords for 8+ bars (`D^9 - E9` = lydian I - II, `C^7#11`, `Am11 - F^9`), or drones on the root + fifth.
- Random notes: always through `.scale()` so they stay in key: `n(irand(8).seg(4)).scale("D4:lydian")`. `.ribbon(offset, cycles)` loops a stretch of randomness into a repeating motif.

## Drums

- Ambient: none, or a soft pulse (`s("bd:3").struct("x ~ ~ ~ ~ ~ ~ ~").lpf(400)`, `rim`, `shaker_small`, `woodblock`, `tom_mallet`).
- Lofi/boom bap: kick on 1 and the "and of 3" (+ ghost), snare on 2 and 4, lazy swing `.swingBy(1/5, 8)` to `1/3`. Kits: `AkaiMPC60`, `LinnDrum`, `RolandTR808`, uzu default.
- Dust it: `.lpf(3500-5000)`, `.crush(8-10)` on drums, slight `.speed(.9)` for dusty pitched-down hits, `s("crackle*8").density(.05)` vinyl bed.
- Trip-hop: `breaks125` is two one-bar loops at 125 BPM; `s("breaks125:1").fit()` at 88 BPM plays them slower and lower (very trip-hop). `.splice(8, "0 1 2 3 4 5 6 7")` lets you rearrange the 8ths.

## Bass

- Ambient: sub drone `note("d2").s("sine").attack(2).release(4)` changing every 4-8 bars, or nothing.
- Lofi: round `gm_acoustic_bass`/`gm_electric_bass_finger` or `triangle` + `.lpf(500)`, roots with walking passing notes on the last 8th.

## Textures / leads

- Pads: `gm_pad_warm`, `gm_pad_new_age`, `gm_pad_halo`, `gm_string_ensemble_2`, `gm_choir_aahs`, `pad:1` (angel pads), `padlong`. Long `attack(1-3)`/`release(3-6)`.
- Bells/plinks: `gm_celesta`, `gm_vibraphone`, `gm_music_box`, `kalimba`, `glockenspiel`, `vibraphone_soft`, `marimba`, `steinway`/`piano`. Sparse with `.mask(...)`/`.struct(...)` (or `.degradeBy(.4)` on non-random lines), wide with `.jux(rev)` or `.pan(rand)`.
- Lofi keys: `gm_epiano1` with `.lpf(2500)`, slight `.vib(4).vibmod(.08)` for tape wobble, `.crush(10)`.
- Noise textures: `s("pink").lpf(sine.slow(16).range(300, 1500))` as wind/ocean, `oceandrum`, `gm_seashore`, `gm_fx_atmosphere`, `wind`, `birds`.
- Space: `.room(.7-.9).roomsize(6-10)` on ONE shared orbit for all reverb-heavy parts; delays `.delay(.4).delaysync(3/8).delayfeedback(.6)`.
- Slow movement: `perlin.range(...)`, `sine.slow(16)`, `.lpf(...)`, `.pan(sine.slow(8))`. Signals are sampled at note starts, so long notes keep their first value.

## Arrangement

- Ambient: layers fade in one by one (`afterBars`, `gain(rise(8))`), 16-32 bar sections, almost no hard cuts.
- Lofi: 4- or 8-bar loop, intro with filtered keys + crackle, drums in after 4-8 bars, a "tape stop" or drum dropout every 16.
- Downtempo builds are gentle: open a filter over 16 bars rather than risers and rolls.

## Pitfalls

- Every part on the same reverb orbit at room 1 = wash with no front. Keep drums/bass dry.
- Low-end mud from pads: `.hpf(150-250)` on pads.
- Random melodies without `.scale()`. Busy hi-hats. Bright, unfiltered drums in lofi.
- `n(irand(8)).degradeBy(.5)` keeps only the HIGH notes: degradeBy/sometimesBy read the same random stream as irand at the same moment. Thin random lines with `.mask("...")`/`.struct("...")` instead.
- Ambient does not mean empty: keep 2-4 slowly moving layers plus one sparse foreground voice.

## Example: ambient drift (D lydian, 72)

```strudel
setcpm(72/4)
drone: note("<[d2,a2] [d2,a2] [b1,f#2] [e2,b2]>/2").s("sine").attack(2).release(4).gain(.35)
pad: chord("<D^9 D^9 Bm11 E9>/2").voicing().s("gm_pad_warm")
  .attack(2).release(5).gain(.3).hpf(200).room(.8).roomsize(8).orbit(2)
bells: n(irand(8).seg(8)).scale("D5:lydian").ribbon(3, 2).s("gm_celesta")
  .mask("<[1 0 0 1 0 1 0 0] [0 1 0 0 1 0 0 1]>").gain(.3).jux(rev).delay(.45).delaysync(3/8).delayfeedback(.6).room(.6).orbit(2)
air: s("pink").lpf(sine.slow(16).range(300, 1400)).gain(.08).attack(2).release(2).pan(sine.slow(8))
pulse: s("tom_mallet:2").struct("x ~ ~ ~ ~ ~ x ~").gain(.25).lpf(800).afterBars(8)
```

## Example: lofi beat (C major, 84)

```strudel
setcpm(84/4)
kick: s("bd").bank("AkaiMPC60").beat("0,7,10", 16).lpf(2500).gain(.9)
snare: s("sd").bank("AkaiMPC60").beat("4,12", 16).lpf(4000).room(.2).gain(.7)
hats: s("hh*8").bank("AkaiMPC60").gain("[.3 .2 .45 .2]*2").swingBy(1/4, 4).lpf(6000)
  .sometimesBy(.1, x => x.ply(2))
dust: s("crackle*8").density(.04).gain(.4).hpf(1000)
bass: note("<[f2@3 c2] [e2@3 b1] [d2@3 a1] [c2@3 g1]>").s("gm_acoustic_bass").lpf(900).gain(.8)
keys: chord("<F^7 Em7 Dm7 C^7>").voicing().s("gm_epiano1").struct("x ~ ~ x ~ ~ x ~")
  .swingBy(1/4, 4).vib(4).vibmod(.08).lpf(2400).crush(10).gain(.5).room(.3).orbit(2)
lead: n("<[4 ~ 2 ~ ~ 1 0 ~] [~ ~ 4 ~ 6 ~ 4 ~] [2 ~ ~ 1 ~ 0 ~ ~] [~ 4 ~ ~ 2 ~ ~ ~]>").scale("C4:major:pentatonic")
  .s("gm_vibraphone").gain(.35).delay(.3).delaysync(3/8).room(.4).orbit(2).afterBars(4)
```

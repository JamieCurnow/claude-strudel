# Transitions and DJ moves (any genre)

Every program lands on a future bar boundary; the bar it lands on is bar 0 for `rise`, `fall`, `afterBars`, `forBars`, `betweenBars`, `riser`, `snareRoll` and `moveBars`. So a whole build-and-drop is ONE program: write the drop parts with `.afterBars(8)` and the build parts with `.forBars(8)`. After it lands the program keeps playing; the helpers just hold their end values.

## Rules of thumb

- Phrase lengths: moves last 4, 8 or 16 bars and drops land on bar 8 or 16. "Drop in 8 bars" = `.afterBars(8)` on kick/bass, build parts `.forBars(8)`.
- Shifting a helper later: `snareRoll(4).late(4).afterBars(4)` = roll in bars 4-8. `.late()` alone leaks (it also plays a straight roll in bars 0-4); always pair it with `.afterBars(n)`.
- Fades: `.velocity(rise(8))` / `.velocity(fall(8))` multiply with the block's own gain. `.gain(rise(...))` REPLACES the block's gain.
- Master sweeps: `all(x => x.djf(...))` (DJ filter: 0-.5 low-pass closing, .5 open, .5-1 high-pass). `all(x => x.lpf(...))` OVERWRITES every block's own lpf (kills acid/reese filters); use it only when no block has its own lpf.
- Continuous signals (`rise`, `sine`, `perlin`) are sampled once per note start. A held pad will not sweep; retrigger it (`.seg(4)`, `.struct(...)`) or sweep the drums/hats instead.
- Key changes go on pitched blocks only: `.add(note(...))` on a drum block gives it a `note` and repitches the samples.
- Tempo lives in `setcpm`, owned by the app: a new program with a new `setcpm` changes tempo when it lands. No gradual ramps; hide jumps in a beatless moment or use the halftime trick (174 halftime feels 87).
- Pull-up / silence bar: `.mask(moveBars.fmap(b => b < 7 || b >= 8))` mutes bar 7 only.

## 1. Build and drop in 8 bars (one program)

```strudel
setcpm(128/4)
kick: s("bd*4").bank("RolandTR909").decay(.4).duckorbit(2).duckdepth(.5).afterBars(8)
clap: s("~ cp ~ cp").bank("RolandTR909").gain(.6).afterBars(8)
hats: s("hh*16").bank("RolandTR909").gain("[.2 .35 .5 .35]*4").hpf(fall(8, 6000, 300)).cut(1)
oh: s("[~ oh]*4").bank("RolandTR909").gain(.4).cut(1).afterBars(4)
bass: note("<a1 a1 c2 g1>").s("sawtooth").struct("~ x ~ x ~ x ~ x").lpf(600).decay(.15).sustain(0)
  .gain(.5).orbit(2).afterBars(8)
stab: chord("Am9").voicing().struct("~ ~ x ~ ~ ~ x ~").s("sawtooth").decay(.2).sustain(0)
  .lpf(rise(8, 400, 6000, 2)).gain(.25).room(.3).orbit(2)
roll: snareRoll(4, "sd").bank("RolandTR909").late(4).afterBars(4).hpf(rise(8, 300, 2000))
noise: riser(8)
crash: s("cr").bank("RolandTR909").struct("x").betweenBars(8, 9).gain(.6)
```

## 2. Breakdown: strip back to pads, drums return after 16

```strudel
setcpm(124/4)
kick: s("bd*4").bank("RolandTR909").mask(moveBars.fmap(b => b < 2 || b >= 16))
hats: s("hh*16").bank("RolandTR909").gain(.3).velocity(fall(8)).forBars(8)
bass: note("<a1 d2>").s("triangle").struct("~ x ~ x ~ x ~ x").lpf(500).gain(.7).forBars(4)
pad: chord("<Am9 D9 Am9 [F^7 G]>").voicing().s("gm_pad_warm")
  .attack(.8).release(2).gain(.35).room(.6).roomsize(6).orbit(2)
keys: chord("<Am9 D9 Am9 [F^7 G]>").voicing().struct("x ~ ~ x ~ ~ x ~").s("gm_epiano1")
  .lpf(rise(16, 500, 6000, 2)).gain(.35).room(.4).orbit(2).afterBars(4)
roll: snareRoll(4, "cp").bank("RolandTR909").late(12).afterBars(12)
```

## 3. Bring layers in one at a time (every 4 bars)

```strudel
setcpm(130/4)
kick: s("bd*4").bank("RolandTR909").decay(.45)
hats: s("[~ hh]*8").bank("RolandTR909").gain(.35).afterBars(4).velocity(rise(8, 0, 1))
clap: s("~ cp ~ cp").bank("RolandTR909").gain(.55).afterBars(8)
bass: note("a1").s("sine").struct("~ x x x ~ x x x ~ x x x ~ x x x").decay(.12).sustain(0)
  .gain(.6).afterBars(12)
lead: n("0 ~ 3 ~ 5 ~ 3 7").scale("A3:minor").s("square").lpf(1800).gain(.2)
  .delay(.4).delaysync(3/16).orbit(3).afterBars(16)
```

## 4. Filter sweep in (whole mix) and high-pass exit

```strudel
setcpm(126/4)
kick: s("bd*4").bank("RolandTR909")
hats: s("[~ oh]*4, hh*16").bank("RolandTR909").gain(.35).cut(1)
bass: note("<c2 c2 ab1 bb1>").s("sawtooth").struct("~ x ~ x ~ x ~ x").decay(.15).sustain(0).gain(.45)
chords: chord("<Cm9 Cm9 Ab^7 Bb>").voicing().struct("~ x ~ ~ x ~ ~ x").s("gm_epiano1").gain(.4)
all(x => x.djf(rise(16, .12, .5, 2)))
```

For the exit, swap the last line for `all(x => x.djf(rise(8, .5, .85)))` (high-pass thins everything out) and add `.forBars(8)` to the kick.

## 5. Half-time switch after 8 bars (same tempo)

```strudel
setcpm(174/4)
kick: s("bd").bank("RolandTR909").beat("0,10", 16).forBars(8)
snare: s("sd").bank("RolandTR909").beat("4,12", 16).forBars(8)
kickhalf: s("bd").bank("RolandTR808").beat("0,11,14", 16).afterBars(8)
snarehalf: s("[sd,cp]").bank("RolandTR909").beat("8", 16).room(.35).orbit(3).afterBars(8)
hats: s("hh*16").gain("[.2 .4]*8").hpf(5000)
sub: note("<f1 f1 db2 c2>").s("sine").struct("x@3 x@3 x@2").forBars(8)
subhalf: note("<f1 db2>").s("sine").struct("x@6 ~ x@5 ~@4").afterBars(8)
```

## 6. Key change up a whole tone at bar 8 (pitched blocks only)

```strudel
setcpm(122/4)
kick: s("bd*4").bank("RolandTR909")
hats: s("[~ oh]*4").bank("RolandTR909").gain(.35)
bass: note("<a1 a1 d2 e2>").s("triangle").struct("~ x ~ x ~ x ~ x").lpf(600)
  .add(note(moveBars.fmap(b => b < 8 ? 0 : 2)))
chords: chord("<Am9 Am9 Dm9 E7>").voicing().struct("~ ~ x ~ ~ x ~ ~").s("gm_epiano1").gain(.4)
  .add(note(moveBars.fmap(b => b < 8 ? 0 : 2)))
roll: snareRoll(2, "cp").bank("RolandTR909").late(6).afterBars(6)
```

## 7. Tempo change via a beatless bridge (124 house -> 174 DnB)

```strudel
setcpm(174/4)
pad: chord("<Fm9 Db^7>/2").voicing().s("gm_string_ensemble_1").attack(1).release(2).gain(.3).room(.6).orbit(2)
vox: s("rave:0").struct("x").betweenBars(3, 4).gain(.6).delay(.5).delaysync(3/8).delayfeedback(.6).orbit(3)
kick: s("bd").bank("RolandTR909").beat("0,10", 16).afterBars(4)
snare: s("sd").bank("RolandTR909").beat("8", 16).betweenBars(4, 8)
snare2: s("sd").bank("RolandTR909").beat("4,12", 16).afterBars(8)
hats: s("hh*16").gain("[.15 .35]*8").hpf(5000).velocity(rise(4)).afterBars(4)
sub: note("<f1 db2>/2").s("sine").struct("x@3 x@3 x@2").afterBars(8)
```

## 8. Pull-up: one bar of silence before the drop

```strudel
setcpm(170/4)
amen: n("0 3 1 5 2 14 4 13 16 6 11 12 13 5 4 15").s("amencutup").cut(1)
  .mask(moveBars.fmap(b => b < 7 || b >= 8))
sub: note("<a1 a1 f1 g1>").s("sine").struct("x@3 x@3 x@2").afterBars(8)
pad: chord("<Am9 F^7>/2").voicing().s("gm_pad_warm").attack(.5).release(2).gain(.3)
  .room(.5).orbit(2).forBars(7)
vox: s("rave:1").struct("x").betweenBars(7, 8).gain(.7).delay(.4).delaysync(3/16).delayfeedback(.5).orbit(3)
```

## 9. Echo out (end of a section or the set)

```strudel
setcpm(128/4)
kick: s("bd*4").bank("RolandTR909").forBars(2)
hats: s("hh*16").bank("RolandTR909").gain(.3).velocity(fall(4)).forBars(4)
stab: chord("Am9").voicing().struct("~ ~ x ~ ~ ~ ~ ~").s("sawtooth").decay(.2).sustain(0).gain(.3)
  .delay(.7).delaysync(3/16).delayfeedback(.75).room(.5).orbit(2).forBars(1)
pad: chord("Am9").voicing().s("gm_pad_halo").attack(2).release(6).gain(.3).velocity(fall(8)).room(.8).orbit(3).forBars(8)
```

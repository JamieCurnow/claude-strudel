# Jungle (classic 90s / ragga jungle)

## Tempo

- 160-175 BPM, sweet spot 165-170: `setcpm(168/4)`.
- Drums run at full speed, bass and pads move at half speed (an 84-85 BPM reggae feel underneath). That double/half tension is the genre.

## Key / harmony habits

- Minor keys with a dub mindset: A minor, F minor, G minor, D minor. One chord per 2-4 bars. i - VI - VII (Am - F - G) or i - iv (Am - Dm).
- Pads are minor 7/9 colours: `Am9`, `Dm9`, `F^7`, `G`. Major 7 is `^7` (`F^7`); `Fmaj7`, `sus2`, `sus4` silently give no notes (use `sus`, `7sus`).
- Sub notes sit between F1 and E2 (44-82 Hz). Root on the downbeat, movement on the "and of 2" and in bar 4 of the phrase.
- Ragga = reggae/dancehall in the top end: offbeat skank chords, vocal shouts, dub sirens, delay throws.

## Drums

- The break IS the track. Pick one main source:
  - `amencutup`: 32 one-shot amen hits, cut at transients (NOT a 16th grid). Measured map: kicks `0 1 8 11 12 18 24`, snares `2 9 13 20 25 31`, ghost snares `4 6 15 17 22 27 29`, hats `3 5 10 14 16 21 26 28`, long crashy hit `30`. Program your own bar: `n("0 3 1 5 2 14 4 13 ...").s("amencutup").cut(1)`.
  - `breaks165`: one-bar clean break (~169 BPM). `s("breaks165").splice(16, "0 1 2 3 ...")` then rearrange indices; splice keeps it locked to tempo.
  - `breaks` (Switch Angel, `.n(0..4)`): TWO-bar loops at 165. Use `s("breaks/2").n(1).fit()`; `s("breaks").fit()` squeezes 2 bars into 1 (double speed). Chop with `.scrub(irand(16).div(16).seg(8))`.
  - `breaks152` is a long amen (~3 bars), `breaks157` ~1 bar: fine for `.chop(16)` textures, awkward as a straight loop.
  - `jungle` kit one-shots: 0 closed hat, 1 crash, 2-4 hits, 5-6 kick, 7 open hat, 8-9 perc, 10 ride, 11-12 snare.
- Structure comes from the LEFT: `s("amencutup").n("0 1 2")` plays ONE hit per bar. Write `n("...").s("amencutup")` or `s("amencutup*16").n(...)`.
- `.cut(1)` chokes the previous slice (tight, choppy); without it slices ring over each other.
- Edits that sound like jungle: `.lastOf(4, x => x.ply(2))` fill bar, `.sometimesBy(.08, x => x.speed(-1))` reversed hits, `.almostNever(ply(2))` ratchets, `.speed(1.06)` pitched-up amen, alternating bars with `"<[bar A] [bar B]>"`.
- Reinforce with a clean kick on 1 and the "and of 3": `s("jungle:5").beat("0,10", 16)`. Never four-on-the-floor.
- Ride/hats quiet (gain .25-.4), `.hpf(3000)`, slightly panned.

## Bass

- Sub: `s("sine")`, long notes, no reverb/delay/pan. `"triangle"` + `.lpf(250)` reads better on laptops.
- Rolling 3+3+2: `.struct("x@3 x@3 x@2")` or written out `"[a1@3 ~ ~ a1 c2 ~]"` (8 steps).
- Reese: `s("supersaw").unison(3).detune(.25)` around octave 2, `.lpf(500).lpsync(.25).lpdepth(.6)` (slow LFO that moves INSIDE a held note), `.distort("2:.4")`, `.hpf(110)` so it does not fight the sub.
- `jungbass` samples are pitched one-shots with their own root: `:7` is ~A1, `:8`/`:9` ~D2, `:18` ~F1. Played without `note()` they keep that pitch, so pick one matching your root (A minor -> `jungbass:7`).
- Dub sub drops: `.penv(-12).pdecay(.4)` on a sine hit.

## Textures / leads

- Dark pads: `gm_pad_warm`, `gm_string_ensemble_1`, `gm_choir_aahs`, `gm_pad_halo`; `.attack(.6).release(2)`, `.room(.5).roomsize(6)` on their own `.orbit(2)`.
- Ragga top end: `s("rave:1")` (Babylon shout), `s("rave:0")` (are you ready), `stab` (23 hardcore stabs), `hoover` (darkcore), organ skank `gm_drawbar_organ` on offbeats.
- Dub delay throws: `.delay(.5).delaysync(3/16).delayfeedback(.55)` = dotted-8th echo. `delaysync` is in cycles (bars); `delaytime` is seconds.
- Siren: `note("a5").s("square").vib(.5).vibmod(7).lpf(2500)`, short and quiet.

## Arrangement

- Intro 16-32 bars: pads + filtered break (`.hpf(1200)` or `.lpf(700)`), no sub.
- Build 4-8 bars: open the break filter with `rise(8, 600, 12000, 2)`, amen snare roll `snareRoll(4, "amencutup:2")`, vocal shout on the last bar.
- Drop: break + sub land together on bar 1. Often a 1-bar silence ("pull up") before it.
- Rewind: everything `.speed(-1)` for a bar is cheesy but genre-correct; better: drums out for a bar, then drop again.
- Breakdown 8-16 bars: drums + sub out, pad + vox + delay throws, reese filtered down.
- Swap break edits every 4/8 bars; big changes on 16-bar boundaries.

## Pitfalls

- More than one full-volume break = mush. One main break + quiet ghost layer max.
- Reverb on the sub or kick muddies everything; keep reverb parts on their own orbit.
- Synth bass two octaves too low (a0, f0) is inaudible; stay F1-E2 for subs, octave 2-3 for reese.
- Busy pads fight the break: slow chords, long attack, `.lpf(2500)`.

## Example: starting groove (A minor, 168)

```strudel
setcpm(168/4)
amen: n("<[0 3 1 5 2 14 4 13 16 6 11 12 13 5 4 15] [0 3 1 5 2 14 4 13 16 6 11 12 13 15 [2 2] 20]>")
  .s("amencutup").cut(1).speed(1.06).gain(.9)
  .sometimesBy(.08, x => x.speed(-1))
  .lastOf(8, x => x.ply(2))
kick: s("jungle:5").beat("0,10", 16).gain(.8)
ride: s("jungle:10").struct("~ x ~ x ~ x ~ x").gain(.28).hpf(3500).pan(.65)
sub: note("<[a1@3 ~ ~ a1 c2 ~]!3 [a1@3 ~ ~ a1 e2 d2] [f1@3 ~ ~ f1 a1 ~]!2 [g1@3 ~ ~ g1 d2 ~] [g1@3 ~ ~ e1 g1 b1]>")
  .s("sine").gain(.95)
pad: chord("<Am9!4 F^7!2 G!2>").voicing().s("gm_pad_warm")
  .attack(.6).release(2).gain(.35).lpf(2200).room(.5).roomsize(6).orbit(2)
all(x => x.djf(rise(8, .2, .5)))
```

## Example: peak / drop (A minor, 170)

```strudel
setcpm(170/4)
brk: s("breaks165").splice(16, "<[0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15] [0 1 2 3 4 5 [6 6] 7 0 1 10 11 12 13 [14 14] 15] [0 1 2 3 4 ~ 6 7 8 9 10 11 [12 12] 13 14 15] [0 1 4 3 4 5 12 13 8 9 [10 10] 11 [12 12 12 12] [13 13] 14 [15 15]]>")
  .gain(.95).almostNever(x => x.speed(-1))
ghosts: n("~ 3 ~ 5 ~ 14 ~ 16 ~ 21 ~ 26 ~ 28 [~ 4] 6").s("amencutup").cut(2).gain(.45).hpf(600).pan(.4)
kick: s("jungle:5").beat("0,10", 16).gain(.8)
sub: note("<a1!4 f1!2 g1 [g1 e1]>").s("sine").struct("x@3 x@3 x@2").gain(.95)
reese: note("<a2!4 f2!2 g2 [g2 e2]>").s("supersaw").unison(3).detune(.25)
  .lpf(550).lpsync(.25).lpdepth(.6).lpq(3).distort("2:.4").hpf(110).gain(.3)
skank: chord("<Am!4 F!2 G!2>").voicing().struct("~ x ~ x").s("gm_drawbar_organ")
  .decay(.12).sustain(0).gain(.35).hpf(400).delay(.35).delaysync(3/16).delayfeedback(.45).orbit(3)
vox: s("rave:1").struct("<x ~ ~ ~ ~ ~ ~ ~>").gain(.7).delay(.5).delaysync(3/16).delayfeedback(.55).orbit(3)
pad: chord("<Am9!4 F^7!2 G!2>").voicing().s("gm_string_ensemble_1")
  .attack(.8).release(2).gain(.25).lpf(1800).room(.6).roomsize(7).orbit(2)
```

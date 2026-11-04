# Build the Perfect College Applicant — Episode 1 (AppGap social series)

Cinematic vertical (9:16, **1080×1920, 30 fps, 36 s**) social video for TikTok / Reels / Shorts.
Episode 1 of an **interactive series**: the audience votes in the comments (A / B / C) to choose the
fictional applicant's first big extracurricular. Future episodes reveal the winning choice and pose the next decision.

The applicant is **entirely fictional** — "Profile #001", unnamed, no inflated achievements, most of the
profile deliberately left undecided. No option is framed as "better" for admissions. AppGap appears only as
subtle branding on the final frame.

## Files
- **`assets/ep1_silent.mp4`** — the finished rendered visuals, **captions burned in**, phone-readable, inside
  platform-safe margins. No audio track yet (see "Add the narration" below). This is a real, playable video.
- **`assets/ep1_subtitles.srt`** — caption track (upload separately to YouTube/IG if you want selectable captions).
- **`scene.html`** — the animation source. Every visual is a pure function of time via `window.__render(t)`,
  so it renders deterministically / frame-accurately.
- **`render.js`** — headless-Chrome frame capture (1080 frames at 1080×1920) via Playwright + system Chrome.

## Narration
**`AppGap_BuildTheApplicant_EP1_VO.mp4`** is the finished video with voiceover muxed in.

The voice is a **natural Microsoft neural voice** (`en-US-GuyNeural`, rate +12%), generated with `msedge-tts`
(installed in `scratchpad/tts`). The narration was produced as 12 per-cue clips and placed on the timeline
anchored to the caption cue times (sequentially, no overlap), so the voice tracks the on-screen captions —
peak drift ~1.4s on the tightest option lines, the ending line on-beat.

### Swap the voice
- **Different neural voice:** re-run `node scratchpad/tts/gen_clips.js <outdir> <voiceId> "+12%"` with any
  `en-US-*Neural` id, then re-run the placement + mux. (This package makes a network call, so it needs the
  sandbox allowance.)
- **ElevenLabs ("Tyler" take, model `eleven_v4`):** it's on your ElevenLabs flow but the *restricted*
  connector in this session can't export the file. Download the mp3 from the flow and it can be sliced to the
  same cue times and muxed.

### Re-sync captions exactly (optional)
Caption cue times live in `scene.html` (`CAPS`). To make them word-exact to whatever voice you pick, transcribe
the final narration for word timings, update `CAPS`, and re-render (the full render is ~12 min).

### Optional: add a licensed music bed
```bash
ffmpeg -y -i assets/ep1_silent.mp4 -i assets/ep1_narration.mp3 -i YOUR_TRACK.mp3 \
  -filter_complex "[1:a]volume=1.0[vo];[2:a]volume=0.16[bed];[vo][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest \
  AppGap_BuildTheApplicant_EP1_VO-music.mp4
```

## Re-render the visuals
```bash
node render.js full ./frames                                   # writes 1080 PNGs (uses system Chrome)
ffmpeg -y -framerate 30 -i frames/f%05d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart assets/ep1_silent.mp4
```
Probe key frames without a full render: `node render.js probe ./probe "1.5,5,12,18,22,26,33"`.

## Scene timeline (seconds)
1. **0–4 Hook** — blank Profile #001 materializes; title "BUILD THE PERFECT COLLEGE APPLICANT".
2. **4–10 Challenge** — profile opens to a dashboard of empty slots (Extracurriculars / Awards / Projects / Essays) + one "GRADES: SOLID" chip.
3. **10–23 First decision** — three option cards fly in; A Start a club · B Build an app · C Launch a community project; each highlights as it's named.
4. **23–30 Vote** — options line up centered, A/B/C letters pulse, "Comment A, B, or C."
5. **30–36 Ending** — unfinished Profile #001 "to be continued", faint A/B/C, subtle AppGap corner mark.

## Continuity for Episode 2
Keep the same Profile #001 identity, card design, palette (near-black + electric blue `#2e6bff`), and caption style.
Episode 2 should reveal the **real** winning option from the comments (do not invent results), fill the
Extracurricular slot, then pose the next decision (e.g. a summer project, or how to deepen the chosen activity).

## Known limitations
- **Music & SFX are not AI-generated** — the Motion and restricted-ElevenLabs connectors in this session can't
  make them. Add a licensed track with the command above.
- **The Motion connector route was blocked on insufficient credits**, so the visuals were produced with the
  local HTML + Playwright + ffmpeg pipeline instead.
- Narration must be downloaded manually (restricted connector can't export the audio file).

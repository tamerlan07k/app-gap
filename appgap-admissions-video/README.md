# Would You Admit This Student? — AppGap social video

Cinematic vertical (9:16, 1080×1920, 30 fps, 38 s) social video for TikTok / Reels / Shorts.
The viewer plays an admissions officer evaluating a **fully fictional, invented applicant** and decides
Admit vs Reject. No real student, no real university, no admission verdict is claimed — it's a comment-bait debate prompt.

## Final videos
- **`AppGap_WouldYouAdmit_VO.mp4`** — narration only (clean, recommended default).
- **`AppGap_WouldYouAdmit_VO-music.mp4`** — narration + a subtle ambient tension bed.

Both have burned-in, phone-readable captions synced to the narration, kept inside platform-safe margins.

## Editable assets (`/assets`)
- `narration.mp3` — ElevenLabs voiceover ("Atlas — Deep, Gravelly Narrator", model eleven_v4), 37.0 s.
- `subtitles.srt` — caption track built from real word-level timestamps (upload separately to YouTube/IG if you want selectable captions).
- `music_bed.wav` — synthesized ambient bed (see limitation below).
- `silent.mp4` — the rendered visuals with **no audio** (drop in your own music/VO here).
- `../scene.html` — the actual animation source. Every visual is a pure function of time via `window.__render(t)`,
  so it renders deterministically / frame-accurately.

## How it was made
1. Voiceover + transcription → ElevenLabs connector.
2. Captions → generated from the transcript's per-word timings.
3. Visuals → `scene.html` rendered frame-by-frame (1140 frames) headless via Playwright + Chrome.
4. Composite → ffmpeg encodes frames to H.264 and muxes the narration (and optional bed).

### Re-render
```bash
# frames (from scene.html)
node render.js full ./frames          # see scratchpad render.js; uses system Chrome
# encode + mux
ffmpeg -y -framerate 30 -i frames/f%05d.png -c:v libx264 -pix_fmt yuv420p -crf 18 assets/silent.mp4
ffmpeg -y -i assets/silent.mp4 -i assets/narration.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k AppGap_WouldYouAdmit_VO.mp4
```

### Swap in a licensed music track
```bash
ffmpeg -y -i assets/silent.mp4 -i assets/narration.mp3 -i YOUR_TRACK.mp3 \
  -filter_complex "[1:a]volume=1.0[vo];[2:a]volume=0.18[bed];[vo][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest AppGap_WouldYouAdmit_music.mp4
```

## Fictional applicant (invented — do not treat as real)
GPA 3.3 · SAT 1280 · Intended major Environmental Science · neighborhood food-waste initiative ·
local food-donation guide · 15 hrs/week grocery job · grades dipped sophomore year then improved ·
no major awards · no prestigious internship.

## Known limitations
- **Music & SFX are not AI-generated.** The Motion connector and the (restricted) ElevenLabs connector in this
  session cannot generate music or sound effects. `music_bed.wav` is a simple synthesized ambient drone used as the
  best feasible alternative — not a licensed track. For a richer soundtrack, add a real track with the command above.
- **The Motion connector route was blocked on insufficient credits**, so the visuals were produced with the
  local HTML + Playwright + ffmpeg pipeline instead.

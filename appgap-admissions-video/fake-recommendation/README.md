# Can You Spot the Fake College Recommendation? — AppGap social video

Cinematic vertical (9:16, **1080×1920, 30 fps, 34 s**) "spot-the-fake" challenge for TikTok / Reels / Shorts.
The viewer is shown three college-planning recommendations and has to find the one that is **unsupported** —
i.e. states a conclusion its reasoning doesn't justify. The payoff teaches one idea: **interest ≠ eligibility**,
and that a good (AI) recommendation shouldn't present an assumption as a fact. AppGap appears only on the final card.

Nothing is fabricated: the three recommendations are generic, illustrative college-planning advice (no real program,
no real student). Option C is "fake" because its *logic* is broken, not because it imitates any real product output.
No AppGap feature or screenshot is invented.

## Final video
- **`../AppGap_SpotTheFake_VO.mp4`** — the finished video with the neural voiceover muxed in. (Lives one level up,
  next to the other episodes' finals.)

## Files (`/assets`)
- `narration.mp3` / `narration.wav` — the full 34 s narration track (10 cues placed on the timeline, no overlap).
- `subtitles.srt` — caption track from the narration cue times (upload separately for selectable captions).
- `timeline.json` — measured cue start/end used to drive the animation; single source of truth for sync.
- `silent.mp4` — rendered visuals, **no audio** (drop in your own music/VO here).
- `scene.html` — the animation source. Every visual is a pure function of time via `window.__render(t)`,
  so it renders deterministically / frame-accurately.
- `render.js` — headless-Chrome frame capture (1020 frames at 1080×1920) via Playwright + system Chrome.

## Narration
The voice is a **natural Microsoft neural voice** (`en-US-AndrewNeural`, warm conversational young-adult male,
rate +8%, generated at 96 kbit for fewer artifacts) — a "creator" delivery, not an ad read — via `msedge-tts`.
Produced as 10 short per-cue clips, silence-trimmed, then placed at computed offsets so the voice tracks the
on-screen beats exactly (each option card highlights as it's spoken; Option C flips to red on "It's C."). The
mixed track gets a light production pass to shed the sterile-TTS edge — rumble cut, +1.6 dB low-mid warmth,
−2.6 dB de-harsh around 4.6 kHz, gentle VO compression, and −16 LUFS loudness (see `build_narration.js`).
This package makes a network call, so it needs the sandbox allowance.

### Swap the voice
Re-generate the clips with any `en-US-*Neural` id, then rebuild the track and re-mux
(scripts in the session scratchpad: `gen_clips.js`, `build_narration.js`):
```bash
node gen_clips.js ./clips <voiceId> 1.10      # e.g. en-US-AndrewNeural (warm male), en-US-EmmaNeural, en-US-GuyNeural
# (silence-trim each clip into ./clips_trim, then:)
node build_narration.js <assetsDir>            # rewrites narration.wav/.mp3 + timeline.json
```
If you change cue wording/length, `timeline.json` changes, so re-render the visuals (below) to stay in sync.

## Re-render the visuals
```bash
node render.js full ./frames                                   # writes 1020 PNGs (uses system Chrome)
ffmpeg -y -framerate 30 -i frames/f%05d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart assets/silent.mp4
ffmpeg -y -i assets/silent.mp4 -i assets/narration.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest ../AppGap_SpotTheFake_VO.mp4
```
Probe key frames without a full render: `node render.js probe ./probe "1.4,6,11,16,19.6,22,24.5,31.3"`.

### Optional: add a licensed music bed
```bash
ffmpeg -y -i assets/silent.mp4 -i assets/narration.wav -i YOUR_TRACK.mp3 \
  -filter_complex "[1:a]volume=1.0[vo];[2:a]volume=0.16[bed];[vo][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest ../AppGap_SpotTheFake_VO-music.mp4
```

## Scene timeline (seconds)
1. **0–4.6 Hook** — "CAN YOU SPOT THE **FAKE** COLLEGE RECOMMENDATION?" (glitch on FAKE) + "3 AI recommendations · 1 is unsupported".
2. **4.6–18 Options** — cards A, B, C fly in one at a time; each highlights as it's narrated. C hides a subtle red "because" tell.
3. **18–21.7 Interaction** — cards dim, "WHICH ONE IS UNSUPPORTED?" + a 3-2-1 countdown ring.
4. **21.7–29.4 Reveal** — on "It's C.", card C snaps red with a ⚠ flag + "✕ Assumes eligibility"; A/B dim with "✓" chips; "ANSWER: C" + "Interest ≠ Eligibility" stamp.
5. **29.7–34 Branding** — "Better college planning starts with better recommendations." → **App·Gap** · "Reasoning you can check".

## Known limitations
- **Music & SFX are not AI-generated** — the Motion and restricted-ElevenLabs connectors in this session can't make
  them. Add a licensed track with the command above.
- The visuals were produced with the local HTML + Playwright + ffmpeg pipeline (Motion connector route was out of credits).
- Narration must be downloaded with the video; the restricted ElevenLabs connector can't export audio files.

# This College Essay Says Absolutely Nothing — AppGap social video

Cinematic vertical (9:16, **1080×1920, 30 fps, 35 s**) essay-teardown for TikTok / Reels / Shorts.
The hook: a polished essay sentence can sound impressive and still tell you nothing about the student.
We show a deliberately generic sentence, hollow out its buzzwords, rebuild it into a **specific** rewrite,
then reveal the **real AppGap Personal Statement workspace** scoring that rewrite. Payoff idea: *specific beats
impressive* — not a formula for admission, just stronger, more revealing writing.

Nothing is fabricated. The two essays are illustrative examples (no real student). Scene 4 is the **real product**:
a throwaway "Explaining Algebra" draft was created in the live app, analyzed by the real GapCoach feature, and
screenshotted — then the draft was deleted from the account. No UI or feedback was invented.

## Final video
- **`../AppGap_EssayNothing_VO.mp4`** — finished video with the neural voiceover muxed in (lives one level up with the other episodes).

## Files (`/assets`)
- `narration.mp3` / `narration.wav` — the 35 s narration track (12 cues placed on the timeline, no overlap).
- `subtitles.srt` — caption track from the narration cue times (upload separately for selectable captions).
- `timeline.json` — measured cue start/end used to drive the animation; single source of truth for sync.
- `silent.mp4` — rendered visuals, **no audio** (drop in your own music/VO here).
- `scene.html` — animation source. Every visual is a pure function of time via `window.__render(t)` (deterministic/frame-accurate).
- `render.js` — headless-Chrome frame capture (1050 frames at 1080×1920) via Playwright + system Chrome.
- `shots/ps_editor.png`, `shots/ps_feedback.png` — the real workspace captures used in Scene 4 (app header with the account name cropped off the feedback shot).

## Narration (your stated #1 priority)
Voice is a **natural Edge neural young-adult male** (`en-US-AndrewNeural`, rate 1.06, 96 kbit for fewer artifacts)
— a creator-to-a-friend read, not an ad announcer — via `msedge-tts`. Produced as 12 short per-cue clips,
silence-trimmed, placed at computed offsets so the voice tracks the on-screen beats. The mix gets a light
production pass to shed the sterile-TTS edge: rumble cut, +1.6 dB low-mid warmth, −2.6 dB de-harsh ~4.6 kHz,
gentle VO compression, −16 LUFS loudness, safety limiter (see `build_narration.js`). This package makes a
network call, so it needs the sandbox allowance.

**ElevenLabs alternative:** a "Tyler – Natural American Narrator" (`eleven_v4`) take was generated for audition in
the ElevenLabs panel. The *restricted* connector in this session can't export the audio file — to use it, download
the mp3 from the flow, then slice it to the `timeline.json` cue times and re-mux (same step as the music bed below).

### Swap the voice
Regenerate the clips with any `en-US-*Neural` id, then rebuild the track and re-mux:
```bash
node gen_clips.js ./clips <voiceId> 1.06       # e.g. en-US-AndrewNeural (warm male), en-US-BrianNeural, en-US-GuyNeural
# (silence-trim each clip into ./clips_trim, then:)
node build_narration.js ./assets               # rewrites narration.wav/.mp3 + timeline.json
```
If you change cue wording/length, `timeline.json` changes, so re-render the visuals (below) to stay in sync.

## Re-render the visuals
```bash
node render.js full ./frames                                   # writes 1050 PNGs (uses system Chrome)
ffmpeg -y -framerate 30 -i frames/f%05d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart assets/silent.mp4
ffmpeg -y -i assets/silent.mp4 -i assets/narration.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest ../AppGap_EssayNothing_VO.mp4
```
Probe key frames without a full render: `node render.js probe ./probe "3,8,15,23,26,28,30,33"`.
Scene 4 uses the real captures in `shots/`; to recapture, sign into the app, create a draft, analyze, screenshot the
editor and the Coach-feedback panel, and (optionally) re-tune the `fbWrap` zoom origin / `#hiRing` box in `scene.html`.

### Optional: add a licensed music bed
```bash
ffmpeg -y -i assets/silent.mp4 -i assets/narration.wav -i YOUR_TRACK.mp3 \
  -filter_complex "[1:a]volume=1.0[vo];[2:a]volume=0.16[bed];[vo][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest ../AppGap_EssayNothing_VO-music.mp4
```

## Scene timeline (seconds)
1. **0–4.5 Hook** — a 3D essay sheet rotates; cursor types "THIS COLLEGE ESSAY SAYS…", then "ABSOLUTELY NOTHING." slams in (amber).
2. **4.5–12.5 Problem** — the generic draft; buzzwords (passionate / helping others / perseverance / personal growth) bloom then fade, visibly hollowing the sentence. "What did we actually learn?"
3. **12.5–24.3 Transformation** — the card shatters and reassembles into a specific rewrite (tutoring a neighbor in algebra); concrete details light up green; chips: *what they did / who they helped / what they learned*; "Specific beats impressive."
4. **24.3–31 Product** — the real AppGap Personal Statement workspace: the essay in the editor, then the real Coach-feedback cards; zoom lands a highlight ring on the **Specificity** card.
5. **31–35 Branding** — AppGap logo (navy **A** + teal dumbbell in a white app tile) + wordmark; "MAKE EVERY WORD MEAN SOMETHING."; "Build a stronger application · Understand your gaps."

## Palette / continuity
Teal + deep navy, aligned to the real product brand so Scene 4 blends in (earlier episodes used electric blue).
Logo rebuilt as crisp inline SVG from the supplied mark.

## Known limitations
- **Music & SFX are not AI-generated** — the Motion and restricted-ElevenLabs connectors in this session can't make them. Add a licensed track with the command above.
- Visuals produced with the local HTML + Playwright + ffmpeg pipeline.
- The ElevenLabs take can't be exported by the restricted connector; download it from the flow to use it.

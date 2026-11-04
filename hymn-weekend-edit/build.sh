#!/usr/bin/env bash
# Assemble 2x-supersampled PNG frames -> clean premium 1080x1920 @ 60fps MP4,
# then mux the audio excerpt.
# Pipeline: lanczos downscale (anti-alias) -> gentle grade -> soft bloom ->
# light chromatic aberration -> unsharp (crisp text) -> vignette -> fine grain
# -> fade in/out. Tuned for "super clean" rather than heavy/muddy.
set -e
cd "$(dirname "$0")"

FRAMES="C:/Users/tamer/AppData/Local/Temp/claude/C--Users-tamer-Downloads-Code-app-gap/b9428cd6-2f42-4eea-8d99-6dfdaef3a7d5/scratchpad/framesHD"
AUDIO="excerpt.m4a"
SILENT="silent.mp4"
FINAL="hymn-weekend-slowed-final.mp4"

ffmpeg -y -framerate 60 -i "$FRAMES/f%05d.png" \
 -filter_complex "\
   [0:v]scale=1080:1920:flags=lanczos,format=gbrp,eq=contrast=1.07:saturation=1.13:gamma=0.985[base];\
   [base]split[b1][b2];\
   [b2]gblur=sigma=14[blur];\
   [b1][blur]blend=all_mode=screen:all_opacity=0.40[bloom];\
   [bloom]rgbashift=rh=-1:bh=1:gv=1,\
     unsharp=5:5:0.55:5:5:0.0,\
     vignette=angle=PI/4.4,\
     noise=alls=2:allf=t,\
     format=yuv420p,\
     fade=t=in:st=0:d=0.5,fade=t=out:st=24.2:d=2.8[v]" \
 -map "[v]" -c:v libx264 -crf 18 -maxrate 16M -bufsize 32M -preset slow \
 -pix_fmt yuv420p -movflags +faststart "$SILENT"

if [ -f "$AUDIO" ]; then
  ffmpeg -y -i "$SILENT" -i "$AUDIO" -map 0:v:0 -map 1:a:0 \
    -c:v copy -c:a aac -b:a 192k -shortest "$FINAL"
  echo "wrote $FINAL"
else
  echo "wrote $SILENT (no audio yet)"
fi

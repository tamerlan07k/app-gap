# Landing page media

Real AppGap feature screenshots shown on the landing page, wired into
`src/app/page.tsx` (hero + feature rows). Each is a privacy-safe composite:
the user name is shown as "Student" and the essay text on the Personal
Statement shot is replaced with placeholder "line" bars (no real writing).
Frames render each image whole, at its natural aspect ratio.

## Current files

| File                           | Where it shows            | Size (px)  |
| ------------------------------ | ------------------------- | ---------- |
| `dashboard-v3.png`             | Hero preview              | 1336×901   |
| `appgap-score-v3.png`          | "AppGap Score" row        | 1388×861   |
| `my-colleges-v3.png`           | "My Colleges" row         | 1347×897   |
| `application-writing-v3.png`   | "Application Writing" row | 900×560    |
| `personal-statement-v3.png`    | "Personal Statement" row  | 956×793    |
| `my-roadmap-v3.png`            | "My Roadmap" row          | 1300×880   |

## Replacing a screenshot

Browsers and Next's image optimizer cache by filename, so save a new shot
under a **new filename** (bump to `-v4`) and update the matching `media` entry
in `src/app/page.tsx`, including its real `width`/`height`. `next/image` does
not allow `?query` strings on local images — version via the filename.

import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "~/lib/utils";

export type LandingMedia = {
  /** Path under /public, e.g. "/landing/appgap-score.png". */
  src: string;
  kind?: "image" | "video";
  /** Poster frame for videos. */
  poster?: string;
  /** Intrinsic pixel size — images render at this natural aspect (whole page shown). */
  width?: number;
  height?: number;
};

type AppWindowProps = {
  /** Text shown in the faux browser address bar. */
  url?: string;
  /** Real media to display. When omitted, a styled placeholder is shown. */
  media?: LandingMedia;
  /** Placeholder caption (feature name) — shown until real media is wired in. */
  label: string;
  icon: LucideIcon;
  className?: string;
};

/**
 * A faux browser/app window frame used to showcase product screenshots and
 * clips on the landing page — mirrors the framed previews on polyprep.co.
 * Drop real media into /public/landing and pass it via `media`; until then a
 * tasteful teal placeholder stands in.
 */
export function AppWindow({
  url = "appgap.co",
  media,
  label,
  icon: Icon,
  className,
}: AppWindowProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl shadow-brand-teal/5 ring-1 ring-black/[0.02]",
        className,
      )}
    >
      {/* Faux browser chrome */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/50 px-4 py-3">
        <span className="size-2.5 rounded-full bg-destructive/40" />
        <span className="size-2.5 rounded-full bg-amber-400/50" />
        <span className="size-2.5 rounded-full bg-emerald-400/50" />
        <span className="ml-3 hidden flex-1 rounded-md bg-background/70 px-3 py-1 text-xs text-muted-foreground sm:block">
          {url}
        </span>
      </div>

      {/* Media / placeholder */}
      {media?.kind !== "video" && media?.src ? (
        // Static product screenshot — shown whole, at its natural aspect ratio.
        <Image
          src={media.src}
          alt={label}
          width={media.width ?? 1300}
          height={media.height ?? 813}
          sizes="(max-width: 1024px) 100vw, 640px"
          className="block h-auto w-full bg-brand-teal-wash"
        />
      ) : (
        <div className="relative aspect-[16/10] w-full bg-brand-teal-wash">
          {media?.kind === "video" && media.src ? (
            <video
              className="size-full object-cover"
              src={media.src}
              poster={media.poster}
              autoPlay
              muted
              loop
              playsInline
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-teal-wash to-brand-teal/[0.08]">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-teal/10 ring-1 ring-brand-teal/20">
                <Icon className="size-7 text-brand-teal" />
              </div>
              <p className="font-display text-base font-bold tracking-tight text-foreground/80">
                {label}
              </p>
              <span className="rounded-full border border-brand-teal/20 bg-background/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-teal">
                Preview
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { BlurFade } from "~/components/ui/blur-fade";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { AppWindow, type LandingMedia } from "./app-window";

export type FeatureRowProps = {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  bullets: string[];
  cta: { label: string; href: string };
  icon: LucideIcon;
  url?: string;
  media?: LandingMedia;
  /** When true, media sits on the left and copy on the right. */
  reverse?: boolean;
};

export function FeatureRow({
  eyebrow,
  title,
  description,
  bullets,
  cta,
  icon,
  url,
  media,
  reverse = false,
}: FeatureRowProps) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Copy */}
      <div className={cn(reverse && "lg:order-2")}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
          {eyebrow}
        </p>
        <h3 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
          {title}
        </h3>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
        <ul className="mt-7 space-y-3.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-teal/15">
                <Check className="size-3 text-brand-teal" strokeWidth={3} />
              </span>
              <span className="text-base leading-relaxed text-foreground/80">
                {b}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Button size="lg" asChild>
            <Link href={cta.href}>
              {cta.label}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>

      {/* Media */}
      <BlurFade inView delay={0.1} className={cn(reverse && "lg:order-1")}>
        <AppWindow url={url} media={media} label={eyebrow} icon={icon} />
      </BlurFade>
    </div>
  );
}

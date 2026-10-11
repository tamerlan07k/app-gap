import { ArrowUpRight, Handshake, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partners — AppGap",
  description:
    "Organizations we partner with to help students find real opportunities — and how to partner with AppGap.",
};

// Current partners. Add new entries here as partnerships are formed.
const partners = [
  {
    name: "Atlas of Opportunity",
    href: "https://www.atlasofopportunity.org/?ref=appgap",
    description:
      "Atlas of Opportunity is a free, public directory that helps high school students discover enrichment opportunities — summer programs, competitions, research, fellowships, and more — searchable by grade, location, and academic interest. It's open to everyone with no account or sign-in required, which is why AppGap links students straight into it from their profile: wherever we surface opportunities, you can jump to Atlas's finder already filtered to your grade and intended field.",
  },
];

// Contact details for partnership inquiries.
const CONTACT_EMAIL = "appgap2009@gmail.com";
const CONTACT_PHONE_DISPLAY = "(857) 867-1685";
const CONTACT_PHONE_TEL = "+18578671685";

export default function PartnersPage() {
  return (
    <main className="px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Partnerships
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Our partners</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            AppGap works with organizations that share our goal of helping
            students navigate the college path with real, trustworthy
            information. These are the partners we work with today.
          </p>
        </div>

        {/* Partner cards */}
        <div className="space-y-5">
          {partners.map((partner) => (
            <a
              key={partner.name}
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl border border-border bg-card px-6 py-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">{partner.name}</h2>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-teal" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {partner.description}
              </p>
              <span className="mt-3 inline-block text-xs font-medium text-brand-teal underline-offset-4 group-hover:underline">
                Visit {partner.name}
              </span>
            </a>
          ))}
        </div>

        {/* Become a partner */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-brand-teal/30 bg-brand-teal/[0.04] px-6 py-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-teal/10">
              <Handshake className="size-5 text-brand-teal" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">
                Interested in partnering with AppGap?
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We&apos;re always open to new partnerships with organizations,
                programs, and nonprofits that help students grow. If you run
                something students should know about — or you&apos;d like to
                collaborate — we&apos;d love to hear from you.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-brand-teal/20 pt-5 sm:flex-row sm:gap-8">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-teal/10">
                <Mail className="size-4 text-brand-teal" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Email
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-teal/10">
                <Phone className="size-4 text-brand-teal" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Phone
                </p>
                <a
                  href={`tel:${CONTACT_PHONE_TEL}`}
                  className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {CONTACT_PHONE_DISPLAY}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

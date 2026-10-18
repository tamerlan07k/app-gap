import { Plus } from "lucide-react";

const faqs = [
  {
    q: "What exactly does AppGap do?",
    a: "AppGap analyzes your academics, activities, and awards and shows you where your college application profile is strong and where the real gaps are — with concrete direction on what to work on before you apply.",
  },
  {
    q: "Is AppGap free to try?",
    a: "Yes. You can build your profile and get started for free. Advanced features like the Personal Statement workspace and additional analyses are part of AppGap Pro.",
  },
  {
    q: "Does AppGap guarantee admission or predict decisions?",
    a: "No. AppGap gives you an honest read on where your current profile stands and realistic chances by school — it is not a guarantee of any admissions outcome, and it isn't a substitute for a professional counselor.",
  },
  {
    q: "How are my chances calculated?",
    a: "Chances come from a holistic model that weighs your academics, course rigor, activities, and awards against each school's selectivity — presented as an honest range, not a single inflated number.",
  },
  {
    q: "Can AppGap help with my essays?",
    a: "Yes. AppGap scores your activities and additional-info sections, and the Personal Statement and supplemental-essay workspaces give line-by-line coaching toward stronger drafts.",
  },
];

export function Faq() {
  return (
    <section className="bg-card px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center scroll-reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Everything you need to know about AppGap.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border/70 bg-background px-6 py-5 transition-colors open:bg-brand-teal-wash/60"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold tracking-tight [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus className="size-5 shrink-0 text-brand-teal transition-transform duration-200 group-open:rotate-45" />
              </summary>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

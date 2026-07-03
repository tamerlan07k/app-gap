import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — AppGap",
  description: "How AppGap collects, uses, and protects your information.",
};

const sections = [
  {
    title: "Information We Collect",
    content: [
      {
        subtitle: "Account Information",
        text: "When you sign up, we collect your email address and any display name you choose to provide.",
      },
      {
        subtitle: "Profile & Academic Data",
        text: "AppGap asks you to enter information about your GPA, coursework, test scores, extracurricular activities, and other academic details. This data is stored securely and used solely to generate your personalized guidance.",
      },
      {
        subtitle: "Usage Analytics",
        text: "We collect anonymized data about how you interact with the platform — pages visited, features used, and session duration — to help us improve AppGap over time. This data is never sold.",
      },
    ],
  },
  {
    title: "How We Use Your Information",
    content: [
      {
        subtitle: "Personalized Guidance",
        text: "Your profile data is the foundation of AppGap's recommendations. We use it to generate gap analyses, roadmaps, and actionable steps tailored to your situation.",
      },
      {
        subtitle: "Authentication",
        text: "Your email address is used to identify your account and keep it secure. We do not use it for unsolicited marketing.",
      },
      {
        subtitle: "Platform Improvement",
        text: "Anonymized usage data helps us identify areas where AppGap can be more useful and fix issues faster.",
      },
      {
        subtitle: "Support",
        text: "If you contact us with a question or bug report, we may use the information you share to resolve your issue.",
      },
    ],
  },
  {
    title: "AI Processing",
    content: [
      {
        subtitle: "How AI Is Used",
        text: "AppGap uses trusted third-party AI providers to generate recommendations and analysis based on the data you enter. Your inputs are sent to these providers solely for the purpose of producing the results you requested. We do not permit AI providers to use your data to train their models.",
      },
    ],
  },
  {
    title: "Data Security",
    content: [
      {
        subtitle: "Our Approach",
        text: "We use industry-standard security practices including encrypted connections (HTTPS), secure authentication, and access controls to protect your data. AppGap is built on Supabase, which provides enterprise-grade database security. While no system is perfectly immune to risk, we take the protection of your information seriously.",
      },
    ],
  },
  {
    title: "Your Rights",
    content: [
      {
        subtitle: "Access & Deletion",
        text: "You may request a copy of the data we hold about you, or ask us to delete your account and all associated data, at any time. To make such a request, contact us at appgap2009@gmail.com. We will process requests within a reasonable timeframe.",
      },
    ],
  },
  {
    title: "Cookies & Local Storage",
    content: [
      {
        subtitle: "What We Store Locally",
        text: "AppGap uses browser local storage to save your progress between sessions (for example, partially completed profile steps) so you don't have to start over. We also use session cookies for authentication. We do not use third-party advertising cookies.",
      },
    ],
  },
  {
    title: "Changes to This Policy",
    content: [
      {
        subtitle: "Updates",
        text: "We may update this Privacy Policy from time to time as AppGap evolves. When we make material changes, we will update the date at the top of this page. Continued use of AppGap after changes are posted constitutes your acceptance of the updated policy.",
      },
    ],
  },
  {
    title: "Contact",
    content: [
      {
        subtitle: "Questions?",
        text: "If you have any questions about this Privacy Policy or how your data is handled, please reach out to us at appgap2009@gmail.com. We're happy to help.",
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Legal
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: July 2, 2026
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            AppGap is committed to being transparent about how we handle your
            information. This policy explains what we collect, why we collect
            it, and how you can control it.
          </p>
        </div>

        <div className="space-y-12">
          {sections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.content.map((item) => (
                  <div key={item.subtitle} className="space-y-1">
                    <p className="text-sm font-medium">{item.subtitle}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

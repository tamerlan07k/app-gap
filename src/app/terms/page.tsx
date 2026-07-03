import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — AppGap",
  description: "The terms that govern your use of AppGap.",
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    text: "By accessing or using AppGap, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use the platform. These terms apply to all visitors, users, and others who access or use the service.",
  },
  {
    title: "2. Description of Service",
    text: "AppGap is an AI-powered college admissions guidance platform. It allows students to enter academic and extracurricular profile information and receive personalized analysis, gap identification, and roadmap recommendations. AppGap is designed to help students understand where their profiles stand — it is not an official admissions service.",
  },
  {
    title: "3. User Responsibilities",
    text: "You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. You agree to provide accurate information when creating your profile, and to notify us promptly if you believe your account has been compromised. You must be at least 13 years old to use AppGap.",
  },
  {
    title: "4. Appropriate Use",
    text: "You agree not to use AppGap to: (a) violate any applicable law or regulation; (b) attempt to gain unauthorized access to any part of the platform or its underlying systems; (c) submit false, misleading, or harmful content; (d) scrape, copy, or redistribute AppGap's content without permission; or (e) interfere with or disrupt the platform's infrastructure.",
  },
  {
    title: "5. AI Disclaimer",
    text: "AppGap uses artificial intelligence to generate recommendations and analyses based on the information you provide. These outputs are intended for informational and guidance purposes only. They do not constitute official admissions decisions, guarantees of admission to any college or university, or professional counseling advice. Results may vary and should not be relied upon as a substitute for guidance from a qualified college counselor or official college communications.",
  },
  {
    title: "6. Student-Led Project Disclaimer",
    text: "AppGap is an independent student-led project, not an established company or licensed educational service. While we strive to provide accurate and helpful information, we cannot guarantee the completeness or accuracy of all content on the platform. Always verify important admissions-related information directly with the colleges, scholarship organizations, or official sources involved.",
  },
  {
    title: "7. Intellectual Property",
    text: "All content, design, code, and functionality comprising AppGap — including but not limited to text, graphics, logos, and software — is the property of AppGap and its creators. You may not reproduce, distribute, or create derivative works from any part of the platform without our express written permission. User-submitted profile data remains yours.",
  },
  {
    title: "8. Limitation of Liability",
    text: 'To the fullest extent permitted by law, AppGap and its creators shall not be liable for any indirect, incidental, special, or consequential damages arising out of or related to your use of the platform, including but not limited to reliance on AI-generated recommendations, admissions outcomes, or data loss. AppGap is provided on an "as is" and "as available" basis without warranties of any kind.',
  },
  {
    title: "9. Right to Update the Service",
    text: "We reserve the right to modify, suspend, or discontinue any part of AppGap at any time without notice. We may also update these Terms of Service periodically. When we make material changes, we will update the date on this page. Continued use of AppGap after changes are posted constitutes your acceptance of the revised terms.",
  },
  {
    title: "10. Governing Law",
    text: "These Terms of Service shall be governed by and construed in accordance with applicable law. Any disputes arising from your use of AppGap will be resolved in good faith. If formal resolution is required, it will be subject to the jurisdiction of the applicable courts.",
  },
];

export default function TermsPage() {
  return (
    <main className="px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Legal
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: July 2, 2026
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Please read these terms carefully before using AppGap. They explain
            what you can expect from us and what we expect from you.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <h2 className="text-sm font-semibold">{section.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {section.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

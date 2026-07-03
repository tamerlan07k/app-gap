import { Resend } from "resend";
import { env } from "~/env";

export async function POST(request: Request) {
  if (!env.RESEND_API_KEY) {
    return Response.json(
      { error: "Email service is not configured." },
      { status: 503 },
    );
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { name, email, subject, message } = await request.json();

  if (!name || !email || !subject || !message) {
    return Response.json(
      { error: "All fields are required." },
      { status: 400 },
    );
  }

  const { error } = await resend.emails.send({
    from: "AppGap Contact <onboarding@resend.dev>",
    to: "appgap2009@gmail.com",
    replyTo: email,
    subject: `[AppGap Contact] ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
        <h2 style="margin-bottom: 4px;">New message from AppGap Contact Form</h2>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
        <p style="margin: 0 0 4px;"><strong>Name:</strong> ${name}</p>
        <p style="margin: 0 0 4px;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 0 0 4px;"><strong>Subject:</strong> ${subject}</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
        <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
      </div>
    `,
  });

  if (error) {
    return Response.json({ error: "Failed to send email." }, { status: 500 });
  }

  return Response.json({ success: true });
}

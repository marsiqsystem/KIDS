import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

async function sendToSheet(url: string, data: Record<string, unknown>) {
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data),
    });
    console.log("Sheet write response:", res.status, await res.text().catch(() => ""));
  } catch (err) {
    console.error("Google Sheet write failed (non-blocking):", err);
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, inquiryType, message } = await req.json();

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const htmlBody = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #4A1515; padding: 24px 32px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">New Website Inquiry</h1>
        </div>
        <div style="padding: 32px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #4A1515; width: 140px; vertical-align: top;">Name</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #4A1515; vertical-align: top;">Email</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;"><a href="mailto:${email}" style="color: #4A1515;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #4A1515; vertical-align: top;">Inquiry Type</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">${inquiryType || "General"}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #4A1515; vertical-align: top;">Message</td>
              <td style="padding: 12px 0; white-space: pre-wrap;">${message}</td>
            </tr>
          </table>
        </div>
        <div style="background-color: #f9f6f2; padding: 16px 32px; text-align: center; font-size: 12px; color: #888;">
          Sent from the KIDS Website Contact Form
        </div>
      </div>
    `;

    // Send email
    await transporter.sendMail({
      from: `"KIDS Website" <${process.env.SMTP_EMAIL}>`,
      to: process.env.SMTP_EMAIL,
      replyTo: email,
      subject: `New Inquiry: ${inquiryType || "General"} — from ${name}`,
      html: htmlBody,
    });

    // Write to Google Sheet (awaited but non-fatal)
    await sendToSheet(process.env.SHEET_CONTACT_URL || "", { name, email, inquiryType, message });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}

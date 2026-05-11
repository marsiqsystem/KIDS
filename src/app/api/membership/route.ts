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
    const data = await req.json();

    // Validate required fields
    if (!data.name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!data.mobile?.trim()) {
      return NextResponse.json({ error: "Mobile number is required." }, { status: 400 });
    }
    if (!data.email?.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!data.paymentMode) {
      return NextResponse.json({ error: "Payment mode is required." }, { status: 400 });
    }
    if (!data.agreeTerm) {
      return NextResponse.json({ error: "You must agree to the undertaking." }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const fieldRows = [
      ["Name", data.name],
      ["Father's Name", data.fathersName],
      ["Spouse Name", data.spouseName],
      ["Children (Male)", data.childrenMale],
      ["Children (Female)", data.childrenFemale],
      ["Address", data.address],
      ["City", data.city],
      ["Pin Code", data.pinCode],
      ["State", data.state],
      ["Mobile", data.mobile],
      ["WhatsApp", data.whatsapp],
      ["Email", data.email],
      ["Nationality", data.nationality],
      ["Date of Birth", data.dob],
      ["Gender", data.gender],
      ["Qualification", data.qualification],
      ["Occupation", data.occupation],
      ["Payment Mode", data.paymentMode],
    ]
      .filter(([, val]) => val) // only include filled fields
      .map(
        ([label, val]) => `
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #4A1515; width: 160px; vertical-align: top; font-size: 14px;">${label}</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${val}</td>
        </tr>`
      )
      .join("");

    const htmlBody = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #4A1515; padding: 24px 32px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">New Life Membership Application</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 14px;">Rs. 10,000/- via ${data.paymentMode}</p>
        </div>
        <div style="padding: 16px;">
          <table style="width: 100%; border-collapse: collapse;">
            ${fieldRows}
          </table>
        </div>
        <div style="padding: 16px 32px; background-color: #fef9f0; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 13px; color: #555; margin: 0;">✅ Applicant has agreed to the KIDS code of ethics and undertaking.</p>
        </div>
        <div style="background-color: #f9f6f2; padding: 16px 32px; text-align: center; font-size: 12px; color: #888;">
          Sent from the KIDS Website Membership Form
        </div>
      </div>
    `;

    // Send email
    await transporter.sendMail({
      from: `"KIDS Website" <${process.env.SMTP_EMAIL}>`,
      to: process.env.SMTP_EMAIL,
      replyTo: data.email,
      subject: `New Life Membership Application — ${data.name}`,
      html: htmlBody,
    });

    // Write to Google Sheet (awaited but non-fatal)
    await sendToSheet(process.env.SHEET_MEMBERSHIP_URL || "", data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Membership form error:", error);
    return NextResponse.json(
      { error: "Failed to submit application. Please try again later." },
      { status: 500 }
    );
  }
}

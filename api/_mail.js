// Gmail SMTP se email bhejta hai (nodemailer).
// Env chahiye: GMAIL_USER, GMAIL_APP_PASSWORD, OWNER_EMAIL
import nodemailer from "nodemailer";

function transport() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) throw new Error("Gmail env vars missing");
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
  });
}

const esc = v => String(v ?? "-").replace(/[<>&]/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[c]));

const row = (k, v) => `<tr>
  <td style="padding:8px 14px;border-bottom:1px solid #E4E7EF;color:#6B7291;font-size:14px;white-space:nowrap">${k}</td>
  <td style="padding:8px 14px;border-bottom:1px solid #E4E7EF;color:#16202B;font-size:14px"><b>${esc(v)}</b></td>
</tr>`;

function shell(title, inner) {
  return `<div style="font-family:system-ui,Arial,sans-serif;max-width:560px;margin:auto;color:#3A4652">
    <h2 style="color:#1B2A63;margin:0 0 4px">${title}</h2>
    <div style="width:56px;height:4px;background:#4A72E8;border-radius:2px;margin:0 0 20px"></div>
    ${inner}
    <p style="color:#6B7291;font-size:12px;margin-top:28px">Timeline by Harsh · timelinebyharsh@gmail.com</p>
  </div>`;
}

// 1) Aapko — poori booking detail
function ownerMail(n, p) {
  const table = `<table style="border-collapse:collapse;width:100%;border:1px solid #E4E7EF;border-radius:6px">
    ${row("Naam", n.name)}
    ${row("WhatsApp", "+91 " + (n.whatsapp || ""))}
    ${row("Email", n.email)}
    ${row("Umar", n.age)}
    ${row("City", n.city)}
    ${row("Handle", n.handle)}
    ${row("Track", n.track)}
    ${row("Sawaal", n.question)}
    ${row("Janm vivaran", n.birth_details)}
    ${row("Jaap / vrat", n.jaap_vrat)}
    ${row("Amount", "\u20B9" + (p.amount / 100))}
    ${row("Method", p.method)}
    ${row("Payment ID", p.id)}
  </table>`;
  return {
    subject: `Nayi booking — ${n.name || "Unknown"} (${n.track || "track N/A"})`,
    html: shell("Nayi booking mili", table)
  };
}

// 2) Client ko — confirmation
function clientMail(n, p) {
  const inner = `
    <p style="font-size:16px">Namaste ${esc(n.name)},</p>
    <p>Aapka payment mil gaya hai aur booking confirm ho gayi hai. Dhanyavaad.</p>
    <table style="border-collapse:collapse;width:100%;border:1px solid #E4E7EF;border-radius:6px;margin:18px 0">
      ${row("Session", "30-minute 1:1 call")}
      ${row("Track", n.track)}
      ${row("Amount paid", "\u20B9" + (p.amount / 100))}
      ${row("Payment ID", p.id)}
    </table>
    <p><b>Aage kya hoga:</b> agle 24 ghante me aapke WhatsApp number par do-teen samay bheje jaayenge. Aap jo chunenge wahi slot final ho jaayega.</p>
    <p style="font-size:14px;color:#6B7291">Reschedule: call se 12 ghante pehle bata dijiye, ek baar bina kisi shulk ke samay badal jaayega. Bina bataye na aane par fee wapas nahi hoti.</p>`;
  return { subject: "Booking confirm — 30-minute 1:1 call", html: shell("Booking confirm ho gayi", inner) };
}

export async function sendBookingEmails(notes, payment) {
  const t = transport();
  const from = `"Timeline by Harsh" <${process.env.GMAIL_USER}>`;
  const owner = process.env.OWNER_EMAIL || process.env.GMAIL_USER;

  const jobs = [];
  const o = ownerMail(notes, payment);
  jobs.push(t.sendMail({ from, to: owner, replyTo: notes.email, subject: o.subject, html: o.html }));

  if (notes.email) {
    const c = clientMail(notes, payment);
    jobs.push(t.sendMail({ from, to: notes.email, replyTo: owner, subject: c.subject, html: c.html }));
  }
  return Promise.allSettled(jobs);
}

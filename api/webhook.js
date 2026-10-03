// POST /api/webhook — Razorpay Dashboard → Settings → Webhooks me is URL ko
// add kijiye, events: payment.captured, payment.failed
// Yeh source of truth hai: browser band ho jaaye to bhi booking yahan aa jaati hai.
import crypto from "crypto";
import { sendBookingEmails } from "./_mail.js";

export const config = { api: { bodyParser: false } };

async function raw(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const buf = await raw(req);
  const sig = req.headers["x-razorpay-signature"];
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "")
    .update(buf)
    .digest("hex");

  if (!sig || sig !== expected) return res.status(400).json({ error: "bad signature" });

  const evt = JSON.parse(buf.toString("utf8"));
  const p = evt?.payload?.payment?.entity || {};
  const n = p.notes || {};

  if (evt.event === "payment.captured") {
    console.log("BOOKING", JSON.stringify({
      payment_id: p.id, amount: p.amount, method: p.method,
      name: n.name, whatsapp: n.whatsapp, email: n.email,
      age: n.age, city: n.city, handle: n.handle, track: n.track, question: n.question,
      birth_details: n.birth_details, jaap_vrat: n.jaap_vrat
    }));
    // Do email: ek aapko (poori detail), ek client ko (confirmation)
    try {
      const out = await sendBookingEmails(n, p);
      out.forEach(r => r.status === "rejected" && console.error("MAIL_FAIL", r.reason?.message));
    } catch (e) {
      console.error("MAIL_ERROR", e.message);   // email fail ho to bhi 200 hi bhejna hai
    }
  } else if (evt.event === "payment.failed") {
    console.log("PAYMENT_FAILED", p.id, p.error_description);
  }

  return res.status(200).json({ ok: true });
}

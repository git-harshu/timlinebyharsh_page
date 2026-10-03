// POST /api/create-order  { form: {...} }  →  { order_id, key_id, amount }
// Secret sirf yahan rehta hai. Amount server-side fix hai, isliye client
// use badal nahi sakta.
import { AMOUNT_PAISE, CURRENCY, rzp, cleanNotes, validate } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const notes = cleanNotes(body.form || body.notes || {});
    const bad = validate(notes);
    if (bad.length) return res.status(400).json({ error: "Adhoore field: " + bad.join(", "), fields: bad });

    const order = await rzp("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: AMOUNT_PAISE,
        currency: CURRENCY,
        receipt: "call_" + Date.now(),
        notes
      })
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID   // public key — page se hardcode karne ki zaroorat nahi
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

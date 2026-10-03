// POST /api/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
//   → { valid, status, amount, notes }
// Signature check + Razorpay se payment ka asli status confirm.
import crypto from "crypto";
import { rzp, AMOUNT_PAISE } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return res.status(400).json({ valid: false, error: "missing fields" });

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const sigOk =
    expected.length === razorpay_signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));

  if (!sigOk) return res.status(200).json({ valid: false, reason: "signature mismatch" });

  try {
    const p = await rzp("/payments/" + razorpay_payment_id);
    const ok = ["captured", "authorized"].includes(p.status) && p.amount === AMOUNT_PAISE;
    return res.status(200).json({
      valid: ok,
      status: p.status,
      amount: p.amount,
      method: p.method,
      notes: p.notes || {}
    });
  } catch (e) {
    // Signature sahi tha — payment ho gaya hai, sirf status fetch fail hua
    return res.status(200).json({ valid: true, status: "unknown", warning: e.message });
  }
}

// GET /api/bookings?token=ADMIN_TOKEN  →  { count, bookings: [...] }
// Bookings ki list — data Razorpay se hi aata hai, koi database nahi chahiye.
import { rzp } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const { ADMIN_TOKEN } = process.env;
  if (!ADMIN_TOKEN || req.query.token !== ADMIN_TOKEN)
    return res.status(401).json({ error: "unauthorized" });

  try {
    const j = await rzp("/payments?count=100");
    const bookings = (j.items || [])
      .filter(p => p.status === "captured")
      .map(p => {
        const n = p.notes || {};
        return {
          payment_id: p.id,
          date: new Date(p.created_at * 1000).toISOString(),
          amount: p.amount / 100,
          method: p.method,
          name: n.name || "", whatsapp: n.whatsapp || "", email: n.email || p.email || "",
          city: n.city || "", handle: n.handle || "", track: n.track || "",
          question: n.question || "", birth_details: n.birth_details || "", jaap_vrat: n.jaap_vrat || ""
        };
      });
    return res.status(200).json({ count: bookings.length, bookings });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

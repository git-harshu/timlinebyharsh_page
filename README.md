# @timelinebyharsh — 1:1 call booking page (Razorpay, full flow)

## Kya-kya hai

| File | Kaam |
|---|---|
| `index.html` | Page — left me copy, right me payment panel |
| `api/create-order.js` | Server par Razorpay order banata hai (amount + validation server-side) |
| `api/verify.js` | Payment signature + asli status verify karta hai |
| `api/webhook.js` | Razorpay ka webhook — browser band ho jaaye to bhi booking record hoti hai |
| `api/bookings.js` | Saari bookings ki list (JSON), token se protected |
| `api/_lib.js` | Shared helpers |

Koi database nahi chahiye. Booking ka poora data payment ke `notes` me Razorpay
par hi store hota hai, aur `/api/bookings` se wapas nikal aata hai.

## Payment ka flow

1. User form bharta hai → **Pay ₹ 299.00**
2. Page `/api/create-order` ko call karta hai → server field validate karta hai,
   amount fix karta hai (₹299), Razorpay par order banata hai
3. Checkout popup khulta hai (UPI / card / netbanking / wallet)
4. Payment hone par page `/api/verify` se HMAC signature + payment status check karta hai
5. Verify hone par success message + WhatsApp confirm link
6. Saath hi Razorpay `/api/webhook` par `payment.captured` bhejta hai — yahi
   source of truth hai

## Deploy — Vercel (free)

```bash
cd timelinebyharsh-page
npx vercel        # pehli baar: login → project banega
npx vercel --prod # live
```

Ya GitHub par push karke Vercel dashboard se Import kijiye.

### Environment Variables (Vercel → Settings → Environment Variables)

| Name | Value |
|---|---|
| `RAZORPAY_KEY_ID` | `rzp_test_...` / `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Dashboard → Settings → API Keys se |
| `RAZORPAY_WEBHOOK_SECRET` | webhook banate waqt jo secret aap set karenge |
| `ADMIN_TOKEN` | koi bhi lamba random string — `/api/bookings` kholne ke liye |

Secret kabhi `index.html` me nahi jaata. Key ID bhi hardcode nahi hai — wo
server se aati hai.

### Webhook set kijiye

Razorpay Dashboard → Settings → Webhooks → Add New Webhook
- URL: `https://<aapka-domain>/api/webhook`
- Secret: wahi jo `RAZORPAY_WEBHOOK_SECRET` me daala
- Events: `payment.captured`, `payment.failed`

## Test

```bash
npx vercel env pull .env.local   # env local me le aaiye
npx vercel dev                   # http://localhost:3000
```

Test mode card: `4111 1111 1111 1111`, koi bhi future expiry, CVV `123`, OTP `1111`.
Test UPI: `success@razorpay`.

Check kijiye:
- Dashboard → Transactions me payment aur uske Notes me form data
- `https://<domain>/api/bookings?token=<ADMIN_TOKEN>` par list
- Vercel → Logs me `BOOKING` line (webhook se)

Sab theek lage to env vars me live keys daal kar redeploy kijiye.

## Live jaane se pehle

- Razorpay KYC complete hona zaroori hai, warna live keys activate nahi hongi
- Refund ke liye: Dashboard → payment → Refund (page se nahi)
- Amount badalna ho to `api/_lib.js` me `AMOUNT_PAISE` aur `index.html` ke
  do jagah likhe "₹ 299.00" text — dono badalne padenge

## Email notifications (Gmail)

Payment capture hone par do email jaate hain — ek aapko (poori booking detail)
aur ek client ko (confirmation). Yeh `api/webhook.js` se trigger hota hai,
isliye **webhook set hona zaroori hai**.

### Gmail App Password banaiye
1. myaccount.google.com → Security → **2-Step Verification** on kijiye (zaroori hai)
2. Usi page par → **App passwords** → app name likhiye (jaise "razorpay page") → Create
3. 16 character ka password milega — space hata kar copy kar lijiye

### Vercel me teen env vars add kijiye
| Name | Value |
|---|---|
| `GMAIL_USER` | timelinebyharsh@gmail.com |
| `GMAIL_APP_PASSWORD` | 16 character wala app password (normal Gmail password NAHI) |
| `OWNER_EMAIL` | jis inbox me booking aani hai (khaali chhoda to GMAIL_USER par jaayegi) |

Add karne ke baad **Redeploy** zaroori hai.

Email fail ho jaaye to bhi payment aur booking safe rehti hai — Vercel → Logs me
`MAIL_FAIL` ya `MAIL_ERROR` line dikh jaayegi.

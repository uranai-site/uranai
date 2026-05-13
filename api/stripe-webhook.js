import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe の署名検証には「生のリクエストボディ」が必要なので
// Vercel/Next の自動パースを無効化する
export const config = {
  api: {
    bodyParser: false,
  },
};

// 生のボディを Buffer として読み出すヘルパー
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // イベントタイプごとに処理
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("[Webhook] checkout.session.completed", {
          id: session.id,
          customer: session.customer,
          subscription: session.subscription,
          payment_status: session.payment_status,
        });
        // TODO: DB がある場合はここで「ユーザー = ベーシック」を確定保存
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        console.log(`[Webhook] ${event.type}`, {
          id: sub.id,
          customer: sub.customer,
          status: sub.status,
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        console.log("[Webhook] customer.subscription.deleted", {
          id: sub.id,
          customer: sub.customer,
        });
        // TODO: DB がある場合はここで「ユーザー = フリー」に戻す
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log("[Webhook] invoice.payment_failed", {
          id: invoice.id,
          customer: invoice.customer,
        });
        break;
      }
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ error: err.message || "Webhook handler failed" });
  }
}

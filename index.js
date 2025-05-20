const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

// ✅ Webhook - Recebe confirmação do pagamento
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    console.log(`❌ Gagal verifikasi webhook:`, err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🎯 Evento - Pagamento bem-sucedido
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log(`✅ PEMBAYARAN BERHASIL sebesar ${paymentIntent.amount}`);
    // 🔥 Aqui você pode: liberar produto, enviar WhatsApp, email, link, etc.
  }

  // 🎯 Evento - Pagamento falhou
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    console.log(`❌ PEMBAYARAN GAGAL sebesar ${paymentIntent.amount}`);
  }

  response.json({ received: true });
});

// ✅ Rota principal pra testar se tá online
app.get('/', (req, res) => {
  res.send('🚀 Backend Stripe Berjalan dengan Webhook!');
});

// ✅ Endpoint para criar payment
app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'idr',
      automatic_payment_methods: { enabled: true },
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// ✅ Porta do servidor
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server berjalan di port ${port}`));


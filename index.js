const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

// ✅ LINK DO PRODUTO — Este é o link que será liberado após o pagamento
const LINK_ACESSO = 'https://drive.google.com/file/d/1MBtfeD9p0gkq8WzUBTwp309rnKGE42dS/view?usp=sharing';

// ✅ Webhook — Stripe envia os dados aqui após o pagamento
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

  // 🎯 Evento — Pagamento bem-sucedido
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log(`✅ PEMBAYARAN BERHASIL sebesar ${paymentIntent.amount}`);
    console.log(`🚀 Link produk telah diberikan: ${LINK_ACESSO}`);

    // 🔥 Aqui você pode futuramente:
    // - Enviar email automático
    // - Enviar WhatsApp automático
    // - Salvar no banco
  }

  // 🎯 Evento — Pagamento falhou
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    console.log(`❌ PEMBAYARAN GAGAL sebesar ${paymentIntent.amount}`);
  }

  response.json({ received: true });
});

// ✅ Rota principal para testar se está online
app.get('/', (req, res) => {
  res.send('🚀 Backend Stripe berjalan dengan webhook dan link otomatis!');
});

// ✅ Endpoint para criar pagamento
app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'idr', // moeda: rupia indonésia
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

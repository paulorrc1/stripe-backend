const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const LINK_ACESSO = 'https://drive.google.com/file/d/1MBtfeD9p0gkq8WzUBTwp309rnKGE42dS/view?usp=sharing';

function hash(data) {
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    console.log(`❌ Erro no webhook:`, err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const name = paymentIntent.charges.data[0]?.billing_details?.name || 'Tidak diketahui';
    const email = paymentIntent.charges.data[0]?.billing_details?.email || '';
    const phone = paymentIntent.charges.data[0]?.billing_details?.phone || '';

    console.log(`✅ PEMBAYARAN BERHASIL sebesar ${paymentIntent.amount}`);
    console.log(`🚀 Link produk diberikan: ${LINK_ACESSO}`);

    const pixelId = '1531010357784370';
    const accessToken = 'EAANpFDbq70cBOwAKgnHyNmdSABZCa4jnM3OsgsxARiCWQnA06DAh4gb4SIyx3xxZBTBZBCW1Ed3KdLFPuU4JEw5nyvUZAReZBz6MK83JI91zRaj9JjWZAPbg4ZCOSK7IjZBSv46ymyNP4ZC4NAb1ulM2Y2EEuWHAQStp0tZA0jmqOo5LesXngxZB9FzqXJxaDBN7A2QjwZDZD';

    const fbPayload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(new Date() / 1000),
          action_source: 'website',
          event_source_url: 'https://seusite.com/checkout',
          user_data: {
            em: email ? [hash(email)] : [],
            ph: phone ? [hash(phone)] : [],
          },
          custom_data: {
            currency: 'IDR',
            value: 149000
          }
        }
      ]
    };

    axios.post(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`, fbPayload)
      .then(res => {
        console.log('✅ Evento enviado pro Facebook:', res.data);
      })
      .catch(err => {
        console.error('❌ Erro ao enviar evento pro Facebook:', err.message);
      });
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    console.log(`❌ PEMBAYARAN GAGAL sebesar ${paymentIntent.amount}`);
  }

  response.json({ received: true });
});

app.get('/', (req, res) => {
  res.send('🚀 Backend Stripe + Facebook API de Conversões funcionando!');
});

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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server berjalan di port ${port}`));

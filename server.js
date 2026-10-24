const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const BINANCE_API = 'https://api.binance.com';

function sign(query, secret) {
  return crypto.createHmac('sha256', secret).update(query).digest('hex');
}

app.get('/balance', async (req, res) => {
  try {
    const { key, secret } = req.query;
    if (!key || !secret) return res.status(400).json({ error: 'missing key/secret' });
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = sign(query, secret);
    const url = `${BINANCE_API}/api/v3/account?${query}&signature=${signature}`;
    const r = await axios.get(url, { headers: { 'X-MBX-APIKEY': key } });
    const usdt = r.data.balances.find(b => b.asset === 'USDT');
    const balance = parseFloat(usdt ? usdt.free : 0) + parseFloat(usdt ? usdt.locked : 0);
    res.json({ balance: balance });
  } catch (e) {
    res.status(500).json({ error: 'balance failed', detail: e.response?.data || e.message });
  }
});

app.get('/trade', async (req, res) => {
  try {
    const { key, secret, symbol, side, amount } = req.query;
    if (!key || !secret || !symbol || !side || !amount) {
      return res.status(400).json({ error: 'missing params' });
    }
    const timestamp = Date.now();
    let query;
    if (side === 'BUY') {
      query = `symbol=${symbol}&side=BUY&type=MARKET&quoteOrderQty=${amount}&timestamp=${timestamp}`;
    } else {
      query = `symbol=${symbol}&side=SELL&type=MARKET&quantity=${amount}&timestamp=${timestamp}`;
    }
    const signature = sign(query, secret);
    const url = `${BINANCE_API}/api/v3/order?${query}&signature=${signature}`;
    const r = await axios.post(url, null, { headers: { 'X-MBX-APIKEY': key } });
    res.json({ success: true, order: r.data });
  } catch (e) {
    res.status(500).json({ error: 'trade failed', detail: e.response?.data || e.message });
  }
});

app.get('/', (req, res) => res.send('DRAGON BACKEND LIVE - /balance and /trade ready'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Running on ' + PORT));

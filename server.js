// GOLDEN DRAGON BACKEND V57 - SINGAPORE FIX - BINANCE LIVE
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
app.use(cors({origin: '*'}));
app.use(express.json());

const BINANCE_BASE = 'https://api.binance.com';

function sign(query, secret) {
  return crypto.createHmac('sha256', secret).update(query).digest('hex');
}

app.get('/', (req, res) => {
  res.send('🐉 DRAGON V57 SINGAPORE LIVE - ' + new Date().toISOString());
});

app.get('/api/time', async (req, res) => {
  try {
    const r = await fetch(`${BINANCE_BASE}/api/v3/time`);
    const d = await r.json();
    res.json(d);
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

app.post('/api/binance', async (req, res) => {
  const {path, params = {}, apiKey, apiSecret, timeOffset = 0} = req.body;
  if (!apiKey || !apiSecret) return res.status(400).json({msg: 'Missing keys'});
  try {
    const ts = Date.now() + (timeOffset || 0);
    const queryObj = {...params, timestamp: ts, recvWindow: 10000};
    const query = new URLSearchParams(queryObj).toString();
    const signature = sign(query, apiSecret);
    const url = `${BINANCE_BASE}${path}?${query}&signature=${signature}`;
    const r = await fetch(url, {method: 'GET', headers: {'X-MBX-APIKEY': apiKey}});
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = {msg: text}; }
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({msg: e.message});
  }
});

app.post('/api/trade', async (req, res) => {
  const {symbol, side, quoteOrderQty, quantity, apiKey, apiSecret, timeOffset = 0} = req.body;
  if (!apiKey || !apiSecret) return res.status(400).json({msg: 'Missing keys'});
  try {
    const ts = Date.now() + (timeOffset || 0);
    let params = {symbol, side, type: 'MARKET', timestamp: ts, recvWindow: 10000};
    if (quoteOrderQty) params.quoteOrderQty = quoteOrderQty;
    if (quantity) params.quantity = quantity;
    const query = new URLSearchParams(params).toString();
    const signature = sign(query, apiSecret);
    const url = `${BINANCE_BASE}/api/v3/order?${query}&signature=${signature}`;
    const r = await fetch(url, {method: 'POST', headers: {'X-MBX-APIKEY': apiKey}});
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = {msg: text}; }
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({msg: e.message});
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Dragon V57 Singapore running on ${PORT}`));

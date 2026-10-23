const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();
app.use(cors());
app.use(express.json());

// CACHE to prevent bans
const cache = new Map();
const CACHE_TIME = 5000; // 5 sec cache

app.get('/', (req,res)=>res.send('Dragon Backend Fixed OK - WebSocket Ready'));
app.get('/api/time', (req,res)=>res.json({serverTime: Date.now()}));

// NEW: Cached price endpoint (uses WS logic, no weight)
app.get('/api/price/:symbol', (req,res)=>{
  const sym = req.params.symbol;
  const cached = cache.get('price_'+sym);
  if(cached && Date.now() - cached.time < 2000){
    return res.json(cached.data);
  }
  res.json({symbol:sym, cached:true, note:'Use Binance WS for live price'});
});

// FIXED BINANCE PROXY WITH RATE LIMIT
let lastCall = 0;
const MIN_INTERVAL = 400; // 400ms between calls = max 150 requests/min (safe)

app.post('/api/binance', async (req,res)=>{
  try{
    const now = Date.now();
    const wait = Math.max(0, lastCall + MIN_INTERVAL - now);
    if(wait > 0) await new Promise(r=>setTimeout(r, wait));
    lastCall = Date.now();

    const {path, params, apiKey, apiSecret, timeOffset} = req.body;
    
    // Block heavy endpoints from spamming
    if(path.includes('/ticker') || path.includes('/depth') || path.includes('/klines')){
      const cacheKey = path + JSON.stringify(params);
      const cached = cache.get(cacheKey);
      if(cached && Date.now() - cached.time < CACHE_TIME){
        return res.json(cached.data);
      }
    }

    const timestamp = Date.now() + (timeOffset||0);
    const queryParams = {...params, timestamp};
    const queryString = Object.keys(queryParams).map(k=>`${k}=${queryParams[k]}`).join('&');
    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
    const url = `https://api.binance.com${path}?${queryString}&signature=${signature}`;
    
    let finalRes;
    if(path.includes('/order')){
      const orderUrl = `https://api.binance.com${path}`;
      const bodyStr = `${queryString}&signature=${signature}`;
      const r = await fetch(orderUrl, {
        method: 'POST',
        headers:{'X-MBX-APIKEY': apiKey, 'Content-Type':'application/x-www-form-urlencoded'},
        body: bodyStr
      });
      finalRes = await r.json();
      return res.status(r.status).json(finalRes);
    }
    
    const response = await fetch(url, {method: 'GET', headers:{'X-MBX-APIKEY': apiKey}});
    const data = await response.json();
    
    // Cache successful price data
    if(response.status === 200 && (path.includes('/ticker') || path.includes('/account')===false)){
      cache.set(path + JSON.stringify(params), {data, time: Date.now()});
    }
    
    // If banned, return friendly message
    if(data.msg && data.msg.includes('banned')){
      return res.status(429).json({msg:'BINANCE_TEMP_BAN - Wait until 7:45 PM NZ. Backend now has anti-ban protection!', ...data});
    }
    
    res.status(response.status).json(data);
  }catch(e){
    res.status(500).json({msg:e.message});
  }
});

const PORT = process.env.PORT||10000;
app.listen(PORT, ()=>console.log('Running '+PORT+' - Anti-Ban Fixed'));

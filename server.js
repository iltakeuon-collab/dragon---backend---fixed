const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req,res)=>res.send('Dragon Backend Fixed OK'));
app.get('/api/time', (req,res)=>res.json({serverTime: Date.now()}));

app.post('/api/binance', async (req,res)=>{
 try{
  const {path, params, apiKey, apiSecret, timeOffset} = req.body;
  const timestamp = Date.now() + (timeOffset||0);
  // FIXED: NO recvWindow - only 6 params total
  const queryParams = {...params, timestamp};
  const queryString = Object.keys(queryParams).map(k=>`${k}=${queryParams[k]}`).join('&');
  const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
  const url = `https://api.binance.com${path}?${queryString}&signature=${signature}`;
  const response = await fetch(url, {method: 'GET', headers:{'X-MBX-APIKEY': apiKey}});
  // For POST orders
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
  const data = await response.json();
  res.status(response.status).json(data);
 }catch(e){
  res.status(500).json({msg:e.message});
 }
});

const PORT = process.env.PORT||10000;
app.listen(PORT, ()=>console.log('Running '+PORT));

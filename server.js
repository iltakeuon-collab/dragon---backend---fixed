const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const app = express();

app.use((req,res,next)=>{
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Headers','*');
  res.header('Access-Control-Allow-Methods','*');
  next();
});

app.get('/', (req,res)=>{
  res.send('DRAGON V5.9.1 FRANKFURT READY - FIXED');
});

app.get('/balance', async(req,res)=>{
  try{
    const {key,secret} = req.query;
    if(!key||!secret) return res.json({error:'NO KEYS'});
    const ts = Date.now();
    const q = `timestamp=${ts}`;
    const sig = crypto.createHmac('sha256', secret).update(q).digest('hex');
    const r = await axios.get(`https://api.binance.com/api/v3/account?${q}&signature=${sig}`,{
      headers:{'X-MBX-APIKEY':key},
      timeout:10000
    });
    const usdt = r.data.balances.find(b=>b.asset==='USDT');
    const bal = parseFloat(usdt?usdt.free:0) + parseFloat(usdt?usdt.locked:0);
    res.json({balance:bal});
  }catch(e){
    console.log(e.response?.data||e.message);
    res.json({error:true,msg:e.response?.data?.msg||e.message});
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('FRANKFURT READY '+PORT));

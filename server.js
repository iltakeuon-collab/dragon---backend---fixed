const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json());

app.get('/', (req,res)=> res.send('DRAGON BACKEND LIVE - SINGAPORE'));

async function binanceRequest(apiKey, apiSecret, path, params={}){
  params.timestamp = Date.now();
  params.recvWindow = 5000;
  let query = Object.keys(params).map(k=>`${k}=${params[k]}`).join('&');
  let signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');
  query += `&signature=${signature}`;
  let url = `https://api.binance.com${path}?${query}`;
  let resp = await axios.get(url, {headers:{'X-MBX-APIKEY': apiKey}});
  return resp.data;
}

app.get('/balance', async (req,res)=>{
try{
let {key, secret} = req.query;
if(!key||!secret) return res.json({error:'NO KEYS'});
let data = await binanceRequest(key, secret, '/api/v3/account', {});
let bal = 0;
if(data.balances){
  data.balances.forEach(b=>{
    if(['USDT','FDUSD','BUSD'].includes(b.asset)){
      bal += parseFloat(b.free) + parseFloat(b.locked);
    }
  });
}
console.log('BALANCE OK', bal);
res.json({balance: bal, raw: data.balances?.filter(b=>parseFloat(b.free)>0)});
}catch(e){
console.log('BALANCE FAILED', e.response?.data || e.message);
res.json({error:'balance failed', msg: e.response?.data?.msg || e.message, details: e.response?.data});
}
});

app.get('/trade', async (req,res)=>{
try{
let {key, secret, symbol, side, amount} = req.query;
if(!key||!secret) return res.json({error:'NO KEYS'});
let params = {symbol, side, type:'MARKET'};
if(side==='BUY') params.quoteOrderQty = amount;
else params.quantity = amount;
params.timestamp = Date.now();
let query = Object.keys(params).map(k=>`${k}=${params[k]}`).join('&');
let signature = crypto.createHmac('sha256', secret).update(query).digest('hex');
query += `&signature=${signature}`;
let url = `https://api.binance.com/api/v3/order?${query}`;
let resp = await axios.post(url, null, {headers:{'X-MBX-APIKEY': key}});
res.json({success:true, order: resp.data});
}catch(e){
console.log('TRADE FAILED', e.response?.data || e.message);
res.json({error:'trade failed', msg: e.response?.data?.msg || e.message});
}
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log('DRAGON RUNNING ON '+PORT));

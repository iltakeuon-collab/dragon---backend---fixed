const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json());
let balanceCache = { data: null, time: 0, key: '' };
app.get('/', (req,res)=> res.send('DRAGON BACKEND LIVE - SINGAPORE - V5.9 FIXED'));
async function binanceRequest(apiKey, apiSecret, path, params={}){
  params.timestamp = Date.now(); params.recvWindow = 5000;
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
    let now = Date.now();
    if(balanceCache.data && (now - balanceCache.time < 60000) && balanceCache.key === key){
      return res.json(balanceCache.data);
    }
    let data = await binanceRequest(key, secret, '/api/v3/account', {});
    let bal = 0;
    if(data.balances){
      data.balances.forEach(b=>{
        if(['USDT','FDUSD','BUSD','USDC'].includes(b.asset)){
          bal += parseFloat(b.free) + parseFloat(b.locked);
        }
      });
    }
    let result = {balance: bal};
    balanceCache = {data: result, time: now, key: key};
    res.json(result);
  }catch(e){
    res.json({error:'balance failed', msg: e.response?.data?.msg || e.message});
  }
});
app.get('/trade', async (req,res)=>{
  try{
    let {key, secret, symbol, side, amount} = req.query;
    let params = {symbol, side, type:'MARKET'};
    if(side==='BUY') params.quoteOrderQty = amount; else params.quantity = amount;
    params.timestamp = Date.now(); params.recvWindow = 5000;
    let query = Object.keys(params).map(k=>`${k}=${params[k]}`).join('&');
    let signature = crypto.createHmac('sha256', secret).update(query).digest('hex');
    query += `&signature=${signature}`;
    let url = `https://api.binance.com/api/v3/order?${query}`;
    let resp = await axios.post(url, null, {headers:{'X-MBX-APIKEY': key}});
    balanceCache = {data: null, time: 0, key: ''};
    res.json({success:true, order: resp.data});
  }catch(e){
    res.json({error:'trade failed', msg: e.response?.data?.msg || e.message});
  }
});
const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log('DRAGON RUNNING ON '+PORT));

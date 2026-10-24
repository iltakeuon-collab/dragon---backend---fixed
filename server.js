const express=require('express');
const crypto=require('crypto');
const axios=require('axios');
const app=express();
app.use((req,res,next)=>{res.header('Access-Control-Allow-Origin','*');res.header('Access-Control-Allow-Headers','*');next();});
let cache={v:null,t:0,k:''};
app.get('/',(req,res)=>res.send('DRAGON V5.9.1 FRANKFURT READY'));
app.get('/balance',async(req,res)=>{
 try{
  const {key,secret}=req.query;
  if(!key||!secret) return res.json({error:'NO KEYS'});
  const now=Date.now();
  if(cache.v && (now-cache.t<60000) && cache.k===key){
    console.log('CACHED 60s');
    return res.json(cache.v);
  }
  const ts=Date.now();
  const q=`timestamp=${ts}`;
  const sig=crypto.createHmac('sha256',secret).update(q).digest('hex');
  const r=await axios.get(`https://api.binance.com/api/v3/account?${q}&signature=${sig}`,{headers:{'X-MBX-APIKEY':key},timeout:10000});
  const usdt=r.data.balances.find(b=>b.asset==='USDT');
  const bal=parseFloat(usdt?usdt.free:0)+parseFloat(usdt?usdt.locked:0);
  const out={balance:bal};
  cache={v:out,t:now,k:key};
  res.json(out);
 }catch(e){
  console.log('BAL FAIL',e.response?.data||e.message);
  res.json({error:true,msg:e.response?.data?.msg||e.message});
 }
});
app.listen(process.env.PORT||10000,()=>console.log('FRANKFURT LIVE'));

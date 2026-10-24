const express=require('express');
const crypto=require('crypto');
const axios=require('axios');
const app=express();
app.use((req,res,next)=>{res.header('Access-Control-Allow-Origin','*');next();});
let balCache={val:null,exp:0};
app.get('/',(req,res)=>res.send('DRAGON V7 ANTI-BAN OREGON LIVE'));
app.get('/balance',async(req,res)=>{
  if(Date.now()<balCache.exp && balCache.val!==null) return res.json({balance:balCache.val,cached:true});
  try{
    let {key,secret}=req.query; let ts=Date.now();
    let q=`timestamp=${ts}`;
    let sig=crypto.createHmac('sha256',secret).update(q).digest('hex');
    let r=await axios.get(`https://api.binance.com/api/v3/account?${q}&signature=${sig}`,{headers:{'X-MBX-APIKEY':key}});
    let b=parseFloat(r.data.balances.find(x=>x.asset==='USDT')?.free||0);
    balCache={val:b,exp:Date.now()+300000};
    res.json({balance:b});
  }catch(e){res.json({error:true,msg:e.response?.data?.msg||e.message});}
});
app.get('/trade',async(req,res)=>{
  try{
    let {key,secret,symbol,side,amount,price}=req.query;
    let ts=Date.now();
    let qty=side==='BUY'?(parseFloat(amount)/parseFloat(price)):parseFloat(amount);
    qty=Number(qty).toFixed(5);
    let q=`symbol=${symbol}&side=${side}&type=MARKET&${side==='BUY'?'quoteOrderQty='+amount:'quantity='+qty}&timestamp=${ts}`;
    let sig=crypto.createHmac('sha256',secret).update(q).digest('hex');
    let r=await axios.post(`https://api.binance.com/api/v3/order?${q}&signature=${sig}`,null,{headers:{'X-MBX-APIKEY':key}});
    balCache.exp=0;
    res.json({success:true,order:r.data});
  }catch(e){res.json({error:true,msg:e.response?.data?.msg||e.message});}
});
app.listen(10000);

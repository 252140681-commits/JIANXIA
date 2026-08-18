export async function onRequestGet(context) {
  const reqUrl = new URL(context.request.url);
  const city = (reqUrl.searchParams.get('city') || '济南').trim().replace(/市$/,'');
  const event = reqUrl.searchParams.get('event') || 'set_2';
  const model = reqUrl.searchParams.get('model') || 'GFS';
  if (!['rise_1','set_1','rise_2','set_2'].includes(event)) return json({status:'error',message:'invalid event'},400);
  if (!['GFS','EC'].includes(model)) return json({status:'error',message:'invalid model'},400);
  const u = new URL('https://sunsetbot.top/');
  u.searchParams.set('intend','select_city'); u.searchParams.set('query_city',city); u.searchParams.set('event',event); u.searchParams.set('model',model);
  const ac=new AbortController(); const t=setTimeout(()=>ac.abort(),7000);
  try {
    const r=await fetch(u.toString(),{signal:ac.signal,redirect:'follow',headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0 (compatible; JianXia/1.0)'}});
    const text=await r.text(); let data=null; try{data=JSON.parse(text)}catch{}
    if(!r.ok) return json({status:'error',message:`SunsetBot HTTP ${r.status}`,detail:text.slice(0,500)},502);
    if(!data) return json({status:'error',message:'SunsetBot 返回非 JSON',detail:text.slice(0,500)},502);
    if(data.status!=='ok') return json({status:'error',message:'SunsetBot 返回 status 不是 ok',detail:JSON.stringify(data).slice(0,500)},502);
    data._jianxia_source='SunsetBot official JSON'; data._jianxia_model=model; data._jianxia_event=event;
    return json(data,200);
  } catch(e) { return json({status:'error',message:e?.name==='AbortError'?'SunsetBot 请求超时（7秒）':'SunsetBot 连接失败',detail:String(e)},504); }
  finally {clearTimeout(t)}
}
function json(x,status=200){return new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate','Access-Control-Allow-Origin':'*'}})}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/geocode") {
      const q=(url.searchParams.get("q")||"").trim();
      const limit=Math.min(Math.max(Number(url.searchParams.get("limit")||8),1),10);
      if(!q) return Response.json({status:"error",message:"q required",results:[]},{status:400});
      const target=new URL("https://nominatim.openstreetmap.org/search");
      target.searchParams.set("q",q); target.searchParams.set("format","jsonv2"); target.searchParams.set("addressdetails","1"); target.searchParams.set("namedetails","1"); target.searchParams.set("limit",String(limit)); target.searchParams.set("countrycodes","cn"); target.searchParams.set("accept-language","zh-CN,zh;q=0.9,en;q=0.5");
      try{
        const r=await fetch(target.toString(),{headers:{"Accept":"application/json","User-Agent":"JianXia/2.2 contact: jianxia"},cf:{cacheTtl:3600,cacheEverything:true}});
        const j=await r.json();
        const results=(j||[]).map(x=>({name:x.name||x.address?.road||x.address?.village||x.address?.hamlet||x.address?.neighbourhood||"",display_name:x.display_name||"",lat:Number(x.lat),lon:Number(x.lon),latitude:Number(x.lat),longitude:Number(x.lon),address:x.address||{},type:x.type||"",category:x.category||""}));
        return Response.json({status:r.ok?"ok":"error",results},{status:r.ok?200:502,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public,max-age=3600","Access-Control-Allow-Origin":"*"}});
      }catch(e){return Response.json({status:"error",message:"geocode failed",detail:String(e),results:[]},{status:502,headers:{"Access-Control-Allow-Origin":"*"}})}
    }
    if (url.pathname === "/api/reverse") {
      const lat = url.searchParams.get("lat"), lon = url.searchParams.get("lon");
      if (!lat || !lon) return Response.json({status:"error",message:"lat/lon required"},{status:400});
      const target = new URL("https://nominatim.openstreetmap.org/reverse");
      target.searchParams.set("lat",lat); target.searchParams.set("lon",lon); target.searchParams.set("format","jsonv2"); target.searchParams.set("zoom","10"); target.searchParams.set("accept-language","zh-CN");
      try {
        const r=await fetch(target.toString(),{headers:{"Accept":"application/json","User-Agent":"JianXia/1.1 contact: jianxia"},cf:{cacheTtl:86400,cacheEverything:true}});
        const j=await r.json(); const a=j.address||{};
        const city=a.city||a.town||a.municipality||a.county||a.city_district||a.state||j.name||"";
        return Response.json({status:r.ok?"ok":"error",city,name:j.name||city,admin:a.state||a.province||a.region||"",country:a.country||""},{status:r.ok?200:502,headers:{"Cache-Control":"public,max-age=3600","Access-Control-Allow-Origin":"*"}});
      } catch(e){return Response.json({status:"error",message:"reverse geocode failed",detail:String(e)},{status:502});}
    }
    if (url.pathname === "/api/sunsetbot") {
      const city = (url.searchParams.get("city") || "").trim();
      const event = url.searchParams.get("event") || "set_1";
      const model = url.searchParams.get("model") || "GFS";
      const debug = url.searchParams.get("debug") === "1";
      if (!city) return Response.json({status:"error",message:"city required"},{status:400});
      if (!["rise_1","set_1","rise_2","set_2"].includes(event)) return Response.json({status:"error",message:"invalid event"},{status:400});
      if (!["GFS","EC"].includes(model)) return Response.json({status:"error",message:"invalid model"},{status:400});

      // SunsetBot 有两种公开调用写法在第三方客户端中长期并存：
      // 1) 最小参数：intend + query_city + event + model
      // 2) 旧版客户端兼容：再带 query_id + event_date=None + times=None
      // 这里按“最小参数 -> 兼容参数”顺序尝试，避免把某一版本参数写死。
      const variants = [
        {intend:"select_city",query_city:city,event,model},
        {query_id:String(Math.floor(100000 + Math.random()*900000)),intend:"select_city",query_city:city,event_date:"None",event,times:"None",model}
      ];
      const bases=["https://sunsetbot.top/","https://www.sunsetbot.top/"];
      const attempts=[];
      const fetchWithTimeout=async(target)=>{
        const ctl=new AbortController();
        const timer=setTimeout(()=>ctl.abort(),9000);
        try{
          return await fetch(target.toString(),{method:"GET",redirect:"follow",signal:ctl.signal,
            headers:{"Accept":"application/json,text/plain,*/*","User-Agent":"Mozilla/5.0 (compatible; JianXia/3.0; +https://jianxia.pages.dev)","Referer":"https://sunsetbot.top/"},
            cf:{cacheTtl:0,cacheEverything:false}});
        } finally { clearTimeout(timer); }
      };
      for(const base of bases){
        for(const params of variants){
          const target=new URL(base);
          for(const [k,v] of Object.entries(params)) target.searchParams.set(k,v);
          const label=target.toString().replace(/query_id=[^&]+/,'query_id=******');
          try{
            const upstream=await fetchWithTimeout(target);
            const text=await upstream.text();
            let data=null; try{data=JSON.parse(text)}catch{}
            const usable=!!data && (data.tb_quality!=null || data.tb_event_time!=null || data.display_event_name_cn!=null || data.place_holder!=null);
            attempts.push({url:label,status:upstream.status,ok:upstream.ok,contentType:upstream.headers.get('content-type')||'',usable,preview:data?null:text.slice(0,300)});
            if(upstream.ok && usable){
              data._jianxia_model=model; data._jianxia_event=event;
              data._jianxia_source="SunsetBot official JSON";
              return new Response(JSON.stringify(data),{status:200,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, no-cache, must-revalidate","Pragma":"no-cache","Access-Control-Allow-Origin":"*"}});
            }
          }catch(e){
            attempts.push({url:label,status:0,ok:false,error:e?.name==='AbortError'?'TIMEOUT':String(e)});
          }
        }
      }
      const detail=attempts.map((a,i)=>`${i+1}. HTTP ${a.status||'ERR'} ${a.ok?'OK':'FAIL'} ${a.error||a.contentType||''}${a.preview?' | '+a.preview:''}`).join('\n');
      return Response.json({status:"error",message:"SunsetBot 官方接口未返回可用 JSON",detail,attempts},{status:502,headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});
    }
    return env.ASSETS.fetch(request);
  }
};

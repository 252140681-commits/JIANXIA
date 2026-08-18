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
      const city = (url.searchParams.get("city") || "济南").trim();
      const event = url.searchParams.get("event") || "set_2";
      const model = url.searchParams.get("model") || "GFS";
      if (!city) return Response.json({status:"error",message:"city required"},{status:400});
      if (!["rise_1","set_1","rise_2","set_2"].includes(event)) return Response.json({status:"error",message:"invalid event"},{status:400});
      if (!["GFS","EC"].includes(model)) return Response.json({status:"error",message:"invalid model"},{status:400});

      // SunsetBot 公开 JSON API 的已验证格式：
      // https://sunsetbot.top/?intend=select_city&query_city=济南&event=set_2&model=GFS
      // 不添加 query_id / event_date / times，避免把页面查询变成旧版兼容模式。
      const target = new URL("https://sunsetbot.top/");
      target.searchParams.set("intend","select_city");
      target.searchParams.set("query_city",city.replace(/市$/,""));
      target.searchParams.set("event",event);
      target.searchParams.set("model",model);

      const ctl = new AbortController();
      const timer = setTimeout(()=>ctl.abort(),7000);
      try {
        const upstream = await fetch(target.toString(), {
          method:"GET", redirect:"follow", signal:ctl.signal,
          headers:{"Accept":"application/json","User-Agent":"Mozilla/5.0 (compatible; JianXia/1.0)"},
          cf:{cacheTtl:0,cacheEverything:false}
        });
        const text = await upstream.text();
        let data=null;
        try { data=JSON.parse(text); } catch {}
        if (!upstream.ok) {
          return Response.json({status:"error",message:`SunsetBot HTTP ${upstream.status}`,detail:text.slice(0,300)},{status:502,headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});
        }
        if (!data || data.status !== "ok") {
          return Response.json({status:"error",message:"SunsetBot 返回状态不是 ok",detail:text.slice(0,500)},{status:502,headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});
        }
        if (data.tb_quality == null) {
          return Response.json({status:"error",message:"SunsetBot 返回 JSON，但缺少 tb_quality",detail:text.slice(0,500)},{status:502,headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});
        }
        data._jianxia_model=model;
        data._jianxia_event=event;
        data._jianxia_source="SunsetBot official JSON";
        return Response.json(data,{status:200,headers:{"Cache-Control":"no-store, no-cache, must-revalidate","Pragma":"no-cache","Access-Control-Allow-Origin":"*"}});
      } catch(e) {
        return Response.json({status:"error",message:e?.name==="AbortError"?"SunsetBot 请求超时（7秒）":"SunsetBot 连接失败",detail:String(e)},{status:504,headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});
      } finally { clearTimeout(timer); }
    }
    return env.ASSETS.fetch(request);
  }
};

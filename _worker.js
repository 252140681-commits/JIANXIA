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
      const event = url.searchParams.get("event") || "set_2";
      const model = url.searchParams.get("model") || "GFS";
      if (!city) return Response.json({status:"error",message:"city required"},{status:400});
      if (!["rise_1","set_1","rise_2","set_2"].includes(event)) return Response.json({status:"error",message:"invalid event"},{status:400});
      if (!["GFS","EC"].includes(model)) return Response.json({status:"error",message:"invalid model"},{status:400});

      // 使用 SunsetBot 公开 JSON API 的最小官方参数集。
      // 不附加 query_id / event_date / times，避免部分时次被判定为“官方模型暂无”。
      const domains=["https://www.sunsetbot.top/","https://sunsetbot.top/"];
      let lastError="";
      for(const base of domains){
        const target=new URL(base);
        target.searchParams.set("intend","select_city");
        target.searchParams.set("query_city",city);
        target.searchParams.set("event",event);
        target.searchParams.set("model",model);
        // SunsetBot 当前公开 JSON 接口要求 query_id；每次请求生成新的 6 位 ID。
        target.searchParams.set("query_id",String(Math.floor(100000 + Math.random()*900000)));
        try{
          const upstream=await fetch(target.toString(),{method:"GET",redirect:"follow",headers:{"Accept":"application/json, text/plain, */*","User-Agent":"Mozilla/5.0 (compatible; JianXia/2.1)","Referer":"https://www.sunsetbot.top/"},cf:{cacheTtl:0,cacheEverything:false}});
          const text=await upstream.text();
          let data; try{data=JSON.parse(text)}catch{data={status:"error",message:"SunsetBot 返回非 JSON 数据",http_status:upstream.status,preview:text.slice(0,500)}}
          const usable=!!data && (data.tb_quality!=null || data.tb_event_time!=null || data.display_event_name_cn!=null);
          if(upstream.ok && usable){
            data._jianxia_model=model; data._jianxia_event=event;
            return new Response(JSON.stringify(data),{status:200,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, no-cache, must-revalidate","Pragma":"no-cache","Access-Control-Allow-Origin":"*"}});
          }
          lastError=`${base} HTTP ${upstream.status} ${data?.message||"无有效数据"}`;
        }catch(e){lastError=String(e)}
      }
      return Response.json({status:"error",message:"SunsetBot 官方接口暂无可用结果",detail:lastError},{status:502,headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});
    }
    const asset = await env.ASSETS.fetch(request);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const h = new Headers(asset.headers);
      h.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      h.set("Pragma", "no-cache");
      return new Response(asset.body, {status: asset.status, statusText: asset.statusText, headers: h});
    }
    return asset;
  }
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const u = new URL(request.url);
  const city = u.searchParams.get("city") || "";
  const event = u.searchParams.get("event") || "set_2";
  const model = u.searchParams.get("model") || "GFS";
  if (!city) return json({status:"error",message:"city required"},400);

  const key = `jianxia:${city}:${event}:${model}`;
  const cached = await caches.default.match(new Request("https://cache.local/"+encodeURIComponent(key)));
  if (cached) return cached;

  const upstream = new URL("https://sunsetbot.top/");
  upstream.searchParams.set("intend","select_city");
  upstream.searchParams.set("query_city",city);
  upstream.searchParams.set("event",event);
  upstream.searchParams.set("model",model);

  try {
    const r = await fetch(upstream.toString(), {
      headers: {"Accept":"application/json","User-Agent":"JianXia/1.0"}
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); }
    catch { data = {status:"error",message:"non-json upstream"}; }
    const out = json(data, r.ok ? 200 : r.status);
    out.headers.set("Cache-Control","public, max-age=90");
    await caches.default.put(new Request("https://cache.local/"+encodeURIComponent(key)), out.clone());
    return out;
  } catch (e) {
    return json({status:"error",message:e?.message || "upstream request failed"},502);
  }
}
function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Access-Control-Allow-Origin":"*",
      "Cache-Control":"no-store"
    }
  });
}

// Cloudflare Pages Function
// Same-origin proxy for SunsetBot's public JSON endpoint.
// Frontend calls: /api/sunsetbot?query_id=...&intend=select_city&query_city=...&event_date=None&event=set_2&times=None

const ALLOWED = new Set([
  'query_id',
  'intend',
  'query_city',
  'event_date',
  'event',
  'times'
]);

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const targetUrl = new URL('https://sunsetbot.top/');

  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (ALLOWED.has(key)) targetUrl.searchParams.set(key, value);
  }

  if (!targetUrl.searchParams.get('query_city')) {
    return json({ status: 'error', message: '缺少 query_city' }, 400);
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Jianxia/1.1 Cloudflare Pages Function'
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || '';

    if (!upstream.ok) {
      return json({
        status: 'error',
        message: `SunsetBot HTTP ${upstream.status}`,
        upstream_status: upstream.status,
        detail: text.slice(0, 500)
      }, 502);
    }

    // Prefer JSON. If upstream returns a JSON string with the wrong content-type,
    // still parse and return it as JSON.
    try {
      const data = JSON.parse(text);
      return json(data, 200, {
        'X-Jianxia-Proxy': 'sunsetbot'
      });
    } catch {
      return json({
        status: 'error',
        message: 'SunsetBot 返回的不是有效 JSON',
        upstream_content_type: contentType,
        detail: text.slice(0, 500)
      }, 502);
    }
  } catch (error) {
    return json({
      status: 'error',
      message: '无法连接 SunsetBot 官方接口',
      detail: String(error?.message || error)
    }, 502);
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    }
  });
}

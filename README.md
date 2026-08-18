# 见霞 Cloudflare SunsetBot V5 官方接口修正版

本版保持 V5 界面，同时修正 SunsetBot 调用：使用其公开 JSON API 的最小官方参数集 `intend=select_city&query_city=城市&event=rise_1/set_1/rise_2/set_2&model=GFS/EC`，加入每次请求唯一的 6 位 query_id；Worker 同时尝试 www.sunsetbot.top 与 sunsetbot.top，并禁用 Cloudflare 缓存。默认地址为山东济南。

部署时请整包上传，确保 `_worker.js` 位于项目根目录。

地址搜索增强：优先使用 Cloudflare Worker 代理的 Nominatim 详细地理编码，可识别街道、村庄、社区、邻里和门牌号；Open-Meteo 作为回退。详细程度取决于地图数据覆盖。

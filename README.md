# 见霞 V1 · Cloudflare 正式网站版

这是「见霞 V1 联网版」的 Cloudflare Pages 版本。

## 最简单的部署方式

1. 把整个项目上传到 GitHub（网页操作即可）。
2. 在 Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git。
3. 选择这个 GitHub 仓库。
4. Framework preset 选择 `None`。
5. Build command 留空。
6. Build output directory 填 `/`。
7. 保存并部署。

部署完成后会得到 `https://你的项目名.pages.dev`，这个网址可以直接分享。

## 为什么没有继续使用 server.mjs？

原版本需要 Node.js 服务器代理 SunsetBot。Cloudflare Pages 不能直接运行这个 Node HTTP server。
本版本把 `/api/sunsetbot` 改成了 Cloudflare Pages Function，所以定位、天气和 SunsetBot 代理可以继续工作。

## 手机使用

部署后可以直接用手机浏览器打开。后续还可以继续加入 PWA 安装到手机桌面、图标、启动页和推送提醒。

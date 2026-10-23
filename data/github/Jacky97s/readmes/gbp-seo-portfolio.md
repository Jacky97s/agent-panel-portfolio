# gbp-seo-portfolio

Google 商家檔案 (GBP) SEO 分析服務的作品集網站。透過四大面向量化評分，幫助在地商家找出 Google 地圖曝光弱點並提供具體優化步驟。

🔗 **https://gbp-seo.devfromzero.xyz**

## 功能

- **單頁作品集** — 動態載入分析報告卡片，含 SVG 分數環與標籤分類
- **CTA 表單** — 串接 Google Apps Script，收集潛在客戶需求
- **FAQ 區塊** — 結構化常見問題，優化 AIO / GEO 搜尋呈現
- **SEO 完整配置** — Open Graph、JSON-LD Schema、sitemap、robots.txt
- **GitHub Pages 自動部署** — push to `main` 即上線

## 技術

純 HTML + CSS + vanilla JS，零框架依賴。

## 結構

```
├── index.html                 # 主頁面（one-page portfolio）
├── data/projects.json         # 作品集資料
├── assets/
│   ├── avatar.png             # 頭像
│   └── thumbnails/            # 報告縮圖（預留）
├── example/                   # 範例分析報告
├── robots.txt
├── sitemap.xml
└── .github/workflows/
    └── deploy.yml             # GitHub Pages 部署
```

## 本地開發

```bash
python3 -m http.server 8000
# 開啟 http://localhost:8000
```

## 新增作品

編輯 `data/projects.json`，加入新的物件：

```json
{
  "id": "example-id",
  "name": "商家名稱",
  "category": "業種",
  "location": "城市",
  "score": 75,
  "dimensions": {
    "basicInfo": 80,
    "reviews": 70,
    "photos": 75,
    "keywords": 65
  },
  "tags": ["關鍵字1", "關鍵字2"],
  "reportUrl": "example/report.html",
  "mapsUrl": "https://maps.google.com/...",
  "thumbnail": "assets/thumbnails/example.png"
}
```

## 授權

All rights reserved. 未經許可不得複製、散佈或使用本專案的任何內容。

---

[@dev.from.zero](https://www.threads.com/@dev.from.zero)

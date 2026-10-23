# iHerb MPD0133 — multilingual discount landing site

A static, 16-language landing page promoting the iHerb Rewards code **MPD0133**,
optimised for SEO (Google), GEO (AI engines) and AEO (answer boxes).
Builds and deploys to **GitHub Pages** automatically via **GitHub Actions**.

**Live site:** https://jacky97s.github.io/iherb-deal/

## How it works

- `build/generate.py` + `build/translations.py` generate 16 language pages
  (English, 繁中, 简中, 日, 한, ES, PT, DE, FR, IT, RU, AR, ID, TH, VI, HI)
  plus `sitemap.xml`, `robots.txt`, `llms.txt`, PWA manifest and service worker.
- `build/assets/` holds the pre-rendered social image and app icons.
- `.github/workflows/deploy.yml` runs on every push to `main`: it builds the
  `site/` folder and deploys it to GitHub Pages. The canonical/hreflang URLs are
  filled in automatically from the real Pages URL — no manual editing needed.

The generated `site/` folder is not committed; GitHub Actions rebuilds it.

## One-time setup

1. Push this repository to `github.com/jacky97s/iherb-deal` (public).
2. In the repo: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. The workflow runs automatically; the site is live in ~2 minutes.

## Editing the site

Edit `build/translations.py` (wording) or `build/generate.py` (layout/SEO),
commit, and push — GitHub Actions redeploys automatically.

To rebuild locally: `python3 build/generate.py https://jacky97s.github.io/iherb-deal`

## Disclaimer

Independent page sharing the iHerb Rewards code MPD0133. iHerb promotions may
change; the code applies the best available rewards offer at checkout. iHerb is
a trademark of its respective owner.

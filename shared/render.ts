import type { Site } from './types.ts';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,660&family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@560;700&family=Outfit:wght@400;500;600&display=swap';

export function renderSiteHtml(site: Site, options: { interactive?: boolean } = {}): string {
  const interactive = options.interactive ?? false;
  const initial = escapeHtml(site.hero.name.trim().charAt(0) || '·');
  const projects = site.projects.items
    .map((item, index) => {
      const tags = item.highlights.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('');
      const links = [
        `<a href="${safeUrl(item.url)}">GitHub</a>`,
        item.homepage ? `<a href="${safeUrl(item.homepage)}">${site.language === 'en' ? 'Live' : '網站'}</a>` : '',
      ]
        .filter(Boolean)
        .join('');
      return `<li data-section="project:${escapeHtml(item.repo)}">
        <span class="index">${String(index + 1).padStart(2, '0')}</span>
        <div>
          <h3>${escapeHtml(item.name)}${item.language ? `<em>${escapeHtml(item.language)}</em>` : ''}</h3>
          <p>${escapeHtml(item.description)}</p>
          ${tags ? `<ul class="tags">${tags}</ul>` : ''}
          <p class="links">${links}</p>
        </div>
      </li>`;
    })
    .join('');
  const skills = site.skills.items
    .map((item) => `<li><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.detail)}</span></li>`)
    .join('');
  const contacts = site.contact.links
    .map((link) => `<a href="${safeUrl(link.href)}">${escapeHtml(link.label)}</a>`)
    .join('');
  const script = interactive
    ? `<script>
      document.querySelectorAll('[data-section]').forEach((el) => {
        el.addEventListener('click', (event) => {
          if (event.target.closest('a')) return;
          event.stopPropagation();
          parent.postMessage({ type: 'portfolio-select', section: el.getAttribute('data-section') }, '*');
        });
      });
      window.addEventListener('message', (event) => {
        if (!event.data || event.data.type !== 'portfolio-select') return;
        document.querySelectorAll('[data-section]').forEach((el) => {
          el.classList.toggle('is-selected', el.getAttribute('data-section') === event.data.section);
        });
      });
    </script>`
    : '';
  return `<!doctype html>
<html lang="${site.language === 'en' ? 'en' : 'zh-Hant'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(site.hero.name)} · ${escapeHtml(site.hero.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${FONT_HREF}" />
  <style>${css}</style>
</head>
<body class="theme-${site.theme}">
  <article>
    <header data-section="hero">
      <p class="kicker">${escapeHtml(site.hero.kicker)}</p>
      <div class="hero-row">
        <span class="avatar" data-initial="${initial}">
          ${site.hero.avatarUrl ? `<img alt="" src="${safeUrl(site.hero.avatarUrl)}" onerror="this.remove()" />` : ''}
        </span>
        <div>
          <h1>${escapeHtml(site.hero.name)}</h1>
          <p class="title">${escapeHtml(site.hero.title)}</p>
        </div>
      </div>
      <p class="tagline">${escapeHtml(site.hero.tagline)}</p>
      <p class="meta">${[site.hero.location, site.username].filter(Boolean).map((item) => escapeHtml(item)).join(' · ')}</p>
    </header>
    <section data-section="about">
      <h2>${escapeHtml(site.about.heading)}</h2>
      <p>${escapeHtml(site.about.body)}</p>
    </section>
    <section data-section="projects">
      <h2>${escapeHtml(site.projects.heading)}</h2>
      <p class="intro">${escapeHtml(site.projects.intro)}</p>
      <ol class="projects">${projects}</ol>
    </section>
    <section data-section="skills">
      <h2>${escapeHtml(site.skills.heading)}</h2>
      <ul class="skills">${skills}</ul>
    </section>
    <footer data-section="contact">
      <h2>${escapeHtml(site.contact.heading)}</h2>
      <p>${escapeHtml(site.contact.blurb)}</p>
      <nav>${contacts}</nav>
    </footer>
  </article>
  ${script}
</body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function safeUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return escapeHtml(trimmed);
  return '#';
}

const css = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  font-family: "Noto Sans TC", "PingFang TC", "WenQuanYi Micro Hei", sans-serif;
  line-height: 1.6;
}
article { max-width: 880px; margin: 0 auto; padding: 48px 32px 72px; }
h1, h2, h3, p { margin: 0; }
a { color: inherit; }
[data-section] { cursor: pointer; border-radius: 18px; }
[data-section].is-selected { outline: 2px solid var(--mark); outline-offset: 6px; }
.kicker { letter-spacing: 0.22em; text-transform: uppercase; font-size: 12px; font-weight: 700; }
.hero-row { display: flex; gap: 20px; align-items: center; margin-top: 18px; }
.avatar {
  width: 84px; height: 84px; border-radius: 50%;
  display: grid; place-items: center; overflow: hidden; flex: none;
  background: var(--mark); color: var(--on-mark); font-family: Fraunces, "Noto Serif TC", serif; font-size: 32px;
}
.avatar::before { content: attr(data-initial); grid-area: 1 / 1; }
.avatar img { width: 100%; height: 100%; object-fit: cover; grid-area: 1 / 1; position: relative; }
h1 { font-family: Fraunces, "Noto Serif TC", serif; font-size: clamp(48px, 8vw, 84px); line-height: 0.92; font-weight: 560; letter-spacing: -0.03em; }
.title { margin-top: 8px; font-size: 18px; font-weight: 700; }
.tagline { margin-top: 22px; max-width: 38rem; font-family: Fraunces, "Noto Serif TC", serif; font-size: 26px; line-height: 1.35; font-weight: 560; }
.meta { margin-top: 14px; font-size: 13px; letter-spacing: 0.04em; opacity: 0.72; }
section, footer { margin-top: 42px; }
h2 { font-family: Fraunces, "Noto Serif TC", serif; font-size: 28px; font-weight: 560; margin-bottom: 10px; }
.intro { max-width: 40rem; margin-bottom: 8px; }
.projects { list-style: none; margin: 18px 0 0; padding: 0; display: grid; gap: 18px; }
.projects li { display: grid; grid-template-columns: auto 1fr; gap: 16px; padding-top: 16px; }
.index { font-family: Fraunces, serif; font-size: 22px; font-variant-numeric: tabular-nums; }
.projects h3 { font-size: 20px; display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.projects h3 em { font-style: normal; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.62; }
.projects p { margin-top: 6px; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 10px 0 0; padding: 0; }
.tags li { border: 1px solid var(--line); border-radius: 999px; padding: 2px 8px; font-size: 12px; }
.links { display: flex; gap: 14px; font-size: 14px; font-weight: 700; }
.links a { text-underline-offset: 3px; }
.skills { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 12px; }
.skills li { display: grid; gap: 2px; }
.skills strong { font-size: 15px; }
.skills span { opacity: 0.8; }
footer nav { display: flex; flex-wrap: wrap; gap: 10px 16px; margin-top: 14px; font-weight: 700; }
.theme-ink { background: #f3ecdf; color: #221c16; --mark: #9a3412; --on-mark: #fff7ed; --line: #d7cbb8; }
.theme-ink .projects li { border-top: 1px solid var(--line); }
.theme-ink .kicker { color: var(--mark); }
.theme-studio { background: #f6f7f4; color: #14221f; --mark: #0f766e; --on-mark: #f0fdfa; --line: #d5ddd8; }
.theme-studio article { border-left: 10px solid var(--mark); padding-left: 28px; }
.theme-studio .projects { grid-template-columns: 1fr 1fr; }
.theme-studio .projects li { display: block; background: white; border: 1px solid var(--line); border-radius: 16px; padding: 16px; }
.theme-studio .index { display: block; margin-bottom: 8px; color: var(--mark); }
.theme-night { background: #12141a; color: #ece7dc; --mark: #e2b657; --on-mark: #1a1408; --line: #343846; color-scheme: dark; }
.theme-night .projects li { border-top: 1px solid var(--line); }
.theme-night a { color: var(--mark); }
.theme-night .kicker, .theme-night .index { color: var(--mark); }
@media (max-width: 720px) {
  article { padding: 32px 18px 56px; }
  .theme-studio .projects { grid-template-columns: 1fr; }
  h1 { font-size: 52px; }
}
`;

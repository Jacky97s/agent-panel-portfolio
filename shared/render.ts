import type { Site } from './types.ts';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560&family=Noto+Sans+TC:wght@400;700&family=Noto+Serif+TC:wght@600&display=swap';

export function renderSiteHtml(site: Site, options: { interactive?: boolean } = {}): string {
  const interactive = options.interactive ?? false;
  const en = site.language === 'en';
  const initial = escapeHtml(site.hero.name.trim().charAt(0) || '·');
  const projects = site.projects.items
    .map((item) => {
      const tags = item.highlights.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('');
      const links = [
        `<a href="${safeUrl(item.url)}">GitHub</a>`,
        item.homepage ? `<a href="${safeUrl(item.homepage)}">${en ? 'Live' : '網站'}</a>` : '',
      ]
        .filter(Boolean)
        .join('');
      return `<li data-section="project:${escapeHtml(item.repo)}">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          ${item.language ? `<p class="small">${escapeHtml(item.language)}</p>` : ''}
        </div>
        <div>
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
  // The kicker is folded into the meta line under the action, never set above a heading.
  const meta = [site.hero.kicker, site.hero.location, site.username].filter(Boolean).map(escapeHtml).join(' · '); // taste-skill-ignore
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
<html lang="${en ? 'en' : 'zh-Hant'}">
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
      <div class="hero-row">
        <span class="avatar" data-initial="${initial}">
          ${site.hero.avatarUrl ? `<img alt="" src="${safeUrl(site.hero.avatarUrl)}" onerror="this.remove()" />` : ''}
        </span>
        <p class="title">${escapeHtml(site.hero.title)}</p>
      </div>
      <h1>${escapeHtml(site.hero.name)}</h1>
      <p class="tagline">${escapeHtml(site.hero.tagline)}</p>
      <div class="hero-foot">
        <a class="button" href="${safeUrl(site.hero.githubUrl)}">${en ? 'See the code on GitHub' : '到 GitHub 看程式碼'}</a>
        <p class="small">${meta}</p>
      </div>
    </header>
    <section class="split" data-section="about">
      <h2>${escapeHtml(site.about.heading)}</h2>
      <p class="lead">${escapeHtml(site.about.body)}</p>
    </section>
    <section data-section="projects">
      <div class="split">
        <h2>${escapeHtml(site.projects.heading)}</h2>
        <p class="lead">${escapeHtml(site.projects.intro)}</p>
      </div>
      <ol class="projects">${projects}</ol>
    </section>
    <section class="split" data-section="skills">
      <h2>${escapeHtml(site.skills.heading)}</h2>
      <ul class="skills">${skills}</ul>
    </section>
  </article>
  <footer data-section="contact">
    <div class="inner">
      <h2>${escapeHtml(site.contact.heading)}</h2>
      <p class="lead">${escapeHtml(site.contact.blurb)}</p>
      <nav>${contacts}</nav>
      <p class="signature">${escapeHtml(site.hero.name)}</p>
    </div>
  </footer>
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
  font-size: 19px;
  line-height: 1.6;
  background: var(--ground);
  color: var(--ink);
}
article, footer .inner { max-width: 1120px; margin: 0 auto; padding: 0 48px; }
article { padding-top: 64px; }
h1, h2, h3, p { margin: 0; }
h1, h2, .signature { font-family: var(--display); font-weight: var(--display-weight); letter-spacing: -0.03em; }
a { color: inherit; text-underline-offset: 4px; text-decoration-thickness: 2px; }
a:hover { color: var(--mark); }
[data-section] { cursor: pointer; border-radius: 12px; }
[data-section].is-selected { outline: 3px solid var(--mark); outline-offset: 10px; }
.small { font-size: 15px; color: var(--soft); }
.lead { max-width: 34em; }
.split > .lead { font-size: 28px; line-height: 1.45; max-width: 24em; }
.hero-row { display: flex; gap: 16px; align-items: center; }
.avatar {
  width: 72px; height: 72px; border-radius: 50%;
  display: grid; place-items: center; overflow: hidden; flex: none;
  background: var(--mark); color: var(--on-mark); font-family: var(--display); font-size: 28px;
}
.avatar::before { content: attr(data-initial); grid-area: 1 / 1; }
.avatar img { width: 100%; height: 100%; object-fit: cover; grid-area: 1 / 1; position: relative; }
.title { font-size: 28px; font-weight: 700; }
h1 { margin-top: 24px; font-size: clamp(64px, 14vw, 200px); line-height: var(--display-leading); }
.tagline { margin-top: 36px; max-width: 20em; font-family: var(--display); font-size: 28px; line-height: 1.35; }
.hero-foot { display: flex; flex-wrap: wrap; gap: 16px 24px; align-items: center; margin-top: 40px; }
.button {
  display: inline-flex; align-items: center; min-height: 48px; padding: 0 22px;
  background: var(--mark); color: var(--on-mark); border-radius: 999px;
  font-weight: 700; text-decoration: none; transition: transform 160ms ease, background 160ms ease;
}
.button:hover { color: var(--on-mark); transform: translateY(-2px); }
.button:active { transform: translateY(0); }
section { margin-top: 144px; }
h2 { font-size: 40px; line-height: 1.1; }
.split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 24px 48px; align-items: start; }
.projects { list-style: none; margin: 72px 0 0; padding: 0; display: grid; gap: 64px; }
.projects > li { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 8px 48px; }
.projects h3 { font-size: 28px; line-height: 1.2; overflow-wrap: anywhere; }
.projects > li > div:last-child { display: grid; gap: 14px; justify-items: start; }
.projects > li > div:last-child > p:first-child { max-width: 34em; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; margin: 0; padding: 0; }
.tags li { background: var(--tone); border-radius: 999px; padding: 3px 12px; font-size: 15px; }
.links { display: flex; gap: 20px; font-weight: 700; }
.skills { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px 48px; }
.skills li { display: grid; gap: 4px; }
.skills strong { font-size: 28px; line-height: 1.2; }
footer { margin-top: 160px; padding: 96px 0 48px; background: var(--mark); color: var(--on-mark); overflow: hidden; }
footer nav { display: flex; flex-wrap: wrap; gap: 12px 32px; margin-top: 32px; font-size: 28px; font-weight: 700; }
footer a:hover { color: inherit; opacity: 0.8; }
footer .lead { margin-top: 20px; }
.signature { margin-top: 96px; font-size: clamp(64px, 14vw, 200px); line-height: 0.9; white-space: nowrap; }
.theme-ink { --ground: #ecebe6; --ink: #1a1917; --soft: #57544e; --tone: #e0ded7; --mark: #b8281d; --on-mark: #ffffff; --display: Fraunces, "Noto Serif TC", serif; --display-weight: 600; --display-leading: 0.92; }
.theme-studio { --ground: #f4f5f2; --ink: #13201d; --soft: #4a5753; --tone: #e3e9e5; --mark: #0f766e; --on-mark: #effcf9; --display: "Noto Sans TC", sans-serif; --display-weight: 700; --display-leading: 1.05; }
.theme-night { --ground: #111318; --ink: #ecebe6; --soft: #a9a59c; --tone: #1d2029; --mark: #e2b657; --on-mark: #17130a; --display: Fraunces, "Noto Serif TC", serif; --display-weight: 600; --display-leading: 0.92; color-scheme: dark; }
@media (prefers-reduced-motion: reduce) {
  .button { transition: none; }
  .button:hover { transform: none; }
}
@media (max-width: 1024px) {
  .split { grid-template-columns: 1fr; }
  .split > .lead { font-size: 22px; }
}
@media (max-width: 720px) {
  body { font-size: 17px; }
  article, footer .inner { padding: 0 20px; }
  article { padding-top: 32px; }
  .title, .tagline { font-size: 22px; }
  .split > .lead { font-size: inherit; }
  h2 { font-size: 32px; }
  section { margin-top: 96px; }
  .projects > li, .skills { grid-template-columns: 1fr; }
  .projects { gap: 48px; }
  .projects h3, .skills strong, footer nav { font-size: 22px; }
  footer { margin-top: 112px; padding-top: 64px; }
  .signature { font-size: 18vw; margin-top: 64px; }
}
`;

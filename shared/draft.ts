import type { GithubCache, GithubRepo, LanguageId, Site, SiteProject, ToneId } from './types.ts';

export type DraftAnswers = {
  tone: ToneId;
  language: LanguageId;
  featured: string[];
};

type Blurb = {
  name: string;
  homepage?: string;
  highlights: string[];
  zh: string;
  en: string;
};

const KNOWN: Record<string, Blurb> = {
  'agent-panel': {
    name: 'agent-panel',
    highlights: ['ACP 能力層', '可寫入目錄與工具政策', 'Claude Code / Codex'],
    zh: '把代理面板嵌進任何網站：capability、可寫入目錄與工具允許清單，接到使用者自己的 Claude Code 或 Codex。',
    en: 'An embeddable agent panel. Capabilities, writable roots, and tool policy sit on top of the Agent Client Protocol, using the person’s own Claude Code or Codex.',
  },
  'pytest-synapse': {
    name: 'pytest-synapse',
    highlights: ['OpenAPI 覆蓋率', '攔截 requests / httpx', 'CI 報告'],
    zh: 'pytest 外掛。測試跑起來時攔截 HTTP，對上 OpenAPI 規格，算出路徑、狀態碼與 schema 的合約覆蓋率。',
    en: 'A pytest plugin that intercepts HTTP during tests and maps it onto an OpenAPI spec, so contract coverage is visible in CI.',
  },
  'gbp-seo-portfolio': {
    name: 'GBP SEO',
    homepage: 'https://gbp-seo.devfromzero.xyz',
    highlights: ['Google 商家檔案', '四維度評分', '單頁作品集'],
    zh: '給在地商家的 Google 商家檔案分析站。四個維度打分，把地圖曝光的弱點講成具體的下一步。',
    en: 'A one-page portfolio for Google Business Profile audits. Four scored dimensions turn map-visibility gaps into concrete next steps.',
  },
  'parking-calculator-ai': {
    name: 'ParkPal',
    highlights: ['費率圖片解析', '動態計費', '純前端'],
    zh: '上傳停車場費率照片，解析成規則，再算出停車費。介面是純 HTML，資料留在瀏覽器裡。',
    en: 'Upload a photo of parking rates, turn it into rules, and estimate the fee. The page is plain HTML and keeps data in the browser.',
  },
  'shutup-bot': {
    name: 'ShutUpBot',
    homepage: 'https://shutup-bot.zeabur.app/',
    highlights: ['委婉拒絕', '多圖上下文', '瀏覽器內處理'],
    zh: '幫人寫一封得體的拒絕。文字和圖片一起看，產出可以複製或存成圖片的回覆。',
    en: 'Drafts a polite decline from text and images, then lets you copy it or save it as a picture.',
  },
  'iherb-deal': {
    name: 'iHerb Deal',
    homepage: 'https://jacky97s.github.io/iherb-deal/',
    highlights: ['16 種語言', 'GitHub Pages', 'SEO / GEO'],
    zh: '十六種語言的優惠落地頁，推上去就由 GitHub Actions 建置並部署，hreflang 與 sitemap 一起生成。',
    en: 'A 16-language landing page. GitHub Actions builds and deploys it, including hreflang and the sitemap.',
  },
  'fastapi-gzip-demo': {
    name: 'FastAPI Gzip',
    highlights: ['Gzip middleware', '26 MB → 3.8 MB', '對照實驗'],
    zh: '同一個 JSON，開與不開 Gzip middleware 的對照。原始 26 MB，壓縮後約 3.8 MB。',
    en: 'A side-by-side of the same JSON with and without Gzip middleware: 26 MB down to about 3.8 MB.',
  },
  'guanchan-pickup-map': {
    name: '觀展牛奶車',
    homepage: 'https://gz-milk-daily.vercel.app/',
    highlights: ['銷售據點', '地圖'],
    zh: '觀展牛奶車的銷售據點頁，把取貨地點放上一張看得到的地圖。',
    en: 'A pickup map for the Guanchan milk truck, with the stops laid out on a page people can actually scan.',
  },
  'f-string-ranking': {
    name: 'f-string Ranking',
    highlights: ['Python', '文字圖表'],
    zh: '用 f-string 在終端機畫出排行長條，一行資料、一條比例。',
    en: 'A terminal bar chart drawn with f-strings: one row of data, one proportional bar.',
  },
};

const PREFERRED = [
  'agent-panel',
  'pytest-synapse',
  'gbp-seo-portfolio',
  'parking-calculator-ai',
  'shutup-bot',
  'iherb-deal',
];

const SECTION_LABEL: Record<string, { 'zh-Hant': string; en: string }> = {
  hero: { 'zh-Hant': '首頁', en: 'Hero' },
  about: { 'zh-Hant': '關於', en: 'About' },
  projects: { 'zh-Hant': '專案', en: 'Projects' },
  skills: { 'zh-Hant': '技能', en: 'Skills' },
  contact: { 'zh-Hant': '聯絡', en: 'Contact' },
};

export function defaultFeatured(cache: GithubCache): string[] {
  const names = new Set(cache.repos.filter((repo) => !repo.fork).map((repo) => repo.name));
  const preferred = PREFERRED.filter((name) => names.has(name)).slice(0, 4);
  if (preferred.length >= 3) return preferred;
  return cache.repos
    .filter((repo) => !repo.fork && repo.name !== cache.user.login && (repo.description || repo.language))
    .slice(0, 4)
    .map((repo) => repo.name);
}

export function featuredChoices(cache: GithubCache): { value: string; label: string }[] {
  const names = new Set(cache.repos.map((repo) => repo.name));
  const groups = [
    ['agent-panel', 'pytest-synapse', 'gbp-seo-portfolio'],
    ['agent-panel', 'shutup-bot', 'iherb-deal'],
    ['pytest-synapse', 'parking-calculator-ai', 'fastapi-gzip-demo'],
  ];
  const available = groups
    .map((group) => group.filter((name) => names.has(name)))
    .filter((group) => group.length >= 2);
  const source = available.length > 0 ? available : [defaultFeatured(cache)];
  return source.map((group) => ({
    value: group.join(','),
    label: group.map((name) => KNOWN[name]?.name ?? name).join('、'),
  }));
}

export function draftSite(cache: GithubCache, answers: DraftAnswers, previous?: Site | null): Site {
  const language = answers.language;
  const tone = answers.tone;
  const wanted = (answers.featured.length > 0 ? answers.featured : defaultFeatured(cache)).slice(0, 6);
  const byName = new Map(cache.repos.map((repo) => [repo.name.toLowerCase(), repo]));
  const items = wanted
    .map((name) => byName.get(name.toLowerCase()))
    .filter((repo): repo is GithubRepo => Boolean(repo))
    .map((repo) => projectFromRepo(repo, language, tone));
  const person = cache.user.name?.trim() || cache.user.login;
  const voice = voiceCopy(language, tone, person, cache);
  return {
    username: cache.user.login,
    theme: previous?.theme ?? 'ink',
    language,
    tone,
    hero: {
      kicker: voice.kicker,
      name: person,
      title: voice.title,
      tagline: voice.tagline,
      location: localPlace(cache.user.location?.trim() ?? '', language),
      avatarUrl: cache.user.avatar_url,
      githubUrl: cache.user.html_url,
    },
    about: { heading: voice.aboutHeading, body: voice.about },
    projects: { heading: voice.projectsHeading, intro: voice.projectsIntro, items },
    skills: { heading: voice.skillsHeading, items: skillsFrom(cache, items, language, tone) },
    contact: {
      heading: voice.contactHeading,
      blurb: voice.contact,
      github: cache.user.html_url,
      links: contactLinks(cache, items),
    },
  };
}

export function rewriteSection(site: Site, section: string): Site {
  const language = site.language;
  const copy = sdetCopy(language);
  const next: Site = structuredClone(site);
  next.tone = 'sdet';
  if (section === 'hero') {
    next.hero.title = copy.heroTitle;
    next.hero.tagline = copy.heroTagline;
    return next;
  }
  if (section === 'about' || section === '') {
    next.about.heading = copy.aboutHeading;
    next.about.body = copy.aboutBody;
    return next;
  }
  if (section === 'projects') {
    next.projects.intro = copy.projectsIntro;
    return next;
  }
  if (section === 'skills') {
    next.skills.items = next.skills.items.map((item) => ({
      ...item,
      detail: copy.skillDetail(item.name),
    }));
    return next;
  }
  if (section === 'contact') {
    next.contact.blurb = copy.contactBlurb;
    return next;
  }
  if (section.startsWith('project:')) {
    const repo = section.slice('project:'.length);
    next.projects.items = next.projects.items.map((item) =>
      item.repo.toLowerCase() === repo.toLowerCase()
        ? { ...item, description: copy.projectDescription(item.name) }
        : item,
    );
  }
  return next;
}

export function moveProjectFirst(site: Site, repoName: string, cache?: GithubCache | null): Site {
  const next: Site = structuredClone(site);
  const items = next.projects.items;
  const index = items.findIndex(
    (item) => item.repo.toLowerCase() === repoName.toLowerCase() || item.name.toLowerCase() === repoName.toLowerCase(),
  );
  if (index === 0) return next;
  if (index > 0) {
    const [item] = items.splice(index, 1);
    if (item) items.unshift(item);
    return next;
  }
  const repo = cache?.repos.find((item) => item.name.toLowerCase() === repoName.toLowerCase());
  if (!repo) return next;
  items.unshift(projectFromRepo(repo, site.language, site.tone));
  next.projects.items = items.slice(0, 6);
  return next;
}

export function sectionSnapshot(site: Site, section: string): unknown {
  if (section === 'hero') return site.hero;
  if (section === 'about') return site.about;
  if (section === 'projects') return { heading: site.projects.heading, intro: site.projects.intro };
  if (section === 'skills') return site.skills;
  if (section === 'contact') return { heading: site.contact.heading, blurb: site.contact.blurb };
  if (section.startsWith('project:')) {
    const repo = section.slice('project:'.length).toLowerCase();
    return site.projects.items.find((item) => item.repo.toLowerCase() === repo) ?? null;
  }
  return null;
}

export function sectionLabel(section: string, language: LanguageId = 'zh-Hant'): string {
  const known = SECTION_LABEL[section];
  if (known) return known[language];
  if (section.startsWith('project:')) return section.slice('project:'.length);
  return section;
}

function projectFromRepo(repo: GithubRepo, language: LanguageId, tone: ToneId): SiteProject {
  const known = KNOWN[repo.name];
  const description = known ? (language === 'en' ? known.en : known.zh) : fallbackDescription(repo, language);
  const sdetLead =
    language === 'en'
      ? `As an SDET lead I would keep ${known?.name ?? repo.name} on the path that blocks a bad change before trunk.`
      : `以 SDET 主管的標準，${known?.name ?? repo.name} 要在變更進主幹之前就給出可重複的訊號。`;
  return {
    repo: repo.name,
    name: known?.name ?? repo.name,
    description: tone === 'sdet' ? sdetLead : description,
    url: repo.html_url,
    ...(known?.homepage || repo.homepage ? { homepage: known?.homepage || repo.homepage || undefined } : {}),
    ...(repo.language ? { language: repo.language } : {}),
    highlights: known?.highlights ?? (repo.language ? [repo.language] : []),
  };
}

function fallbackDescription(repo: GithubRepo, language: LanguageId): string {
  if (repo.description) return repo.description;
  if (language === 'en') return `${repo.name} is a public repository${repo.language ? ` written in ${repo.language}` : ''}.`;
  return `${repo.name} 是公開專案${repo.language ? `，主要用 ${repo.language}` : ''}。`;
}

function skillsFrom(
  cache: GithubCache,
  items: SiteProject[],
  language: LanguageId,
  tone: ToneId,
): { name: string; detail: string }[] {
  const counts = new Map<string, number>();
  for (const repo of cache.repos) {
    if (!repo.language || repo.fork) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  for (const item of items) {
    if (!item.language) continue;
    counts.set(item.language, (counts.get(item.language) ?? 0) + 2);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return ranked.map(([name]) => ({
    name,
    detail:
      tone === 'sdet'
        ? sdetCopy(language).skillDetail(name)
        : skillDetail(name, language),
  }));
}

function contactLinks(cache: GithubCache, items: SiteProject[]): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [{ label: 'GitHub', href: cache.user.html_url }];
  if (cache.user.blog) links.push({ label: blogLabel(cache.user.blog), href: cache.user.blog });
  for (const item of items) {
    if (item.homepage) links.push({ label: item.name, href: item.homepage });
  }
  return links;
}

function quoted(bio: string | undefined): string {
  return bio ? `「${bio}」` : '';
}

function skillDetail(name: string, language: LanguageId): string {
  const details: Record<string, { 'zh-Hant': string; en: string }> = {
    TypeScript: {
      'zh-Hant': '代理面板、型別與前端工具鏈。',
      en: 'The agent panel, types, and the frontend toolchain.',
    },
    Python: {
      'zh-Hant': '合約測試、頁面產生器與小實驗。',
      en: 'Contract tests, page generators, and small experiments.',
    },
    JavaScript: {
      'zh-Hant': '瀏覽器裡就能跑完的小工具。',
      en: 'Small tools that run entirely in the browser.',
    },
    HTML: {
      'zh-Hant': '單頁作品集與據點頁。',
      en: 'One-page portfolios and a pickup map.',
    },
  };
  const known = details[name];
  if (known) return known[language];
  return language === 'en' ? `Used in the public repos that carry ${name}.` : `公開專案裡實際在用的 ${name}。`;
}

function localPlace(location: string, language: LanguageId): string {
  if (!location) return '';
  if (language !== 'zh-Hant') return location;
  if (/^taiwan$/i.test(location)) return '台灣';
  if (/^taipei$/i.test(location)) return '台北';
  return location;
}

function blogLabel(blog: string): string {
  if (blog.includes('instagram.com')) return 'Instagram';
  try {
    return new URL(blog).host;
  } catch {
    return blog;
  }
}

function voiceCopy(language: LanguageId, tone: ToneId, person: string, cache: GithubCache) {
  const bio = cache.user.bio?.trim();
  const place = localPlace(cache.user.location?.trim() ?? '', language);
  if (tone === 'sdet') {
    const copy = sdetCopy(language);
    return {
      kicker: language === 'en' ? 'Portfolio' : '作品集',
      title: copy.heroTitle,
      tagline: copy.heroTagline,
      aboutHeading: copy.aboutHeading,
      about: copy.aboutBody,
      projectsHeading: language === 'en' ? 'Selected work' : '精選專案',
      projectsIntro: copy.projectsIntro,
      skillsHeading: language === 'en' ? 'Stack' : '技能',
      contactHeading: language === 'en' ? 'Contact' : '聯絡',
      contact: copy.contactBlurb,
    };
  }
  if (language === 'en') {
    const warm = tone === 'warm';
    return {
      kicker: 'Portfolio',
      title: 'Full-stack developer',
      tagline: warm
        ? `I like starting from an empty folder. ${bio ?? 'These are the public pieces.'}`
        : (bio ?? 'Full-stack developer. Building things from zero.'),
      aboutHeading: 'About',
      about: warm
        ? `${person}${place ? ` is based in ${place}` : ''}. The public repos are small on purpose: an agent panel, contract-test tooling, and pages that ship.`
        : `${person}${place ? `, ${place}` : ''}. ${bio ?? 'Full-stack developer.'} The work below is the public trail: agent infrastructure, API contract tests, and single-page sites.`,
      projectsHeading: 'Selected work',
      projectsIntro: 'A few repositories that show how the work is actually shaped.',
      skillsHeading: 'Stack',
      contactHeading: 'Contact',
      contact: `The useful door is GitHub. ${cache.user.public_repos} public repositories, ${cache.user.followers} followers.`,
    };
  }
  const warm = tone === 'warm';
  return {
    kicker: '作品集',
    title: '全端工程師',
    tagline: warm ? '我習慣從空資料夾開始，做小而能上線的東西。' : '從零把東西做出來。',
    aboutHeading: '關於',
    about: warm
      ? `${person}${place ? `，在${place}` : ''}。${quoted(bio)}公開的東西故意做小：代理面板、合約測試，還有真的會上線的單頁。`
      : `${person}${place ? `，在${place}` : ''}。${quoted(bio)}下面是公開的軌跡：代理基礎建設、API 合約測試，以及單頁網站。`,
    projectsHeading: '精選專案',
    projectsIntro: '挑幾個看得清楚形狀的公開專案。',
    skillsHeading: '技能',
    contactHeading: '聯絡',
    contact: `找我從 GitHub 進來就好。公開專案 ${cache.user.public_repos} 個。`,
  };
}

function sdetCopy(language: LanguageId) {
  if (language === 'en') {
    return {
      heroTitle: 'SDET Manager',
      heroTagline: 'Quality sits inside the delivery cadence: contracts, coverage, and the gate before trunk.',
      aboutHeading: 'About',
      aboutBody:
        'I lead an SDET group across the delivery chain. Specs become contract tests, coverage blocks a release that should not ship, and defects are visible before they reach trunk. Tools change. The cadence does not.',
      projectsIntro: 'These projects are how I turn a test strategy into something a team can run every day.',
      contactBlurb: 'If you want to talk test strategy, release cadence, or how to staff an SDET group, start on GitHub.',
      skillDetail: (name: string) => `${name} is a shared language for the quality bar on each change.`,
      projectDescription: (name: string) =>
        `Held to an SDET manager’s bar, ${name} has to produce a repeatable signal before a change reaches trunk.`,
    };
  }
  return {
    heroTitle: 'SDET 主管',
    heroTagline: '把品質放進交付節奏：合約、覆蓋率、發布閘門，都在進主幹之前發生。',
    aboutHeading: '關於',
    aboutBody:
      '我帶 SDET 團隊看整條交付鏈。規格要能變成合約測試，覆蓋率要能擋住不該出的版本，缺陷要在進主幹之前被看見。工具會換，節奏不會。',
    projectsIntro: '這些專案是我把測試策略做成團隊每天跑得動的工具。',
    contactBlurb: '想聊測試策略、發布節奏，或怎麼組一個 SDET 小組，直接從 GitHub 找我。',
    skillDetail: (name: string) => `${name} 是團隊的共用語言，用來把品質門檻寫進每天的變更。`,
    projectDescription: (name: string) => `以 SDET 主管的標準，${name} 要在變更進主幹之前就給出可重複的訊號。`,
  };
}

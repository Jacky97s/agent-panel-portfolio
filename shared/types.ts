export const THEMES = ['ink', 'studio', 'night'] as const;
export const LANGUAGES = ['zh-Hant', 'en'] as const;
export const TONES = ['professional', 'warm', 'sdet'] as const;

export type ThemeId = (typeof THEMES)[number];
export type LanguageId = (typeof LANGUAGES)[number];
export type ToneId = (typeof TONES)[number];

export type SiteProject = {
  repo: string;
  name: string;
  description: string;
  url: string;
  homepage?: string;
  language?: string;
  highlights: string[];
};

export type Site = {
  username: string;
  theme: ThemeId;
  language: LanguageId;
  tone: ToneId;
  hero: {
    kicker: string;
    name: string;
    title: string;
    tagline: string;
    location: string;
    avatarUrl: string;
    githubUrl: string;
  };
  about: {
    heading: string;
    body: string;
  };
  projects: {
    heading: string;
    intro: string;
    items: SiteProject[];
  };
  skills: {
    heading: string;
    items: { name: string; detail: string }[];
  };
  contact: {
    heading: string;
    blurb: string;
    github: string;
    links: { label: string; href: string }[];
  };
};

export type GithubRepo = {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  topics: string[];
  updated_at: string;
  homepage: string | null;
  default_branch?: string;
  readmeExcerpt?: string;
};

export type GithubCache = {
  fetchedAt: string;
  user: {
    login: string;
    name: string | null;
    bio: string | null;
    avatar_url: string;
    html_url: string;
    blog: string | null;
    location: string | null;
    public_repos: number;
    followers: number;
  };
  repos: GithubRepo[];
};

export type SectionId =
  | 'hero'
  | 'about'
  | 'projects'
  | 'skills'
  | 'contact'
  | `project:${string}`;

export function isTheme(value: string): value is ThemeId {
  return (THEMES as readonly string[]).includes(value);
}

export function isLanguage(value: string): value is LanguageId {
  return (LANGUAGES as readonly string[]).includes(value);
}

export function isTone(value: string): value is ToneId {
  return (TONES as readonly string[]).includes(value);
}

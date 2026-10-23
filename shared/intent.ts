import type { ToneId } from './types.ts';

export type PortfolioIntent =
  | { type: 'ask' }
  | { type: 'sdet'; section: string }
  | { type: 'reorder'; repo: string }
  | { type: 'generate'; tone: ToneId; language: 'zh-Hant' | 'en'; featured: string[] }
  | { type: 'unknown' };

const ASK = /詢問|問我|clarify|ask me|哪幾個專案|先確認|先問/;
const REORDER = /放第一|放到第一|放在第一|排到第一|排第一|put first/i;
const SDET = /sdet|主管口吻|更像主管/i;
const GENERATE = /生一個作品集|產生作品集|做一個作品集|做個作品集|建立作品集|build a portfolio|create a portfolio/i;

export function userText(prompt: string): string {
  const marker = '</agent-panel-capability>';
  const index = prompt.lastIndexOf(marker);
  return index >= 0 ? prompt.slice(index + marker.length) : prompt;
}

export function portfolioSection(prompt: string): string {
  const match = prompt.match(/portfolio-section:\s*(\S+)/);
  const value = match?.[1] ?? '';
  if (!value || value === '(none)') return '';
  return value;
}

export function mentionedRepos(text: string, repoNames: string[]): string[] {
  const lower = text.toLowerCase();
  return repoNames
    .filter((name) => lower.includes(name.toLowerCase()))
    .sort((a, b) => lower.indexOf(a.toLowerCase()) - lower.indexOf(b.toLowerCase()));
}

export function detectIntent(prompt: string, repoNames: string[]): PortfolioIntent {
  const text = userText(prompt);
  if (ASK.test(text)) return { type: 'ask' };
  if (REORDER.test(text)) {
    const mentioned = mentionedRepos(text, repoNames);
    return { type: 'reorder', repo: mentioned[0] ?? 'agent-panel' };
  }
  if (SDET.test(text)) return { type: 'sdet', section: portfolioSection(prompt) || 'about' };
  const language = /english|英文/i.test(text) ? 'en' : 'zh-Hant';
  const tone: ToneId = /親切|warm/i.test(text) ? 'warm' : 'professional';
  const featured = mentionedRepos(text, repoNames);
  const specified =
    /english|英文|繁體|中文/i.test(text) && /專業|親切|warm|direct/i.test(text) && featured.length > 0;
  if (GENERATE.test(text) && !specified) return { type: 'ask' };
  if (!GENERATE.test(text)) return { type: 'unknown' };
  return { type: 'generate', tone, language, featured };
}

export function parseFeaturedValue(value: string): string[] {
  return value
    .split(/[,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

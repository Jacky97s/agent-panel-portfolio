import { isLanguage, isTheme, isTone, type Site } from './types.ts';

export function parseSite(value: unknown): Site {
  if (!value || typeof value !== 'object') throw new Error('site.json 不是物件');
  const site = value as Site;
  if (!site.username || !site.hero?.name || !site.about?.body || !Array.isArray(site.projects?.items)) {
    throw new Error('site.json 缺少作品集欄位');
  }
  if (!isTheme(site.theme) || !isLanguage(site.language) || !isTone(site.tone)) {
    throw new Error('site.json 的主題、語言或語氣無法辨識');
  }
  return site;
}

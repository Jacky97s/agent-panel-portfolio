import { describe, expect, it } from 'vitest';
import { detectIntent, portfolioSection } from '../shared/intent.ts';

const repos = ['agent-panel', 'pytest-synapse', 'gbp-seo-portfolio', 'shutup-bot'];

describe('detectIntent', () => {
  it('asks before drafting a portfolio when tone and repos are missing', () => {
    expect(detectIntent('幫我用 Jacky97s 生一個作品集', repos)).toEqual({ type: 'ask' });
  });

  it('asks when the user requests a question card', () => {
    expect(detectIntent('請先詢問語氣、語言，以及要放上首頁的專案', repos)).toEqual({ type: 'ask' });
  });

  it('edits the selected section for an SDET voice', () => {
    const prompt = 'portfolio-section: about\n這段寫得更像 SDET 主管';
    expect(detectIntent(prompt, repos)).toEqual({ type: 'sdet', section: 'about' });
    expect(portfolioSection(prompt)).toBe('about');
  });

  it('moves the named repository first', () => {
    expect(detectIntent('把 agent-panel 放第一個', repos)).toEqual({
      type: 'reorder',
      repo: 'agent-panel',
    });
  });

  it('drafts directly when language, tone, and repos are all in the prompt', () => {
    const intent = detectIntent('用繁體中文、專業語氣，生一個作品集，放上 pytest-synapse 和 shutup-bot', repos);
    expect(intent).toMatchObject({
      type: 'generate',
      language: 'zh-Hant',
      tone: 'professional',
      featured: ['pytest-synapse', 'shutup-bot'],
    });
  });

  it('does not treat a freeform note as a full rewrite', () => {
    expect(detectIntent('portfolio-section: about\n這段再短一點', repos)).toEqual({ type: 'unknown' });
  });
});

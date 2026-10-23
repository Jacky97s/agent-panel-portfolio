import { describe, expect, it } from 'vitest';
import { draftSite } from '../shared/draft.ts';
import { renderSiteHtml } from '../shared/render.ts';
import type { GithubCache, Site } from '../shared/types.ts';

const cache = {
  fetchedAt: '2026-10-23T00:00:00.000Z',
  user: {
    login: 'ada',
    name: 'Ada <script>',
    bio: 'builds',
    avatar_url: 'https://example.com/a.png',
    html_url: 'https://github.com/ada',
    blog: null,
    location: 'Taipei',
    public_repos: 1,
    followers: 0,
  },
  repos: [
    {
      name: 'widget',
      description: '<img src=x onerror=alert(1)>',
      html_url: 'https://github.com/ada/widget',
      language: 'TypeScript',
      stargazers_count: 0,
      forks_count: 0,
      fork: false,
      topics: [],
      updated_at: '2026-10-23T00:00:00.000Z',
      homepage: 'javascript:alert(1)',
    },
  ],
} satisfies GithubCache;

function site(): Site {
  return draftSite(cache, { tone: 'professional', language: 'zh-Hant', featured: ['widget'] });
}

describe('renderSiteHtml', () => {
  it('escapes text and drops unsafe urls', () => {
    const html = renderSiteHtml(site(), { interactive: false });
    expect(html).toContain('Ada &lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img src=x');
    expect(html).toContain('href="#"');
    expect(html).toContain('class="theme-ink"');
    expect(html).toContain('class="button" href="https://github.com/ada"');
    expect(html).not.toContain('portfolio-select');
  });

  it('adds a selection hook for the live preview', () => {
    const html = renderSiteHtml({ ...site(), theme: 'night' }, { interactive: true });
    expect(html).toContain('class="theme-night"');
    expect(html).toContain('portfolio-select');
    expect(html).toContain('data-section="project:widget"');
  });
});

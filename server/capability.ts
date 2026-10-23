import fs from 'node:fs/promises';
import type { Capability } from '@agent-panel/core';
import { cachePath, readmeDir, sitePath } from './paths.ts';

export const PORTFOLIO_CAPABILITY = 'portfolio';

const ALLOWED_TOOLS = [
  'write', 'Write', 'edit', 'Edit', 'apply_patch', 'str_replace', 'search_replace',
  'read', 'Read', 'grep', 'Grep', 'glob', 'Glob', 'ls', 'LS', 'list', 'search',
];

export function createPortfolioCapability(root: string): Capability {
  return {
    id: PORTFOLIO_CAPABILITY,
    label: '作品集',
    systemPromptAppend: [
      'You draft a one-page portfolio by writing ONLY the JSON file named in the context as "site path".',
      'Read the GitHub cache and README files under the given paths. Do not modify them.',
      'Do not create other files, do not run shell commands, and do not edit application source.',
      'The JSON shape is: username, theme (ink|studio|night), language (zh-Hant|en), tone (professional|warm|sdet), hero, about, projects, skills, contact.',
      'hero has kicker, name, title, tagline, location, avatarUrl, githubUrl.',
      'about has heading and body. projects has heading, intro, and items (repo, name, description, url, optional homepage, optional language, highlights).',
      'skills has heading and items of name plus detail. contact has heading, blurb, github, and links of label plus href.',
      'Default copy is Traditional Chinese. Switch to English only when the user asks.',
      'If a portfolio-section is set, change only that section and keep every other field identical.',
      'If tone, language, or which repositories to feature are not specified, ask before writing.',
      'Ask with an ACP form elicitation (mode form) whose fields are tone, language, and featured.',
      'tone choices: professional (專業精煉), warm (親切敘事), sdet (SDET 主管).',
      'language choices: zh-Hant (繁體中文), en (English).',
      'featured is a comma-separated list of repository names taken from the cache.',
    ].join('\n'),
    writableRoots: [root],
    allowedTools: ALLOWED_TOOLS,
    buildContext: async (ctx) => {
      const username = typeof ctx.username === 'string' && ctx.username ? ctx.username : '';
      const section = typeof ctx.section === 'string' ? ctx.section : '';
      const lines = [
        `site path: ${sitePath(root)}`,
        `portfolio-section: ${section || '(none)'}`,
        'Write only the site path. Never write the GitHub cache or README files.',
      ];
      if (section) lines.push(`Edit only the ${section} section. Leave every other section unchanged.`);
      if (!username) return lines;
      const cache = cachePath(root, username);
      lines.push(`github cache: ${cache}`, `readme directory: ${readmeDir(root, username)}`);
      try {
        const parsed = JSON.parse(await fs.readFile(cache, 'utf8')) as { repos?: { name?: string }[] };
        const names = (parsed.repos ?? [])
          .map((repo) => repo.name)
          .filter((name): name is string => Boolean(name))
          .slice(0, 30);
        lines.push(`cached repositories: ${names.join(', ')}`);
      } catch {
        lines.push('cached repositories: (missing — ask the user to load the GitHub account first)');
      }
      return lines;
    },
  };
}

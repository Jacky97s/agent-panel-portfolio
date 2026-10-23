import fs from 'node:fs/promises';
import path from 'node:path';
import type { GithubCache, GithubRepo } from '../shared/types.ts';
import { assertUsername, cachePath, readmeDir } from './paths.ts';

const HEADERS = {
  'User-Agent': 'agent-panel-portfolio',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

export async function readCache(root: string, username: string): Promise<GithubCache | null> {
  try {
    const raw = await fs.readFile(cachePath(root, username), 'utf8');
    return JSON.parse(raw) as GithubCache;
  } catch {
    return null;
  }
}

export async function fetchAndCache(root: string, usernameInput: string): Promise<GithubCache> {
  const username = assertUsername(usernameInput);
  const user = await githubJson<Record<string, unknown>>(`/users/${username}`);
  const repos = await githubJson<Record<string, unknown>[]>(
    `/users/${username}/repos?per_page=100&sort=updated&type=owner`,
  );
  const own = repos.filter((repo) => repo.fork !== true);
  const cache: GithubCache = {
    fetchedAt: new Date().toISOString(),
    user: {
      login: String(user.login ?? username),
      name: stringOrNull(user.name),
      bio: stringOrNull(user.bio),
      avatar_url: String(user.avatar_url ?? ''),
      html_url: String(user.html_url ?? `https://github.com/${username}`),
      blog: stringOrNull(user.blog),
      location: stringOrNull(user.location),
      public_repos: Number(user.public_repos ?? own.length),
      followers: Number(user.followers ?? 0),
    },
    repos: own.map(normalizeRepo),
  };
  const folder = readmeDir(root, username);
  await fs.mkdir(folder, { recursive: true });
  const featured = cache.repos.filter((repo) => repo.description || repo.language).slice(0, 8);
  for (const repo of featured) {
    const readme = await fetchReadme(username, repo.name);
    if (!readme) continue;
    repo.readmeExcerpt = readme.replace(/\s+/g, ' ').trim().slice(0, 700);
    await fs.writeFile(path.join(folder, `${repo.name}.md`), readme.slice(0, 20_000));
  }
  await fs.mkdir(path.dirname(cachePath(root, username)), { recursive: true });
  await fs.writeFile(cachePath(root, username), `${JSON.stringify(cache, null, 2)}\n`);
  return cache;
}

async function githubJson<T>(pathname: string): Promise<T> {
  const response = await fetch(`https://api.github.com${pathname}`, { headers: HEADERS });
  if (response.status === 404) throw new Error('找不到這個 GitHub 帳號');
  if (response.status === 403 || response.status === 429) {
    throw new Error('GitHub API 速率限制，請稍後再試，或先用已經快取的帳號');
  }
  if (!response.ok) throw new Error(`GitHub API 回應 ${response.status}`);
  return (await response.json()) as T;
}

async function fetchReadme(username: string, repo: string): Promise<string | null> {
  const response = await fetch(`https://api.github.com/repos/${username}/${repo}/readme`, {
    headers: { ...HEADERS, Accept: 'application/vnd.github.raw' },
  });
  if (!response.ok) return null;
  return response.text();
}

function normalizeRepo(repo: Record<string, unknown>): GithubRepo {
  return {
    name: String(repo.name ?? ''),
    description: stringOrNull(repo.description),
    html_url: String(repo.html_url ?? ''),
    language: stringOrNull(repo.language),
    stargazers_count: Number(repo.stargazers_count ?? 0),
    forks_count: Number(repo.forks_count ?? 0),
    fork: false,
    topics: Array.isArray(repo.topics) ? repo.topics.map(String) : [],
    updated_at: String(repo.updated_at ?? ''),
    homepage: stringOrNull(repo.homepage),
    ...(typeof repo.default_branch === 'string' ? { default_branch: repo.default_branch } : {}),
  };
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

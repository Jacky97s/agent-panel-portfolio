import path from 'node:path';

const USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export function assertUsername(value: string): string {
  const username = value.trim();
  if (!USERNAME.test(username)) throw new Error('GitHub 帳號格式不正確');
  return username;
}

export function dataDir(): string {
  return path.resolve(process.env.PORTFOLIO_DATA ?? path.join(process.cwd(), 'data'));
}

export function distDir(): string {
  return path.resolve(process.env.PORTFOLIO_DIST ?? path.join(process.cwd(), 'dist-site'));
}

export function sitePath(root = dataDir()): string {
  return path.join(root, 'site.json');
}

export function agentModePath(root = dataDir()): string {
  return path.join(root, 'runtime-agent.json');
}

export function cachePath(root: string, username: string): string {
  return path.join(root, 'github', `${assertUsername(username)}.json`);
}

export function readmeDir(root: string, username: string): string {
  return path.join(root, 'github', assertUsername(username), 'readmes');
}

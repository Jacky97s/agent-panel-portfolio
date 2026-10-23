import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACP_PRESETS } from '@agent-panel/core/acp';
import type { AgentTarget } from '@agent-panel/server';
import { createAgentServer } from '@agent-panel/server';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig } from 'vite';
import { createApi, readAgentMode, type AgentMode } from './server/api.ts';
import { createPortfolioCapability } from './server/capability.ts';
import { dataDir } from './server/paths.ts';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), portfolioDev()],
  server: {
    host: '127.0.0.1',
    watch: {
      ignored: ['**/data/**', '**/dist-site/**', '**/vendor/**', '**/e2e/.data/**'],
    },
  },
});

function portfolioDev(): Plugin {
  return {
    name: 'portfolio-dev',
    async configureServer(server) {
      const folder = dataDir();
      await mount(server, folder);
    },
  };
}

async function mount(server: ViteDevServer, folder: string) {
  const mode = await readAgentMode(folder);
  const agentServer = createAgentServer({
    cwd: root,
    writableRoots: [folder],
    agent: agentTarget(mode),
    capabilities: [createPortfolioCapability(folder)],
  });
  server.middlewares.use(agentServer.middleware());
  server.middlewares.use(
    createApi({
      root: folder,
      onAgentChange: () => {
        setTimeout(() => {
          void server.restart();
        }, 40);
      },
    }),
  );
  const httpServer = server.httpServer;
  if (httpServer && 'maxHeadersCount' in httpServer) {
    agentServer.attach(httpServer);
    httpServer.on('close', () => {
      void agentServer.close();
    });
  }
}

function agentTarget(mode: AgentMode): AgentTarget {
  if (mode === 'claude-code' || mode === 'codex') {
    const preset = mode === 'claude-code' ? ACP_PRESETS['claude-code'] : ACP_PRESETS.codex;
    return { command: preset.command, args: [...preset.args] };
  }
  const mockAgent = fileURLToPath(new URL('./server/mock-portfolio-agent.ts', import.meta.url));
  return { command: process.execPath, args: [mockAgent] };
}

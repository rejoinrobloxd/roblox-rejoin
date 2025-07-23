// filepath: /roblox-rejoin/roblox-rejoin/src/main.js

import { ensurePackages } from './bootstrap/ensurePackages.js';

(async () => {
  await ensurePackages();
  const { default: RejoinTool } = await import('./core/rejoinTool.js');

  const tool = new RejoinTool();
  await tool.start();
})();
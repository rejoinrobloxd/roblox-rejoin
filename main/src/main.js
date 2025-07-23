// filepath: /roblox-rejoin/roblox-rejoin/src/main.js

import { ensurePackages } from './utils/index.js';

(async () => {
  // Đảm bảo các package cần thiết đã được cài
  await ensurePackages();

  // Import sau khi chắc chắn package đã có
  const { default: RejoinTool } = await import('./core/rejoinTool.js');

  const tool = new RejoinTool();
  await tool.start();
})();

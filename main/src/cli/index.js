// filepath: /roblox-rejoin/roblox-rejoin/src/cli/index.js
import readline from 'readline';
import { RejoinTool } from '../core/rejoinTool.js';

(async () => {
  const tool = new RejoinTool();
  await tool.start();
})();
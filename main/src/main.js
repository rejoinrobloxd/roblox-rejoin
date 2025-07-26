// filepath: /roblox-rejoin/roblox-rejoin/src/main.js

(async () => {
  const { default: RejoinTool } = await import('./core/rejoinTool.js');

  const tool = new RejoinTool();
  await tool.start();
})();

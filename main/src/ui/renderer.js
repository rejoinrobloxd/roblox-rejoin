import figlet from "figlet";
import _boxen from "boxen";
const boxen = _boxen.default || _boxen;
import os from "os";
import Table from "cli-table3";
class UIRenderer {
static getSystemStats() {
  const cpus = os.cpus();
  const idle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const total = cpus.reduce((acc, cpu) => {
    return acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
  }, 0);

  const cpuUsage = (100 - (idle / total) * 100).toFixed(1);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Hiển thị chuẩn xác hơn, ví dụ: 1.13GB/1.45GB
  const totalGB = (totalMem / (1024 ** 3)).toFixed(2);
  const usedGB = (usedMem / (1024 ** 3)).toFixed(2);

  return {
    cpuUsage,
    ramUsage: `${usedGB}GB/${totalGB}GB`
  };
}


  static renderTitle() {
    const title = figlet.textSync("Dawn Rejoin", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default"
    });

    return boxen(title, {
      padding: 1,
      borderColor: "cyan",
      borderStyle: "double",
      align: "center"
    });
  }

  static getTerminalSize() {
    return {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24
    };
  }

  static calculateColumnWidths(terminalWidth) {
    // Reserve space for borders and padding
    const availableWidth = terminalWidth - 10;
    
    // Minimum widths for each column
    const minWidths = {
      username: 12,
      status: 10,
      info: 20,
      time: 12,
      countdown: 12
    };

    // If terminal is too narrow, use compact mode
    if (availableWidth < 70) {
      return {
        username: Math.max(8, Math.floor(availableWidth * 0.2)),
        status: Math.max(8, Math.floor(availableWidth * 0.15)),
        info: Math.max(15, Math.floor(availableWidth * 0.4)),
        time: Math.max(8, Math.floor(availableWidth * 0.15)),
        countdown: Math.max(8, Math.floor(availableWidth * 0.1))
      };
    }

    // Normal responsive calculation
    const totalMinWidth = Object.values(minWidths).reduce((sum, width) => sum + width, 0);
    const extraSpace = availableWidth - totalMinWidth;

    if (extraSpace > 0) {
      // Distribute extra space proportionally
      return {
        username: minWidths.username + Math.floor(extraSpace * 0.15),
        status: minWidths.status + Math.floor(extraSpace * 0.1),
        info: minWidths.info + Math.floor(extraSpace * 0.5),
        time: minWidths.time + Math.floor(extraSpace * 0.15),
        countdown: minWidths.countdown + Math.floor(extraSpace * 0.1)
      };
    }

    return minWidths;
  }

static renderTable(username, status, info, countdown, robloxVersion) {
  const { width: terminalWidth } = this.getTerminalSize();
  const colWidths = this.calculateColumnWidths(terminalWidth);
  const stats = this.getSystemStats();

  const cpuRamLine = `| CPU: ${stats.cpuUsage}% | RAM: ${stats.ramUsage} |`;
  const centeredCpuRamLine = cpuRamLine.padStart(
    Math.floor((terminalWidth + cpuRamLine.length) / 2)
  );

  const table = new Table({
    head: ["User", "Status", "Info", "Time", "Delay"],
    colWidths: [
      colWidths.username,
      colWidths.status,
      colWidths.info,
      colWidths.time,
      colWidths.countdown
    ],
    wordWrap: true,
    style: {
      head: ["cyan"],
      border: ["gray"]
    }
  });

  const userInfo = `${username}\n(${robloxVersion === 'international' ? 'Quốc tế' : 'VNG'})`;

  table.push([
    userInfo,
    status,
    info,
    new Date().toLocaleTimeString(),
    countdown
  ]);

  return `${centeredCpuRamLine}\n${table.toString()}`;
}

  static renderCompactTable(username, status, info, countdown, robloxVersion) {
    // For very small screens, still use table but with smaller columns
    const { width: terminalWidth } = this.getTerminalSize();
    
    if (terminalWidth < 50) {
      const table = new Table({
        head: ["Field", "Value"],
        colWidths: [12, terminalWidth - 20],
        wordWrap: true,
        style: { 
          head: ["cyan"], 
          border: ["gray"]
        }
      });

      table.push(
        ["User", `${username} (${robloxVersion === 'international' ? 'Quốc tế' : 'VNG'})`],
        ["Status", status],
        ["Info", info],
        ["Time", new Date().toLocaleTimeString()],
        ["Delay", countdown]
      );

      return table.toString();
    }

    return this.renderTable(username, status, info, countdown, robloxVersion);
  }

  static formatCountdown(seconds) {
    return seconds >= 60 
      ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` 
      : `${seconds}s`;
  }

  // Auto-detect best rendering method
  static smartRender(username, status, info, countdown, robloxVersion) {
    const { width: terminalWidth } = this.getTerminalSize();
    
    if (terminalWidth < 50) {
      return this.renderCompactTable(username, status, info, countdown, robloxVersion);
    }
    
    return this.renderTable(username, status, info, countdown, robloxVersion);
  }
}

export default UIRenderer;
class UIRenderer {
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
    const availableWidth = terminalWidth - 10;

    const minWidths = {
      username: 12,
      status: 10,
      info: 20,
      time: 12,
      countdown: 12
    };

    if (availableWidth < 70) {
      return {
        username: Math.max(8, Math.floor(availableWidth * 0.2)),
        status: Math.max(8, Math.floor(availableWidth * 0.15)),
        info: Math.max(15, Math.floor(availableWidth * 0.4)),
        time: Math.max(8, Math.floor(availableWidth * 0.15)),
        countdown: Math.max(8, Math.floor(availableWidth * 0.1))
      };
    }

    const totalMinWidth = Object.values(minWidths).reduce((sum, width) => sum + width, 0);
    const extraSpace = availableWidth - totalMinWidth;

    if (extraSpace > 0) {
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

    return table.toString();
  }

  static renderCompactTable(username, status, info, countdown, robloxVersion) {
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

  static smartRender(username, status, info, countdown, robloxVersion) {
    const { width: terminalWidth } = this.getTerminalSize();
    
    if (terminalWidth < 50) {
      return this.renderCompactTable(username, status, info, countdown, robloxVersion);
    }
    
    return this.renderTable(username, status, info, countdown, robloxVersion);
  }
}

export default UIRenderer;
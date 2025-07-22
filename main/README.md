# Roblox Rejoin Tool

## Overview
The Roblox Rejoin Tool is a command-line application designed to facilitate the rejoining of Roblox games. It automates the process of checking user presence, selecting games, and launching the Roblox client based on user-defined configurations.

## Project Structure
```
roblox-rejoin
├── src
│   ├── cli
│   │   └── index.js          # Command-line interface entry point
│   ├── config
│   │   └── manager.js        # Configuration management
│   ├── core
│   │   ├── rejoinTool.js     # Main functionality orchestrator
│   │   ├── statusHandler.js   # User presence analysis
│   │   └── gameLauncher.js    # Game launching logic
│   ├── roblox
│   │   ├── user.js           # User authentication and presence
│   │   ├── versionSelector.js  # Roblox version selection
│   │   └── gameSelector.js    # Game selection functionality
│   ├── utils
│   │   └── index.js          # Utility functions and helpers
│   ├── ui
│   │   └── renderer.js       # User interface rendering
│   └── main.js               # Main entry point of the application
├── package.json               # NPM configuration file
└── README.md                  # Project documentation
```

## Features
- **User Authentication**: Automatically fetches user information and presence from the Roblox API.
- **Game Selection**: Allows users to choose from predefined games or input custom game IDs.
- **Presence Monitoring**: Continuously checks user presence and determines if a rejoin is necessary.
- **Config Management**: Saves and loads user configurations, including delay settings for rejoining.
- **Terminal UI**: Displays user status and countdowns in a user-friendly terminal interface.

## Installation
To install the necessary dependencies, run:
```
npm install
```

## Usage
To start the application, run:
```
node src/cli/index.js
```

Follow the prompts to authenticate, select a game, and configure your settings.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
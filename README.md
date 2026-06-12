# Ping Chat

A multi-platform chat management desktop application built with Electron and React.

## Features

- **Multi-Platform Support** — Manage chat sessions across multiple platforms
- **Browser Fingerprint Spoofing & Proxy Environment** — Configure proxy settings, browser fingerprints, and cookies per session for secure multi-account isolation
- **Translation** — Built-in message translation capabilities
- **Quick Reply** — Customizable quick reply templates
- **Customer Service Workbench** — Real-time monitoring of all-channel message dynamics, intelligent conversation allocation, automatic tracking of high-intent users, comprehensively improving customer service response efficiency, reducing operational costs, and driving business conversion growth

## Tech Stack

- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [electron-vite](https://electron-vite.org/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/)

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

## Proxy Environment Settings

The application provides detailed proxy and fingerprint configuration for each chat session:

- **Proxy Settings** — Protocol, host, port, username, password
- **Geolocation** — Ask / Allow / Block location requests
- **WebRTC** — Replace / Allow / Disable
- **Canvas** — Enable noise to mask real Canvas fingerprint
- **AudioContext** — Enable noise to mask real AudioContext fingerprint
- **Hardware Concurrency** — Simulate CPU core count
- **Device Memory** — Simulate machine memory
- **Cookie** — Configure session cookies for login

## License

MIT

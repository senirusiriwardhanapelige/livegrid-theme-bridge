# LiveGrid Theme Bridge

Node.js bridge that streams p5.js sketches to a LiveGrid LED panel over UDP. The panel runs at 78x78 pixels and receives raw OM v1 pixel frames on port 4510.


<img width="480" height="490" alt="IMG_7296_small" src="https://github.com/user-attachments/assets/a0a801af-b688-44ed-a0be-1d45a2fbad70" />



## Project Overview

This project streams a rainforest-themed p5.js sketch from your laptop to a LiveGrid LED panel over Wi-Fi. A small Node.js server acts as a WebSocket-to-UDP bridge: the browser sends each frame as an RGB buffer over a local WebSocket connection, and the server repackages it into UDP packets with the LiveGrid 18-byte header format and sends them to the panel.

## Hardware

| Component | Details |
|-----------|---------|
| Panel | LiveGrid DMG1083, 78x78 pixels, MBI5153 driver chips |
| Controller | Custom Livegrid board, ESP32-S3-WROOM-1 |
| Connector | 30-pin HUB75-style, 4-lane |
| Power | USB-C |
| Laptop | Arch Linux, same Wi-Fi as panel |

## Software

| Layer | Technology |
|-------|------------|
| Bridge server | Node.js, Express, Socket.io, dgram (UDP) |
| Sketch | p5.js, runs in browser |
| Protocol | UDP raw OM v1, port 4510 |
| Packet format | 18-byte header + RGB row-major bytes, 2 rows per chunk |

## Files

| File | Purpose |
|------|---------|
| `bridge-server.js` | Node.js UDP bridge server |
| `public/index.html` | Entry point, loads p5 and sketch |
| `public/rainforest-sketch.js` | p5.js rainforest sketch |
| `public/p5/` | p5.js library |
| `public/libraries/` | socket.io client library |
| `package.json` | Node.js dependencies and scripts |
| `.gitignore` | Excludes build artifacts and secrets |

## Setup

### 1. Install Node.js dependencies

```bash
cd LIVEGRID-theme
npm install
```

### 2. Start the bridge server

```bash
npm start
```

The server listens on port 3000 and streams UDP to `192.168.1.216:4510`.

### 3. Open the sketch

Open `http://localhost:3000` in your browser. The rainforest sketch will start sending frames to the panel.

### 4. Panel configuration

Make sure the panel is on the same Wi-Fi network as your laptop. The panel IP should be `192.168.1.216`. If the panel does not respond to UDP packets, verify that the firmware has UDP streaming enabled.

## How It Works

1. The p5.js sketch draws at 78x78 pixels (the panel's native resolution)
2. Each frame is downscaled via an offscreen canvas and converted to an RGB byte buffer
3. The buffer is sent to the Node bridge over Socket.io as an `e131Data` event
4. The bridge splits each frame into UDP packets with 18-byte headers
5. Packets are sent to the panel at `192.168.1.216:4510`

## Packet Header Format

| Bytes | Field | Description |
|-------|-------|-------------|
| 0-1 | Magic | `O` `M` (0x4f, 0x4d) |
| 2 | Version | 0x01 |
| 3 | Flags | 0x00 for raw RGB |
| 4-5 | Frame ID | uint16 LE |
| 6-7 | Chunk index | uint16 LE |
| 8-9 | Total chunks | uint16 LE |
| 10-11 | X offset | uint16 LE (usually 0) |
| 12-13 | Y offset | uint16 LE (starting row) |
| 14-15 | Width | uint16 LE (78) |
| 16-17 | Rows | uint16 LE (rows in this chunk) |

## Links

- LiveGrid Web Installer: https://livegrid.github.io/Livegrid-Web-Installer/
- LiveGrid eDMX docs: https://livegrid.github.io/edmx/
- OpenMatrix firmware: https://github.com/livegrid/OpenMatrix

## Running Locally

If the p5 web editor blocks the WebSocket connection (https to ws://), run the sketch locally by opening `public/index.html` directly or serving the `public` folder with a static file server.

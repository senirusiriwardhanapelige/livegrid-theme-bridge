const dgram = require('dgram');
const express = require('express');
const { Server } = require('socket.io');

const hostname = '0.0.0.0';
const port = 3000;

const MATRIX_WIDTH = 78;
const MATRIX_HEIGHT = 78;
const UDP_TARGET_HOST = '192.168.1.216';
const UDP_TARGET_PORT = 4510;
const UDP_CHUNK_ROWS = 2;
const UDP_HEADER_SIZE = 18;
const UDP_VERSION = 1;
const PROCESS_INTERVAL = 1000 / 60;

let frameCounter = 0;
let udpPacketsSent = 0;

function sendUdpChunks(packets) {
    const socket = dgram.createSocket('udp4');

    socket.on('error', (err) => {
        console.error('UDP socket error:', err);
    });

    let pending = packets.length;

    packets.forEach((packet, idx) => {
        socket.send(packet, 0, packet.length, UDP_TARGET_PORT, UDP_TARGET_HOST, (err) => {
            if (err) {
                console.error('UDP send error:', err.message);
            } else {
                udpPacketsSent++;
            }
            pending--;
            if (pending === 0) {
                socket.close();
            }
        });
    });
}

function sendUdpFrame(buffer) {
    const bytesPerPixel = 3;
    if (buffer.length < MATRIX_WIDTH * bytesPerPixel) {
        return;
    }

    if (buffer.length % bytesPerPixel !== 0) {
        buffer = buffer.slice(0, buffer.length - (buffer.length % bytesPerPixel));
    }

    const totalPixels = buffer.length / bytesPerPixel;
    let height = Math.floor(totalPixels / MATRIX_WIDTH);

    if (height > MATRIX_HEIGHT) {
        height = MATRIX_HEIGHT;
    }

    if (height <= 0) {
        return;
    }

    const bytesPerRow = MATRIX_WIDTH * bytesPerPixel;
    const totalChunks = Math.ceil(height / UDP_CHUNK_ROWS);
    const frameId = frameCounter++ & 0xffff;

    const packets = [];

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const rowStart = chunkIndex * UDP_CHUNK_ROWS;
        const rows = Math.min(UDP_CHUNK_ROWS, height - rowStart);
        if (rows <= 0) break;

        const payloadStart = rowStart * bytesPerRow;
        const payloadLength = rows * bytesPerRow;

        const packet = Buffer.allocUnsafe(UDP_HEADER_SIZE + payloadLength);
        packet[0] = 0x4f; // 'O'
        packet[1] = 0x4d; // 'M'
        packet[2] = UDP_VERSION;
        packet[3] = 0x00;

        packet.writeUInt16LE(frameId, 4);
        packet.writeUInt16LE(chunkIndex, 6);
        packet.writeUInt16LE(totalChunks, 8);
        packet.writeUInt16LE(0, 10); // x offset
        packet.writeUInt16LE(rowStart, 12);
        packet.writeUInt16LE(MATRIX_WIDTH, 14);
        packet.writeUInt16LE(rows, 16);

        buffer.copy(packet, UDP_HEADER_SIZE, payloadStart, payloadStart + payloadLength);
        packets.push(packet);
    }

    sendUdpChunks(packets);
}

setInterval(() => {
    console.log(`UDP packets sent: ${udpPacketsSent}, frames: ${frameCounter}`);
}, 5000);

const app = express();
app.use(express.static('public'));
const server = app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}`);
    console.log(`Streaming UDP to ${UDP_TARGET_HOST}:${UDP_TARGET_PORT}`);
});

const io = new Server(server);

io.sockets.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    let lastProcessTime = 0;

    socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, reason);
    });

    socket.on('e131Data', (data) => {
        const now = Date.now();
        if (now - lastProcessTime < PROCESS_INTERVAL) {
            return;
        }
        lastProcessTime = now;

        const frameBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        sendUdpFrame(frameBuffer);
    });
});
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    path: '/api/socketio',
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    },
    addTrailingSlash: false,
    transports: ['polling', 'websocket'],
    allowEIO3: true
});
const path = require('path');
const express = require('express');

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, '../')));
app.use('/js', express.static(path.join(__dirname, '../js')));

// CORS 설정
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Socket.IO 핸들러
const socketHandler = (req, res) => {
    if (!res.socket.server.io) {
        console.log('First use, starting socket.io');
        res.socket.server.io = io;
    } else {
        console.log('Socket.io already running');
    }
    res.end();
};

// Socket.IO 엔드포인트
app.get('/api/socketio', socketHandler);

// 루트 경로 처리
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

const players = new Map();

io.on('connection', (socket) => {
    console.log('플레이어 접속:', socket.id);

    players.set(socket.id, {
        id: socket.id,
        position: { x: Math.random() * 100 - 50, y: 0, z: Math.random() * 100 - 50 },
        rotation: { y: 0 },
        health: 100,
        weapons: ['pistol'],
        powerUps: []
    });

    socket.emit('currentPlayers', Array.from(players.values()));
    socket.broadcast.emit('newPlayer', players.get(socket.id));

    socket.on('playerMovement', (movementData) => {
        const player = players.get(socket.id);
        if (player) {
            player.position = movementData.position;
            player.rotation = movementData.rotation;
            socket.broadcast.emit('playerMoved', player);
        }
    });

    socket.on('playerShoot', (shootData) => {
        socket.broadcast.emit('playerShot', {
            playerId: socket.id,
            ...shootData
        });
    });

    socket.on('powerUpCollected', (powerUpData) => {
        const player = players.get(socket.id);
        if (player) {
            player.powerUps.push(powerUpData);
            socket.emit('powerUpUpdate', player.powerUps);
        }
    });

    socket.on('playerDamaged', (damageData) => {
        const player = players.get(socket.id);
        if (player) {
            player.health -= damageData.damage;
            if (player.health <= 0) {
                player.health = 100;
                player.position = { x: Math.random() * 100 - 50, y: 0, z: Math.random() * 100 - 50 };
            }
            socket.emit('healthUpdate', player.health);
        }
    });

    socket.on('disconnect', () => {
        console.log('플레이어 접속 해제:', socket.id);
        players.delete(socket.id);
        io.emit('playerDisconnected', socket.id);
    });
});

// 상태 확인용 엔드포인트
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
        console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
    });
}

module.exports = app; 
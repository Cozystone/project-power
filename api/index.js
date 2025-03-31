const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
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

// 상태 확인용 엔드포인트 추가
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    server.listen(port, () => {
        console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
    });
}

module.exports = app; 
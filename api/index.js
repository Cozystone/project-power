const express = require('express');
const app = express();
const { Server } = require('socket.io');
const path = require('path');

// CORS 설정
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

const players = new Map();

// Socket.IO 서버 초기화
const io = new Server({
    path: '/socket.io',
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    allowEIO3: true,
    allowUpgrades: false,
    cookie: false,
    maxHttpBufferSize: 1e8
});

// Socket.IO 연결 처리
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

// Socket.IO 엔드포인트
app.get('/socket.io', (req, res) => {
    res.end();
});

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, '../')));
app.use('/js', express.static(path.join(__dirname, '../js')));

// 루트 경로 처리
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// 상태 확인용 엔드포인트
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// 404 처리
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// 서버 시작
const server = app.listen(process.env.PORT || 3000, () => {
    console.log('서버가 시작되었습니다.');
});

// Socket.IO 서버를 HTTP 서버에 연결
io.attach(server);

module.exports = app; 
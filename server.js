const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const players = new Map();

io.on('connection', (socket) => {
    console.log('플레이어 접속:', socket.id);

    // 새 플레이어 생성
    players.set(socket.id, {
        id: socket.id,
        position: { x: Math.random() * 100 - 50, y: 0, z: Math.random() * 100 - 50 },
        rotation: { y: 0 },
        health: 100,
        weapons: ['pistol'],
        powerUps: []
    });

    // 현재 게임 상태 전송
    socket.emit('currentPlayers', Array.from(players.values()));

    // 다른 플레이어들에게 새 플레이어 알림
    socket.broadcast.emit('newPlayer', players.get(socket.id));

    // 플레이어 이동 업데이트
    socket.on('playerMovement', (movementData) => {
        const player = players.get(socket.id);
        if (player) {
            player.position = movementData.position;
            player.rotation = movementData.rotation;
            socket.broadcast.emit('playerMoved', player);
        }
    });

    // 발사 이벤트
    socket.on('playerShoot', (shootData) => {
        socket.broadcast.emit('playerShot', {
            playerId: socket.id,
            ...shootData
        });
    });

    // 파워업 획득
    socket.on('powerUpCollected', (powerUpData) => {
        const player = players.get(socket.id);
        if (player) {
            player.powerUps.push(powerUpData);
            socket.emit('powerUpUpdate', player.powerUps);
        }
    });

    // 데미지 처리
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

    // 연결 해제
    socket.on('disconnect', () => {
        console.log('플레이어 접속 해제:', socket.id);
        players.delete(socket.id);
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const path = require('path');

app.use(require('express').static(path.join(__dirname, '../')));

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

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});

module.exports = app; 
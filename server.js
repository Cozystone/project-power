const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 플레이어 데이터 저장소
let players = new Map();

// 플레이어 상태 업데이트
app.post('/api/update', (req, res) => {
    const { id, position, rotation, health, weapons, powerUps } = req.body;
    
    if (!players.has(id)) {
        players.set(id, {
            id,
            position: { x: Math.random() * 100 - 50, y: 0, z: Math.random() * 100 - 50 },
            rotation: { y: 0 },
            health: 100,
            weapons: ['pistol'],
            powerUps: []
        });
    }

    const player = players.get(id);
    player.position = position;
    player.rotation = rotation;
    player.health = health;
    player.weapons = weapons;
    player.powerUps = powerUps;

    res.json({ success: true });
});

// 플레이어 목록 조회
app.get('/api/players', (req, res) => {
    res.json(Array.from(players.values()));
});

// 플레이어 제거
app.delete('/api/players/:id', (req, res) => {
    const { id } = req.params;
    if (players.has(id)) {
        players.delete(id);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Player not found' });
    }
});

// 서버 시작
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 
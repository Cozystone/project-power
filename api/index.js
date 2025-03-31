const express = require('express');
const app = express();
const path = require('path');

// CORS 설정
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// JSON 파싱 미들웨어
app.use(express.json());

const players = new Map();

// 플레이어 상태 업데이트
app.post('/api/update', (req, res) => {
    const { id, position, rotation, health, weapons, powerUps } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: 'Player ID is required' });
    }

    players.set(id, {
        id,
        position: position || { x: Math.random() * 100 - 50, y: 0, z: Math.random() * 100 - 50 },
        rotation: rotation || { y: 0 },
        health: health || 100,
        weapons: weapons || ['pistol'],
        powerUps: powerUps || []
    });

    res.json({ success: true });
});

// 플레이어 목록 조회
app.get('/api/players', (req, res) => {
    res.json(Array.from(players.values()));
});

// 플레이어 제거
app.delete('/api/players/:id', (req, res) => {
    const { id } = req.params;
    players.delete(id);
    res.json({ success: true });
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

module.exports = app; 
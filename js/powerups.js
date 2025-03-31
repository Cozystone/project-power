class PowerUpSystem {
    constructor(scene) {
        this.scene = scene;
        this.powerUps = [];
        this.activePowerUps = new Map();
        this.createPowerUps();
    }

    createPowerUps() {
        const powerUpTypes = [
            { type: 'xray', color: 0xff0000, duration: 10000 },
            { type: 'speed', color: 0x00ff00, duration: 10000 },
            { type: 'zeroGravity', color: 0x0000ff, duration: 10000 },
            { type: 'invisibility', color: 0xffff00, duration: 10000 }
        ];

        // 파워업 생성
        for (let i = 0; i < 10; i++) {
            const powerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            const geometry = new THREE.SphereGeometry(0.5, 32, 32);
            const material = new THREE.MeshStandardMaterial({ color: powerUp.color });
            const mesh = new THREE.Mesh(geometry, material);
            
            mesh.position.x = Math.random() * 80 - 40;
            mesh.position.y = 1;
            mesh.position.z = Math.random() * 80 - 40;
            
            mesh.userData = {
                type: powerUp.type,
                duration: powerUp.duration
            };

            this.scene.add(mesh);
            this.powerUps.push(mesh);
        }
    }

    checkCollision(playerPosition) {
        this.powerUps.forEach((powerUp, index) => {
            const distance = playerPosition.distanceTo(powerUp.position);
            if (distance < 1) {
                this.activatePowerUp(powerUp.userData.type);
                this.scene.remove(powerUp);
                this.powerUps.splice(index, 1);
            }
        });
    }

    activatePowerUp(type) {
        const duration = 10000; // 10초
        const startTime = Date.now();

        // 이미 활성화된 파워업이 있다면 제거
        if (this.activePowerUps.has(type)) {
            clearTimeout(this.activePowerUps.get(type));
        }

        // 파워업 효과 적용
        switch (type) {
            case 'xray':
                this.applyXRayEffect();
                break;
            case 'speed':
                this.applySpeedEffect();
                break;
            case 'zeroGravity':
                this.applyZeroGravityEffect();
                break;
            case 'invisibility':
                this.applyInvisibilityEffect();
                break;
        }

        // 파워업 타이머 설정
        const timer = setTimeout(() => {
            this.deactivatePowerUp(type);
        }, duration);

        this.activePowerUps.set(type, timer);
    }

    deactivatePowerUp(type) {
        switch (type) {
            case 'xray':
                this.removeXRayEffect();
                break;
            case 'speed':
                this.removeSpeedEffect();
                break;
            case 'zeroGravity':
                this.removeZeroGravityEffect();
                break;
            case 'invisibility':
                this.removeInvisibilityEffect();
                break;
        }

        this.activePowerUps.delete(type);
    }

    applyXRayEffect() {
        // 투시 효과 구현
        this.scene.traverse((object) => {
            if (object.isMesh && object !== this.localPlayer) {
                object.material.transparent = true;
                object.material.opacity = 0.5;
            }
        });
    }

    removeXRayEffect() {
        this.scene.traverse((object) => {
            if (object.isMesh && object !== this.localPlayer) {
                object.material.transparent = false;
                object.material.opacity = 1;
            }
        });
    }

    applySpeedEffect() {
        this.moveSpeed *= 2;
    }

    removeSpeedEffect() {
        this.moveSpeed /= 2;
    }

    applyZeroGravityEffect() {
        this.velocity.y = 0;
        this.gravity = 0;
    }

    removeZeroGravityEffect() {
        this.gravity = 0.01;
    }

    applyInvisibilityEffect() {
        if (this.localPlayer) {
            this.localPlayer.material.transparent = true;
            this.localPlayer.material.opacity = 0.3;
        }
    }

    removeInvisibilityEffect() {
        if (this.localPlayer) {
            this.localPlayer.material.transparent = false;
            this.localPlayer.material.opacity = 1;
        }
    }
} 
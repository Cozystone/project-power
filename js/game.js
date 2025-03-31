class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        this.socket = io();
        this.players = new Map();
        this.localPlayer = null;
        this.health = 100;
        this.weapons = ['pistol'];
        this.powerUps = [];
        this.buildings = [];

        this.setupControls();
        this.setupScene();
        this.setupEventListeners();
        this.animate();

        this.setupSocketEvents();
    }

    setupControls() {
        this.controls = {
            moveForward: false,
            moveBackward: false,
            moveLeft: false,
            moveRight: false,
            jump: false,
            canJump: true,
            mouseLook: false
        };

        this.moveSpeed = 0.1;
        this.jumpForce = 0.5;
        this.velocity = new THREE.Vector3();
        this.gravity = 0.01;
    }

    setupScene() {
        // 조명 설정
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 20, 0);
        this.scene.add(directionalLight);

        // 바닥 생성
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // 건물들 생성
        this.createBuildings();

        // 카메라 위치 설정
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 0, 0);
    }

    createBuildings() {
        // 여러 개의 건물 생성
        for (let i = 0; i < 20; i++) {
            const height = Math.random() * 20 + 10;
            const geometry = new THREE.BoxGeometry(5, height, 5);
            const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
            const building = new THREE.Mesh(geometry, material);
            
            building.position.x = Math.random() * 80 - 40;
            building.position.y = height / 2;
            building.position.z = Math.random() * 80 - 40;
            
            this.scene.add(building);
            this.buildings.push(building);
        }
    }

    setupEventListeners() {
        // 키보드 이벤트
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW': this.controls.moveForward = true; break;
                case 'KeyS': this.controls.moveBackward = true; break;
                case 'KeyA': this.controls.moveLeft = true; break;
                case 'KeyD': this.controls.moveRight = true; break;
                case 'Space': 
                    if (this.controls.canJump) {
                        this.controls.jump = true;
                        this.controls.canJump = false;
                    }
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW': this.controls.moveForward = false; break;
                case 'KeyS': this.controls.moveBackward = false; break;
                case 'KeyA': this.controls.moveLeft = false; break;
                case 'KeyD': this.controls.moveRight = false; break;
            }
        });

        // 마우스 이벤트
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // 좌클릭
                this.shoot();
            } else if (event.button === 2) { // 우클릭
                this.controls.mouseLook = true;
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (event.button === 2) {
                this.controls.mouseLook = false;
            }
        });

        document.addEventListener('mousemove', (event) => {
            if (this.controls.mouseLook) {
                this.camera.rotation.y -= event.movementX * 0.002;
                this.camera.rotation.x = Math.max(
                    -Math.PI / 2,
                    Math.min(Math.PI / 2, this.camera.rotation.x - event.movementY * 0.002)
                );
            }
        });

        // 우클릭 메뉴 방지
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        // 화면 크기 조정
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupSocketEvents() {
        this.socket.on('currentPlayers', (players) => {
            players.forEach((player) => {
                this.addPlayer(player);
            });
        });

        this.socket.on('newPlayer', (player) => {
            this.addPlayer(player);
        });

        this.socket.on('playerMoved', (player) => {
            if (this.players.has(player.id)) {
                this.players.get(player.id).position.copy(player.position);
                this.players.get(player.id).rotation.y = player.rotation.y;
            }
        });

        this.socket.on('playerShot', (data) => {
            this.handleShot(data);
        });

        this.socket.on('healthUpdate', (health) => {
            this.updateHealth(health);
        });

        this.socket.on('playerDisconnected', (playerId) => {
            if (this.players.has(playerId)) {
                this.scene.remove(this.players.get(playerId));
                this.players.delete(playerId);
            }
        });
    }

    addPlayer(player) {
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const playerMesh = new THREE.Mesh(geometry, material);
        playerMesh.position.copy(player.position);
        this.scene.add(playerMesh);
        this.players.set(player.id, playerMesh);

        if (player.id === this.socket.id) {
            this.localPlayer = playerMesh;
        }
    }

    shoot() {
        if (this.localPlayer) {
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            const bullet = {
                position: this.localPlayer.position.clone(),
                direction: direction.clone(),
                speed: 2
            };

            this.socket.emit('playerShoot', bullet);
        }
    }

    handleShot(data) {
        // 총알 효과 및 데미지 처리
        if (data.playerId === this.socket.id) {
            this.health -= 10;
            this.updateHealth(this.health);
            this.socket.emit('playerDamaged', { damage: 10 });
        }
    }

    updateHealth(health) {
        this.health = health;
        document.getElementById('health-fill').style.width = `${health}%`;
    }

    updatePlayerMovement() {
        if (this.localPlayer) {
            const moveDirection = new THREE.Vector3();
            
            if (this.controls.moveForward) moveDirection.z -= 1;
            if (this.controls.moveBackward) moveDirection.z += 1;
            if (this.controls.moveLeft) moveDirection.x -= 1;
            if (this.controls.moveRight) moveDirection.x += 1;
            
            moveDirection.normalize();
            moveDirection.applyQuaternion(this.camera.quaternion);
            
            this.localPlayer.position.add(moveDirection.multiplyScalar(this.moveSpeed));
            
            // 점프 처리
            if (this.controls.jump) {
                this.velocity.y = this.jumpForce;
                this.controls.jump = false;
            }
            
            // 중력 적용
            this.velocity.y -= 0.01;
            this.localPlayer.position.y += this.velocity.y;
            
            // 바닥 충돌 체크
            if (this.localPlayer.position.y < 0) {
                this.localPlayer.position.y = 0;
                this.velocity.y = 0;
                this.controls.canJump = true;
            }

            // 서버에 위치 업데이트 전송
            this.socket.emit('playerMovement', {
                position: this.localPlayer.position,
                rotation: { y: this.camera.rotation.y }
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.updatePlayerMovement();
        this.renderer.render(this.scene, this.camera);
    }
}

// 게임 시작
window.addEventListener('load', () => {
    new Game();
}); 
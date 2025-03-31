class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        this.players = new Map();
        this.localPlayer = null;
        this.health = 100;
        this.weapons = ['pistol'];
        this.powerUps = [];
        this.buildings = [];
        this.playerId = Math.random().toString(36).substring(7);

        this.setupControls();
        this.setupScene();
        this.setupEventListeners();
        
        // 로컬 플레이어 초기화
        this.initializeLocalPlayer();
        
        this.animate();

        // 초기 플레이어 상태 설정
        this.updatePlayerState();
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

    async updatePlayerState() {
        try {
            const response = await fetch('/api/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: this.playerId,
                    position: this.localPlayer ? this.localPlayer.position : { x: 0, y: 0, z: 0 },
                    rotation: this.localPlayer ? { y: this.localPlayer.rotation.y } : { y: 0 },
                    health: this.health,
                    weapons: this.weapons,
                    powerUps: this.powerUps
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update player state');
            }
        } catch (error) {
            console.error('플레이어 상태 업데이트 오류:', error);
        }
    }

    async fetchPlayers() {
        try {
            const response = await fetch('/api/players');
            if (!response.ok) {
                throw new Error('Failed to fetch players');
            }
            const playersList = await response.json();
            
            // 기존 플레이어 제거
            this.players.forEach(player => this.scene.remove(player));
            this.players.clear();

            // 새로운 플레이어 추가
            playersList.forEach(player => {
                if (player.id !== this.playerId) {
                    this.addPlayer(player);
                }
            });
        } catch (error) {
            console.error('플레이어 목록 조회 오류:', error);
        }
    }

    addPlayer(player) {
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const playerMesh = new THREE.Mesh(geometry, material);
        playerMesh.position.set(player.position.x, player.position.y, player.position.z);
        playerMesh.rotation.y = player.rotation.y;
        this.scene.add(playerMesh);
        this.players.set(player.id, playerMesh);
    }

    shoot() {
        if (this.localPlayer) {
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            // 총알 효과 구현
            const bulletGeometry = new THREE.SphereGeometry(0.1);
            const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
            bullet.position.copy(this.localPlayer.position);
            bullet.velocity = direction.multiplyScalar(2);
            this.scene.add(bullet);
            
            // 1초 후 총알 제거
            setTimeout(() => {
                this.scene.remove(bullet);
            }, 1000);
        }
    }

    handleShot(data) {
        if (data.playerId === this.playerId) {
            this.health -= 10;
            this.updateHealth(this.health);
            this.updatePlayerState();
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

            // 플레이어 상태 업데이트
            this.updatePlayerState();
        }
    }

    initializeLocalPlayer() {
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.localPlayer = new THREE.Mesh(geometry, material);
        this.localPlayer.position.set(0, 1, 0);
        this.scene.add(this.localPlayer);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.updatePlayerMovement();
        this.fetchPlayers();
        this.renderer.render(this.scene, this.camera);
    }
}

// 게임 인스턴스 생성
const game = new Game(); 
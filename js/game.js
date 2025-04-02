class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // GLTFLoader 추가
        this.loader = new THREE.GLTFLoader();

        this.players = new Map();
        this.localPlayer = null;
        this.health = 100;
        this.weapons = ['pistol'];
        this.powerUps = [];
        this.buildings = [];
        this.playerId = Math.random().toString(36).substring(7);

        // 카메라 설정
        this.cameraOffset = new THREE.Vector3(0, 2, 5); // 카메라와 플레이어 사이의 거리
        this.cameraRotation = new THREE.Vector3(0, 0, 0);
        this.cameraRotation.y = 0; // 좌우 회전 고정

        // 텍스처 로더 추가
        this.textureLoader = new THREE.TextureLoader();

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

        // 마우스 컨트롤 설정
        document.addEventListener('mousemove', (event) => {
            if (this.controls.mouseLook) {
                // 좌우 회전
                this.cameraRotation.y -= event.movementX * 0.002;
                // 상하 회전
                this.cameraRotation.x -= event.movementY * 0.002;
                this.cameraRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.cameraRotation.x));
                
                // 캐릭터 전체 회전
                if (this.localPlayer) {
                    this.localPlayer.rotation.y = this.cameraRotation.y;
                    // 팔 회전
                    this.localPlayer.children.forEach(child => {
                        if (child.name === 'leftArm') {
                            child.rotation.z = Math.PI / 4;
                        }
                        if (child.name === 'rightArm') {
                            child.rotation.z = -Math.PI / 4;
                        }
                    });
                }
            }
        });
    }

    setupScene() {
        // 조명 설정 개선
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 20, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // 바닥 텍스처 추가
        const groundTexture = this.textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            map: groundTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 배경 추가 (파란 하늘)
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB, // 하늘색
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        // 3D 모델 로드
        this.loader.load(
            '/models/scene.glb',
            (gltf) => {
                const model = gltf.scene;
                // 모델 크기를 크게 조정
                model.scale.set(10, 10, 10);
                // 모델을 플레이어 주변에 배치
                model.position.set(0, 0, 0);
                // 그림자 설정
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // 재질 설정 개선
                        if (child.material) {
                            child.material.roughness = 0.7;
                            child.material.metalness = 0.3;
                        }
                    }
                });
                this.scene.add(model);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('모델 로딩 중 오류 발생:', error);
            }
        );

        // 카메라 위치 설정
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 0, 0);
    }

    createBuildings() {
        // 건물 텍스처 로드
        const buildingTexture = this.textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
        const windowTexture = this.textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
        
        // 여러 개의 건물 생성
        for (let i = 0; i < 20; i++) {
            const height = Math.random() * 20 + 10;
            const width = Math.random() * 5 + 3;
            const depth = Math.random() * 5 + 3;
            
            // 건물 본체
            const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
            const buildingMaterial = new THREE.MeshStandardMaterial({ 
                map: buildingTexture,
                roughness: 0.7,
                metalness: 0.3
            });
            const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
            
            // 건물 위치 설정
            building.position.x = Math.random() * 800 - 400;
            building.position.y = height / 2;
            building.position.z = Math.random() * 800 - 400;
            
            // 그림자 설정
            building.castShadow = true;
            building.receiveShadow = true;
            
            // 창문 추가
            const windowGeometry = new THREE.PlaneGeometry(width * 0.8, height * 0.8);
            const windowMaterial = new THREE.MeshBasicMaterial({ 
                map: windowTexture,
                transparent: true,
                opacity: 0.8
            });
            
            // 각 면에 창문 추가
            const windowPositions = [
                { x: 0, y: 0, z: depth/2 + 0.1, rotation: { x: 0, y: 0, z: 0 } },
                { x: 0, y: 0, z: -depth/2 - 0.1, rotation: { x: 0, y: Math.PI, z: 0 } },
                { x: width/2 + 0.1, y: 0, z: 0, rotation: { x: 0, y: Math.PI/2, z: 0 } },
                { x: -width/2 - 0.1, y: 0, z: 0, rotation: { x: 0, y: -Math.PI/2, z: 0 } }
            ];
            
            windowPositions.forEach(pos => {
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                window.position.set(pos.x, pos.y, pos.z);
                window.rotation.set(pos.rotation.x, pos.rotation.y, pos.rotation.z);
                building.add(window);
            });
            
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
                // 마우스 포인터 잠금
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (event.button === 2) {
                this.controls.mouseLook = false;
                // 마우스 포인터 잠금 해제
                document.exitPointerLock();
            }
        });

        // ESC 키로 마우스 포인터 잠금 해제
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Escape') {
                document.exitPointerLock();
                this.controls.mouseLook = false;
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
        const playerGroup = new THREE.Group();
        
        // 몸체
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0000ff,
            roughness: 0.5,
            metalness: 0.5
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0;
        body.castShadow = true;
        playerGroup.add(body);
        
        // 머리
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0000ff,
            roughness: 0.5,
            metalness: 0.5
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1;
        head.castShadow = true;
        playerGroup.add(head);
        
        // 팔
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0000ff,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.name = 'leftArm';
        leftArm.position.set(-0.4, 0.5, 0);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        playerGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.name = 'rightArm';
        rightArm.position.set(0.4, 0.5, 0);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.castShadow = true;
        playerGroup.add(rightArm);
        
        // 다리
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.7, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0000ff,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, -0.35, 0);
        leftLeg.castShadow = true;
        playerGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, -0.35, 0);
        rightLeg.castShadow = true;
        playerGroup.add(rightLeg);
        
        playerGroup.position.set(player.position.x, player.position.y + 0.5, player.position.z); // 발 높이만큼 올림
        playerGroup.rotation.y = player.rotation.y;
        
        // 플레이어 ID 텍스트 추가
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.fillText(player.id.substring(0, 4), canvas.width/2, canvas.height/2 + 10);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.8
        });
        const textGeometry = new THREE.PlaneGeometry(2, 0.5);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.y = 2;
        playerGroup.add(textMesh);
        
        this.scene.add(playerGroup);
        this.players.set(player.id, playerGroup);
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

    updateCamera() {
        if (this.localPlayer) {
            // 카메라 위치 계산
            const cameraOffset = new THREE.Vector3(0, 2, 5); // 원래 거리로 복원
            cameraOffset.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(this.cameraRotation.x, this.cameraRotation.y, 0)));
            
            // 카메라 위치 설정
            this.camera.position.copy(this.localPlayer.position).add(cameraOffset);
            
            // 카메라가 플레이어를 바라보도록 설정
            const lookAtPosition = new THREE.Vector3();
            lookAtPosition.copy(this.localPlayer.position);
            lookAtPosition.y += 1.5;
            this.camera.lookAt(lookAtPosition);
        }
    }

    updatePlayerMovement() {
        if (this.localPlayer) {
            const moveDirection = new THREE.Vector3();
            
            if (this.controls.moveForward) moveDirection.z -= 1;
            if (this.controls.moveBackward) moveDirection.z += 1;
            if (this.controls.moveLeft) moveDirection.x -= 1;
            if (this.controls.moveRight) moveDirection.x += 1;
            
            moveDirection.normalize();
            
            // 카메라 방향에 따라 이동 방향 조정
            const cameraRotation = new THREE.Euler(0, this.cameraRotation.y, 0);
            moveDirection.applyEuler(cameraRotation);
            
            this.localPlayer.position.add(moveDirection.multiplyScalar(this.moveSpeed));
            
            // 점프 처리
            if (this.controls.jump) {
                this.velocity.y = this.jumpForce;
                this.controls.jump = false;
            }
            
            // 중력 적용
            this.velocity.y -= this.gravity;
            this.localPlayer.position.y += this.velocity.y;
            
            // 바닥 충돌 체크
            if (this.localPlayer.position.y < 0.4) {
                this.localPlayer.position.y = 0.4;
                this.velocity.y = 0;
                this.controls.canJump = true;
            }

            // 플레이어 상태 업데이트
            this.updatePlayerState();
        }
    }

    initializeLocalPlayer() {
        // 플레이어 모델 생성
        const playerGroup = new THREE.Group();
        
        // 몸체
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            roughness: 0.5,
            metalness: 0.5
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        playerGroup.add(body);
        
        // 머리
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            roughness: 0.5,
            metalness: 0.5
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5;
        head.castShadow = true;
        playerGroup.add(head);
        
        // 팔
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.name = 'leftArm';
        leftArm.position.set(-0.4, 1, 0);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        playerGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.name = 'rightArm';
        rightArm.position.set(0.4, 1, 0);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.castShadow = true;
        playerGroup.add(rightArm);
        
        // 다리
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.7, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, 0, 0);
        leftLeg.castShadow = true;
        playerGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, 0, 0);
        rightLeg.castShadow = true;
        playerGroup.add(rightLeg);
        
        this.localPlayer = playerGroup;
        this.localPlayer.position.set(0, 0.4, 0); // 높이를 0.4로 설정
        this.scene.add(this.localPlayer);
    }

    animate() {
        // 애니메이션 믹서 업데이트
        if (this.mixer) {
            this.mixer.update(0.016); // 약 60fps에 해당하는 델타 타임
        }
        
        this.updatePlayerMovement();
        this.updateCamera();
        this.fetchPlayers();
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.animate());
    }
}

// 게임 인스턴스 생성
const game = new Game(); 
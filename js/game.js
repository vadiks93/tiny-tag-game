(function () {
    const Engine = Matter.Engine;
    const Render = Matter.Render;
    const Runner = Matter.Runner;
    const Bodies = Matter.Bodies;
    const Body = Matter.Body;
    const Composite = Matter.Composite;
    const Events = Matter.Events;

    const rules = window.GameRules;
    const effects = window.GameEffects;
    const ui = window.GameUi.createGameUi();
    const mobileShootButton = document.getElementById('mobile-shoot');
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobileViewport = Math.min(width, height) < 520;
    const mobileScale = isMobileViewport ? 0.52 : 1;
    const playerRadius = 24 * mobileScale;
    const wallThickness = 60;
    const groundHeight = 60 * mobileScale;
    const initialLineWidth = Math.min(isMobileViewport ? 380 : 500, width * (isMobileViewport ? 0.5 : 0.62));
    const obstacleThickness = Math.max(2.5, 5 * mobileScale);
    const initialLineThickness = obstacleThickness;
    const playerIconSize = playerRadius * 2.55;
    const state = {
        playerName: 'Replaceable Human',
        aiName: 'Mischievous AI',
        playerRole: 'escaping',
        aiRole: 'catching',
        roundEndsAt: 0,
        roundSeconds: 30,
        maxTraps: 3,
        autoRed: false,
        gameStarted: false,
        gameOver: false
    };

    let explodedBody = null;
    let chaosTimeoutId = null;
    let chaosStartedAt = 0;
    let bombTimeoutId = null;
    let lastShotAt = 0;
    let lastAutoShotAt = 0;
    let shotDelayMs = 1200;
    let shieldSpawnTimeoutId = null;
    let shieldPickup = null;
    let escapingHasShield = false;
    let powerSpawnTimeoutId = null;
    let powerPickup = null;
    let catcherHasPowerShot = false;
    let nextChaosLineIsHorizontal = true;
    let blueTapTarget = null;

    const chaosLines = [];
    const bombs = [];
    const bullets = [];
    const movementState = {
        blue: new Set(),
        red: new Set()
    };
    const movementMomentum = {
        blue: { direction: '', streak: 0 },
        red: { direction: '', streak: 0 }
    };
    const autoRedRecovery = {
        lastX: 0,
        lastY: 0,
        lastCheckAt: 0,
        escapeUntil: 0,
        directions: []
    };
    const humanIcon = createIconImage('./assets/running-svgrepo-com.svg');
    const aiIcon = createIconImage('./assets/screeps-svgrepo-com.svg');
    const welcomeModal = document.querySelector('game-welcome');
    const engine = Engine.create();
    const render = Render.create({
        element: document.getElementById('game'),
        engine: engine,
        options: {
            width: width,
            height: height,
            wireframes: false,
            background: '#ffffff'
        }
    });

    const player = Bodies.circle(width * 0.82, height * 0.25, playerRadius, {
        label: state.playerName,
        restitution: 0.8,
        frictionAir: 0.04,
        collisionFilter: { group: -1 },
        render: { visible: false }
    });
    const aiPlayer = Bodies.circle(width * 0.18, height * 0.25, playerRadius, {
        label: state.aiName,
        restitution: 0.8,
        frictionAir: 0.035,
        collisionFilter: { group: -1 },
        render: { visible: false }
    });
    const ground = Bodies.rectangle(width / 2, height - groundHeight / 2, width, groundHeight, {
        isStatic: true,
        render: { fillStyle: '#333333' }
    });
    const ceiling = Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, {
        isStatic: true,
        render: { fillStyle: '#333333' }
    });
    const leftWall = Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, {
        isStatic: true,
        render: { fillStyle: '#333333' }
    });
    const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, {
        isStatic: true,
        render: { fillStyle: '#333333' }
    });
    const line = Bodies.rectangle(width / 2, height * 0.48, initialLineWidth, initialLineThickness, {
        isStatic: true,
        angle: 0,
        render: { fillStyle: '#6b7280' }
    });
    const runner = Runner.create();

    Composite.add(engine.world, [
        line,
        player,
        aiPlayer,
        ground,
        ceiling,
        leftWall,
        rightWall
    ]);

    Render.run(render);
    ui.updateHud(state);

    Events.on(render, 'afterRender', () => {
        const context = render.context;
        const catcherBody = state.playerRole === 'catching' ? player : aiPlayer;
        const escapingBody = state.playerRole === 'escaping' ? player : aiPlayer;
        const escapingColor = getBodyColor(escapingBody);
        const escapingSoftColor = getSoftBodyColor(escapingBody);

        if (shieldPickup) {
            effects.drawShieldIcon(context, shieldPickup.position.x, shieldPickup.position.y, 15, escapingSoftColor, escapingColor);
        }

        if (powerPickup) {
            effects.drawPowerIcon(context, powerPickup.position.x, powerPickup.position.y, 15);
        }

        if (escapingHasShield && explodedBody !== escapingBody) {
            effects.drawShieldAura(context, escapingBody.position.x, escapingBody.position.y, escapingColor);
        }

        if (catcherHasPowerShot && explodedBody !== catcherBody) {
            effects.drawPowerAura(context, catcherBody.position.x, catcherBody.position.y);
        }

        if (explodedBody !== player) {
            effects.drawPlayerIcon(context, humanIcon, player.position.x, player.position.y, playerIconSize, '#2f80ed');

            if (catcherBody === player) {
                effects.drawRotatingAimLine(context, player.position.x, player.position.y, getAimAngle(), mobileScale);
                effects.drawInnerCircle(context, player.position.x, player.position.y, mobileScale);
            }

            effects.drawName(context, `${state.playerName} (${state.playerRole})`, player.position.x, player.position.y - 32 * mobileScale, '#2f80ed');
        }

        if (explodedBody !== aiPlayer) {
            effects.drawPlayerIcon(context, aiIcon, aiPlayer.position.x, aiPlayer.position.y, playerIconSize, '#eb5757');

            if (catcherBody === aiPlayer) {
                effects.drawRotatingAimLine(context, aiPlayer.position.x, aiPlayer.position.y, getAimAngle(), mobileScale);
                effects.drawInnerCircle(context, aiPlayer.position.x, aiPlayer.position.y, mobileScale);
            }

            effects.drawName(context, `${state.aiName} (${state.aiRole})`, aiPlayer.position.x, aiPlayer.position.y - 32 * mobileScale, '#eb5757');
        }
    });

    Events.on(engine, 'beforeUpdate', () => {
        if (!state.gameStarted || state.gameOver) {
            return;
        }

        updateAutoRedMovement();
        applyMovement();
        updateAutoRedShooting();

        const playerIsCatching = state.playerRole === 'catching';
        const escapingName = playerIsCatching ? state.aiName : state.playerName;
        const catcherName = playerIsCatching ? state.playerName : state.aiName;
        const catcherBody = playerIsCatching ? player : aiPlayer;
        const escapingBody = playerIsCatching ? aiPlayer : player;

        if (Date.now() >= state.roundEndsAt) {
            endGameByTimeout(escapingName, catcherName, catcherBody);
            return;
        }

        if (catcherTouchedBomb(catcherBody)) {
            endGameByBomb(escapingName, catcherName, catcherBody);
            return;
        }

        collectShieldIfTouched(escapingBody, escapingName);
        collectPowerIfTouched(catcherBody, catcherName);

        if (bulletTouchedEscapingPlayer(escapingBody)) {
            endGameByBullet(catcherName, escapingName, escapingBody);
            return;
        }

        const playerDx = player.position.x - aiPlayer.position.x;
        const playerDy = player.position.y - aiPlayer.position.y;
        const distance = Math.sqrt(playerDx * playerDx + playerDy * playerDy) || 1;

        if (distance <= playerRadius * 2) {
            endGame(catcherName, escapingName, escapingBody);
            return;
        }

        ui.updateHud(state);
    });

    welcomeModal.addEventListener('start-game', (event) => {
        state.playerName = event.detail.playerName;
        state.aiName = event.detail.aiName;
        state.playerRole = event.detail.role === 'human-catching' ? 'catching' : 'escaping';
        state.aiRole = event.detail.role === 'human-catching' ? 'escaping' : 'catching';
        state.roundSeconds = event.detail.roundSeconds;
        state.maxTraps = event.detail.trapCount;
        state.autoRed = event.detail.autoRed;
        state.roundEndsAt = Date.now() + state.roundSeconds * 1000;
        shotDelayMs = event.detail.shotDelaySeconds * 1000;
        player.label = state.playerName;
        aiPlayer.label = state.aiName;
        state.gameStarted = true;
        state.gameOver = false;
        blueTapTarget = null;
        lastShotAt = 0;
        lastAutoShotAt = 0;
        explodedBody = null;
        escapingHasShield = false;
        catcherHasPowerShot = false;
        ui.hideGameOver();
        resetAutoRedRecovery();
        removeShieldPickup();
        removePowerPickup();
        ui.updateHud(state);

        Runner.run(runner, engine);
        startChaosLines();
        startBombs();
        startShieldSpawns();
        startPowerSpawns();

        ui.log('Tiny Tag Game started.');
        if (isTapToMoveMode()) {
            ui.setControlsMode(true);
            ui.log('Tap anywhere in the arena to move the blue player.');
        } else {
            ui.showControlsHint({
                autoHide: !isTouchDevice(),
                singlePlayerAuto: state.autoRed
            });
        }
        updateMobileShootButton();
        ui.log(`${state.playerName} is the blue circle and is ${state.playerRole}.`);
        ui.log(`${state.aiName} is the red circle and is ${state.aiRole}.`);
        ui.log(`Red player mode: ${state.autoRed ? 'auto' : 'manual'}.`);
        if (state.autoRed && state.aiRole === 'catching') {
            ui.log(`${state.aiName} will also shoot when the aim line points close enough. Rude, but honest.`);
        }
        ui.log(`The catcher has ${state.roundSeconds} seconds. If time expires, the escaping player wins.`);
        ui.log(`The escaping player can leave up to ${state.maxTraps} traps. Catchers should avoid dramatic floor snacks.`);
        ui.log(`Press Space to shoot from the catcher aim line. Shot delay: ${event.detail.shotDelaySeconds}s.`);
        ui.log('A shield may appear at random. The escaping player can use it to survive one bullet.');
        ui.log('A power shot may appear at random. The catcher can use it for one stronger bullet.');
        ui.log('Random chaos lines will appear faster over time. Good luck, honestly.');
    });

    document.addEventListener('keydown', (event) => {
        if (state.gameOver && (event.code === 'Enter' || event.code === 'Space')) {
            event.preventDefault();
            restartGame();
            return;
        }

        if (event.code === 'Space') {
            event.preventDefault();

            if (canManualShoot()) {
                shootBullet();
            }

            return;
        }

        setKeyboardMovement(event.key, true);
    });

    document.addEventListener('pointerdown', (event) => {
        if (state.gameOver) {
            if (event.target.closest('#log, #log-toggle')) {
                return;
            }

            restartGame();
            return;
        }

        if (event.target.closest('#log, #log-toggle')) {
            return;
        }

        if (isTapToMoveMode() && !event.target.closest('#controls-hint')) {
            blueTapTarget = { x: event.clientX, y: event.clientY };
        }
    });

    document.addEventListener('keyup', (event) => {
        setKeyboardMovement(event.key, false);
    });

    mobileShootButton.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (canManualShoot()) {
            shootBullet();
        }
    });

    document.querySelectorAll('[data-player][data-direction]').forEach((button) => {
        const press = (event) => {
            event.preventDefault();

            if (state.autoRed && button.dataset.player === 'red') {
                return;
            }

            button.classList.add('is-pressed');
            movementState[button.dataset.player].add(button.dataset.direction);
        };
        const release = () => {
            button.classList.remove('is-pressed');
            movementState[button.dataset.player].delete(button.dataset.direction);
        };

        button.addEventListener('pointerdown', press);
        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
        button.addEventListener('pointerleave', release);
    });

    function setKeyboardMovement(key, isPressed) {
        const keyMap = {
            ArrowLeft: ['blue', 'left'],
            ArrowRight: ['blue', 'right'],
            ArrowUp: ['blue', 'up'],
            ArrowDown: ['blue', 'down'],
            a: ['red', 'left'],
            d: ['red', 'right'],
            w: ['red', 'up'],
            s: ['red', 'down']
        };
        const movement = keyMap[key] || keyMap[key.toLowerCase()];

        if (!movement) {
            return;
        }

        const [playerId, direction] = movement;

        if (state.autoRed && playerId === 'red') {
            return;
        }

        if (isPressed) {
            movementState[playerId].add(direction);
        } else {
            movementState[playerId].delete(direction);
        }
    }

    function createIconImage(src) {
        const image = new Image();
        image.src = src;
        return image;
    }

    function applyMovement() {
        updateBlueTapMovement();
        applyMovementToBody(player, movementState.blue, movementMomentum.blue);
        applyMovementToBody(aiPlayer, movementState.red, movementMomentum.red);
    }

    function applyMovementToBody(body, directions, momentum) {
        const speedScale = isTouchDevice() ? 0.82 : 1;
        const baseSpeed = 10.6 * speedScale;
        const maxStraightBonus = 5.2 * speedScale;
        const x = (directions.has('right') ? 1 : 0) - (directions.has('left') ? 1 : 0);
        const y = (directions.has('down') ? 1 : 0) - (directions.has('up') ? 1 : 0);

        if (x === 0 && y === 0) {
            momentum.direction = '';
            momentum.streak = 0;
            return;
        }

        const length = Math.sqrt(x * x + y * y);
        const directionKey = `${x},${y}`;
        const isSingleDirection = directions.size === 1;
        const isStraight = isSingleDirection && (x === 0) !== (y === 0);

        if (isStraight && directionKey === momentum.direction) {
            momentum.streak = Math.min(90, momentum.streak + 1);
        } else {
            momentum.direction = directionKey;
            momentum.streak = isStraight ? 1 : 0;
        }

        const directionChangePenalty = momentum.streak <= 8 ? 0.9 : 0;
        const speed = rules.calculateMovementSpeed({
            baseSpeed: baseSpeed,
            maxStraightBonus: maxStraightBonus,
            directionChangePenalty: -directionChangePenalty,
            streak: momentum.streak,
            isStraight: isStraight,
            accelerationTicks: 55
        });

        Body.setVelocity(body, {
            x: (x / length) * speed,
            y: (y / length) * speed
        });
    }

    function updateBlueTapMovement() {
        if (!isTapToMoveMode() || !blueTapTarget) {
            return;
        }

        movementState.blue.clear();

        const dx = blueTapTarget.x - player.position.x;
        const dy = blueTapTarget.y - player.position.y;

        if (Math.sqrt(dx * dx + dy * dy) < playerRadius * 0.85) {
            blueTapTarget = null;
            return;
        }

        addDirectionsFromVectorToSet({ x: dx, y: dy }, movementState.blue);
    }

    function updateAutoRedMovement() {
        if (!state.autoRed) {
            return;
        }

        movementState.red.clear();

        const now = Date.now();

        if (now < autoRedRecovery.escapeUntil) {
            addAutoRedDirections(autoRedRecovery.directions);
            return;
        }

        if (now - autoRedRecovery.lastCheckAt > 450) {
            const moved = Math.hypot(
                aiPlayer.position.x - autoRedRecovery.lastX,
                aiPlayer.position.y - autoRedRecovery.lastY
            );

            autoRedRecovery.lastX = aiPlayer.position.x;
            autoRedRecovery.lastY = aiPlayer.position.y;
            autoRedRecovery.lastCheckAt = now;

            if (moved < 8) {
                autoRedRecovery.directions = getRandomAutoRedRecoveryDirections();
                autoRedRecovery.escapeUntil = now + 700;
                movementMomentum.red.direction = '';
                movementMomentum.red.streak = 0;
                addAutoRedDirections(autoRedRecovery.directions);
                return;
            }
        }

        const redIsCatching = state.aiRole === 'catching';

        if (!redIsCatching) {
            addAutoEscapeDirections();
            return;
        }

        const playerVector = getVectorBetween(aiPlayer, player);
        const bombAvoidanceVector = getBombAvoidanceVector(aiPlayer);
        const desiredVector = {
            x: playerVector.x + bombAvoidanceVector.x,
            y: playerVector.y + bombAvoidanceVector.y
        };

        addDirectionsFromVector(desiredVector);
    }

    function addAutoEscapeDirections() {
        const directions = chooseFarthestEscapeDirections();
        addAutoRedDirections(directions);
    }

    function chooseFarthestEscapeDirections() {
        const options = [
            [],
            ['left'],
            ['right'],
            ['up'],
            ['down'],
            ['left', 'up'],
            ['left', 'down'],
            ['right', 'up'],
            ['right', 'down']
        ];
        const lookAhead = 150;
        let bestDirections = [];
        let bestScore = -Infinity;

        options.forEach((directions) => {
            const vector = directionsToVector(directions);
            const projected = {
                x: clamp(aiPlayer.position.x + vector.x * lookAhead, playerRadius, width - playerRadius),
                y: clamp(aiPlayer.position.y + vector.y * lookAhead, playerRadius, height - groundHeight - playerRadius)
            };
            const dx = projected.x - player.position.x;
            const dy = projected.y - player.position.y;
            const distanceScore = Math.sqrt(dx * dx + dy * dy);
            const wallPenalty = getWallPenalty(projected);
            const bulletPenalty = getIncomingBulletPenalty(projected);
            const score = distanceScore - wallPenalty - bulletPenalty;

            if (score > bestScore) {
                bestScore = score;
                bestDirections = directions;
            }
        });

        return bestDirections;
    }

    function getIncomingBulletPenalty(projectedPosition) {
        return bullets.reduce((penalty, bullet) => {
            const bulletToAi = {
                x: aiPlayer.position.x - bullet.position.x,
                y: aiPlayer.position.y - bullet.position.y
            };
            const bulletSpeed = Math.sqrt(bullet.velocity.x * bullet.velocity.x + bullet.velocity.y * bullet.velocity.y) || 1;
            const closingDot = (bullet.velocity.x * bulletToAi.x + bullet.velocity.y * bulletToAi.y) / bulletSpeed;

            if (closingDot <= 0) {
                return penalty;
            }

            const lookAheadFrames = 12;
            const futureBullet = {
                x: bullet.position.x + bullet.velocity.x * lookAheadFrames,
                y: bullet.position.y + bullet.velocity.y * lookAheadFrames
            };
            const dx = projectedPosition.x - futureBullet.x;
            const dy = projectedPosition.y - futureBullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const dangerRadius = bullet.isPowered ? 160 : 125;

            if (distance > dangerRadius) {
                return penalty;
            }

            return penalty + (dangerRadius - distance) * (bullet.isPowered ? 2.1 : 1.55);
        }, 0);
    }

    function directionsToVector(directions) {
        const x = (directions.includes('right') ? 1 : 0) - (directions.includes('left') ? 1 : 0);
        const y = (directions.includes('down') ? 1 : 0) - (directions.includes('up') ? 1 : 0);
        const length = Math.sqrt(x * x + y * y) || 1;

        return {
            x: x / length,
            y: y / length
        };
    }

    function getWallPenalty(position) {
        const wallComfort = 80;
        const distances = [
            position.x - playerRadius,
            width - playerRadius - position.x,
            position.y - playerRadius,
            height - groundHeight - playerRadius - position.y
        ];

        return distances.reduce((penalty, distance) => {
            return penalty + Math.max(0, wallComfort - distance) * 0.7;
        }, 0);
    }

    function getVectorBetween(fromBody, toBody) {
        return {
            x: toBody.position.x - fromBody.position.x,
            y: toBody.position.y - fromBody.position.y
        };
    }

    function getBombAvoidanceVector(body) {
        const dangerRadius = 170;

        return bombs.reduce((avoidance, bomb) => {
            const awayX = body.position.x - bomb.position.x;
            const awayY = body.position.y - bomb.position.y;
            const distance = Math.sqrt(awayX * awayX + awayY * awayY) || 1;

            if (distance > dangerRadius) {
                return avoidance;
            }

            const strength = ((dangerRadius - distance) / dangerRadius) * 520;

            return {
                x: avoidance.x + (awayX / distance) * strength,
                y: avoidance.y + (awayY / distance) * strength
            };
        }, { x: 0, y: 0 });
    }

    function addDirectionsFromVector(vector) {
        addDirectionsFromVectorToSet(vector, movementState.red);
    }

    function addDirectionsFromVectorToSet(vector, directions) {
        const axisBias = 0.35;

        if (vector.x > axisBias) {
            directions.add('right');
        } else if (vector.x < -axisBias) {
            directions.add('left');
        }

        if (vector.y > axisBias) {
            directions.add('down');
        } else if (vector.y < -axisBias) {
            directions.add('up');
        }
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function resetAutoRedRecovery() {
        autoRedRecovery.lastX = aiPlayer.position.x;
        autoRedRecovery.lastY = aiPlayer.position.y;
        autoRedRecovery.lastCheckAt = Date.now();
        autoRedRecovery.escapeUntil = 0;
        autoRedRecovery.directions = [];
    }

    function addAutoRedDirections(directions) {
        directions.forEach((direction) => {
            movementState.red.add(direction);
        });
    }

    function getRandomAutoRedRecoveryDirections() {
        const options = [
            ['left'],
            ['right'],
            ['up'],
            ['down'],
            ['left', 'up'],
            ['left', 'down'],
            ['right', 'up'],
            ['right', 'down']
        ];

        return options[Math.floor(Math.random() * options.length)];
    }

    function updateAutoRedShooting() {
        if (!state.autoRed || state.aiRole !== 'catching') {
            return;
        }

        const now = Date.now();

        if (now - lastShotAt < shotDelayMs || now - lastAutoShotAt < 120) {
            return;
        }

        lastAutoShotAt = now;

        const targetAngle = Math.atan2(
            player.position.y - aiPlayer.position.y,
            player.position.x - aiPlayer.position.x
        );
        const aimDifference = Math.abs(getShortestAngleDifference(getAimAngle(), targetAngle));
        const targetDistance = distanceBetween(aiPlayer, player);
        const aimTolerance = targetDistance < 240 ? 0.42 : 0.26;

        if (aimDifference <= aimTolerance) {
            shootBullet();
        }
    }

    function getShortestAngleDifference(angleA, angleB) {
        return Math.atan2(Math.sin(angleA - angleB), Math.cos(angleA - angleB));
    }

    function isTouchDevice() {
        return window.matchMedia('(pointer: coarse)').matches;
    }

    function isTapToMoveMode() {
        return isTouchDevice() && state.autoRed;
    }

    function getAimAngle() {
        return Date.now() / 350;
    }

    function canManualShoot() {
        return !state.autoRed || state.playerRole === 'catching';
    }

    function updateMobileShootButton() {
        mobileShootButton.classList.toggle('is-visible', isTouchDevice() && state.playerRole === 'catching');
    }

    function restartGame() {
        sessionStorage.setItem('tiny-tag-restart-single-player', 'true');
        window.location.reload();
    }

    function resolveWin(winnerName, loserBody) {
        state.gameOver = true;
        explodedBody = loserBody;
        stopRoundSpawners();
        ui.addWin(winnerName);
        ui.showGameOver(winnerName);
        freezeWinner(loserBody);
        releaseSticks();
        Composite.remove(engine.world, loserBody);
        effects.createExplosion({ Bodies, Body, Composite }, engine.world, loserBody.position.x, loserBody.position.y);
    }

    function freezeWinner(loserBody) {
        [player, aiPlayer].forEach((body) => {
            if (body === loserBody) {
                return;
            }

            Body.setVelocity(body, { x: 0, y: 0 });
            Body.setAngularVelocity(body, 0);
            Body.setStatic(body, true);
        });
    }

    function releaseSticks() {
        [line, ...chaosLines].forEach((stick) => {
            Body.setStatic(stick, false);
            Body.setVelocity(stick, {
                x: (Math.random() - 0.5) * 3,
                y: -Math.random() * 2
            });
            Body.setAngularVelocity(stick, (Math.random() - 0.5) * 0.16);
        });
    }

    function endGame(winnerName, escapingName, escapingBody) {
        resolveWin(winnerName, escapingBody);
        ui.log(`Game over. ${winnerName} caught ${escapingName}.`);
        ui.log(`${escapingName} performed an unscheduled confetti disassembly.`);
        finishScoreLog();
    }

    function endGameByTimeout(winnerName, catcherName, catcherBody) {
        resolveWin(winnerName, catcherBody);
        ui.log(`Time expired. ${winnerName} escaped the nonsense.`);
        ui.log(`${catcherName} ran out of time and self-destructed from embarrassment.`);
        ui.log(`${winnerName} wins by surviving ${state.roundSeconds} seconds.`);
        finishScoreLog();
    }

    function endGameByBomb(winnerName, catcherName, catcherBody) {
        resolveWin(winnerName, catcherBody);
        ui.log(`Game over. ${catcherName} stepped on a bomb.`);
        ui.log(`${winnerName} wins by weaponized fleeing.`);
        finishScoreLog();
    }

    function endGameByBullet(winnerName, escapingName, escapingBody) {
        resolveWin(winnerName, escapingBody);
        ui.log(`Game over. ${winnerName} landed a ridiculous trick shot.`);
        ui.log(`${escapingName} was caught by high-speed bad news.`);
        finishScoreLog();
    }

    function finishScoreLog() {
        ui.logScore(state.playerName, state.aiName);
        ui.updateHud(state);
    }

    function stopRoundSpawners() {
        stopChaosLines();
        stopBombs();
        stopShieldSpawns();
        stopPowerSpawns();
    }

    function startChaosLines() {
        stopChaosLines();
        chaosStartedAt = Date.now();
        scheduleNextChaosLine();
    }

    function stopChaosLines() {
        if (chaosTimeoutId) {
            clearTimeout(chaosTimeoutId);
            chaosTimeoutId = null;
        }
    }

    function scheduleNextChaosLine() {
        if (!state.gameStarted || state.gameOver) {
            return;
        }

        const elapsedSeconds = (Date.now() - chaosStartedAt) / 1000;
        const delay = Math.max(260, 1200 - elapsedSeconds * 28);

        chaosTimeoutId = setTimeout(() => {
            spawnChaosLine();
            scheduleNextChaosLine();
        }, delay);
    }

    function spawnChaosLine() {
        if (!state.gameStarted || state.gameOver) {
            return;
        }

        const elapsedSeconds = (Date.now() - chaosStartedAt) / 1000;
        const maxLines = Math.min(32, 7 + Math.floor(elapsedSeconds / 5));

        if (chaosLines.length >= maxLines) {
            removeChaosLine(chaosLines.shift());
        }

        const colors = ['#6b7280', '#9b51e0', '#f2994a', '#27ae60', '#eb5757'];
        const lineWidth = (isMobileViewport ? 70 + Math.random() * 170 : 90 + Math.random() * 250) * mobileScale;
        const lineThickness = obstacleThickness;
        const position = findFarthestChaosPosition(lineWidth);
        const angle = nextChaosLineIsHorizontal ? 0 : Math.PI / 2;
        nextChaosLineIsHorizontal = !nextChaosLineIsHorizontal;
        const chaosLine = Bodies.rectangle(
            position.x,
            position.y,
            lineWidth,
            lineThickness,
            {
                isStatic: true,
                angle: angle,
                render: { fillStyle: colors[Math.floor(Math.random() * colors.length)] }
            }
        );

        chaosLines.push(chaosLine);
        Composite.add(engine.world, chaosLine);

        setTimeout(() => {
            removeChaosLine(chaosLine);
        }, 9000 + elapsedSeconds * 120 + Math.random() * 4500);
    }

    function findFarthestChaosPosition(lineWidth) {
        const margin = Math.max(70, lineWidth / 2);
        const minX = Math.min(width / 2, margin);
        const maxX = Math.max(width / 2, width - margin);
        const minY = 90;
        const maxY = Math.max(minY, height - 220);
        let bestPosition = randomChaosPosition(minX, maxX, minY, maxY);
        let bestDistance = distanceToClosestChaosLine(bestPosition);

        for (let attempt = 0; attempt < 12; attempt++) {
            const candidate = randomChaosPosition(minX, maxX, minY, maxY);
            const distance = distanceToClosestChaosLine(candidate);

            if (distance > bestDistance) {
                bestPosition = candidate;
                bestDistance = distance;
            }
        }

        return bestPosition;
    }

    function randomChaosPosition(minX, maxX, minY, maxY) {
        return {
            x: minX + Math.random() * Math.max(1, maxX - minX),
            y: minY + Math.random() * Math.max(1, maxY - minY)
        };
    }

    function distanceToClosestChaosLine(position) {
        if (chaosLines.length === 0) {
            return Number.POSITIVE_INFINITY;
        }

        return chaosLines.reduce((closestDistance, chaosLine) => {
            const dx = position.x - chaosLine.position.x;
            const dy = position.y - chaosLine.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            return Math.min(closestDistance, distance);
        }, Number.POSITIVE_INFINITY);
    }

    function removeChaosLine(chaosLine) {
        if (state.gameOver) {
            return;
        }

        const index = chaosLines.indexOf(chaosLine);

        if (index !== -1) {
            chaosLines.splice(index, 1);
        }

        Composite.remove(engine.world, chaosLine);
    }

    function startBombs() {
        stopBombs();
        scheduleNextBomb();
    }

    function stopBombs() {
        if (bombTimeoutId) {
            clearTimeout(bombTimeoutId);
            bombTimeoutId = null;
        }
    }

    function scheduleNextBomb() {
        if (!state.gameStarted || state.gameOver) {
            return;
        }

        bombTimeoutId = setTimeout(() => {
            dropBomb();
            scheduleNextBomb();
        }, 1350);
    }

    function dropBomb() {
        if (!state.gameStarted || state.gameOver) {
            return;
        }

        const escapingBody = state.playerRole === 'escaping' ? player : aiPlayer;
        const bombColor = getBodyColor(escapingBody);
        const bomb = Bodies.circle(escapingBody.position.x, escapingBody.position.y, 6, {
            isStatic: true,
            isSensor: true,
            label: 'Bomb',
            render: {
                fillStyle: bombColor,
                strokeStyle: getSoftBodyColor(escapingBody),
                lineWidth: 3
            }
        });

        bombs.push(bomb);
        Composite.add(engine.world, bomb);

        if (bombs.length > state.maxTraps) {
            removeBomb(bombs.shift());
        }

        setTimeout(() => {
            removeBomb(bomb);
        }, 11000);
    }

    function removeBomb(bomb) {
        const index = bombs.indexOf(bomb);

        if (index !== -1) {
            bombs.splice(index, 1);
        }

        Composite.remove(engine.world, bomb);
    }

    function catcherTouchedBomb(catcherBody) {
        return bombs.some((bomb) => distanceBetween(catcherBody, bomb) <= 26);
    }

    function startShieldSpawns() {
        stopShieldSpawns();
        scheduleShieldSpawn();
    }

    function stopShieldSpawns() {
        if (shieldSpawnTimeoutId) {
            clearTimeout(shieldSpawnTimeoutId);
            shieldSpawnTimeoutId = null;
        }
    }

    function scheduleShieldSpawn() {
        if (!state.gameStarted || state.gameOver) {
            return;
        }

        shieldSpawnTimeoutId = setTimeout(() => {
            spawnShieldPickup();
            scheduleShieldSpawn();
        }, 5000 + Math.random() * 9000);
    }

    function spawnShieldPickup() {
        if (!state.gameStarted || state.gameOver || shieldPickup || escapingHasShield) {
            return;
        }

        shieldPickup = createHiddenPickup('Shield');
        Composite.add(engine.world, shieldPickup);

        setTimeout(removeShieldPickup, 8500);
    }

    function removeShieldPickup() {
        if (!shieldPickup) {
            return;
        }

        Composite.remove(engine.world, shieldPickup);
        shieldPickup = null;
    }

    function collectShieldIfTouched(escapingBody, escapingName) {
        if (!shieldPickup || distanceBetween(escapingBody, shieldPickup) > 42) {
            return;
        }

        removeShieldPickup();
        escapingHasShield = true;
        ui.log(`${escapingName} picked up a one-hit shield.`);
    }

    function startPowerSpawns() {
        stopPowerSpawns();
        schedulePowerSpawn();
    }

    function stopPowerSpawns() {
        if (powerSpawnTimeoutId) {
            clearTimeout(powerSpawnTimeoutId);
            powerSpawnTimeoutId = null;
        }
    }

    function schedulePowerSpawn() {
        if (!state.gameStarted || state.gameOver) {
            return;
        }

        powerSpawnTimeoutId = setTimeout(() => {
            spawnPowerPickup();
            schedulePowerSpawn();
        }, 6000 + Math.random() * 10000);
    }

    function spawnPowerPickup() {
        if (!state.gameStarted || state.gameOver || powerPickup || catcherHasPowerShot) {
            return;
        }

        powerPickup = createHiddenPickup('PowerShot');
        Composite.add(engine.world, powerPickup);

        setTimeout(removePowerPickup, 8500);
    }

    function removePowerPickup() {
        if (!powerPickup) {
            return;
        }

        Composite.remove(engine.world, powerPickup);
        powerPickup = null;
    }

    function collectPowerIfTouched(catcherBody, catcherName) {
        if (!powerPickup || distanceBetween(catcherBody, powerPickup) > 42) {
            return;
        }

        removePowerPickup();
        catcherHasPowerShot = true;
        ui.log(`${catcherName} picked up one powered shot.`);
    }

    function createHiddenPickup(label) {
        return Bodies.circle(
            70 + Math.random() * (width - 140),
            80 + Math.random() * (height - 190),
            16,
            {
                isStatic: true,
                isSensor: true,
                label: label,
                render: { visible: false }
            }
        );
    }

    function shootBullet() {
        if (!state.gameStarted || state.gameOver) {
            return;
        }

        const now = Date.now();

        if (now - lastShotAt < shotDelayMs) {
            return;
        }

        lastShotAt = now;

        const catcherBody = state.playerRole === 'catching' ? player : aiPlayer;
        const angle = getAimAngle();
        const isPowered = catcherHasPowerShot;
        const speed = isPowered ? 25 : 18;
        const radius = isPowered ? 9 : 5;
        const bulletColor = isPowered ? '#f2c94c' : getBodyColor(catcherBody);
        const bullet = Bodies.circle(
            catcherBody.position.x + Math.cos(angle) * 36,
            catcherBody.position.y + Math.sin(angle) * 36,
            radius,
            {
                label: 'Bullet',
                isPowered: isPowered,
                frictionAir: 0,
                restitution: 0.2,
                collisionFilter: { group: -1 },
                render: { fillStyle: bulletColor }
            }
        );

        catcherHasPowerShot = false;

        Body.setVelocity(bullet, {
            x: catcherBody.velocity.x + Math.cos(angle) * speed,
            y: catcherBody.velocity.y + Math.sin(angle) * speed
        });

        bullets.push(bullet);
        Composite.add(engine.world, bullet);

        setTimeout(() => {
            removeBullet(bullet);
        }, 1800);
    }

    function removeBullet(bullet) {
        const index = bullets.indexOf(bullet);

        if (index !== -1) {
            bullets.splice(index, 1);
        }

        Composite.remove(engine.world, bullet);
    }

    function bulletTouchedEscapingPlayer(escapingBody) {
        return bullets.some((bullet) => {
            const touched = distanceBetween(escapingBody, bullet) <= (bullet.isPowered ? 36 : 29);

            if (touched) {
                removeBullet(bullet);

                if (escapingHasShield) {
                    escapingHasShield = false;
                    ui.log('Shield blocked one bullet and shattered politely.');
                    return false;
                }
            }

            return touched;
        });
    }

    function distanceBetween(bodyA, bodyB) {
        const dx = bodyA.position.x - bodyB.position.x;
        const dy = bodyA.position.y - bodyB.position.y;

        return Math.sqrt(dx * dx + dy * dy);
    }

    function getBodyColor(body) {
        return body === player ? '#2f80ed' : '#eb5757';
    }

    function getSoftBodyColor(body) {
        return body === player ? '#9fd0ff' : '#ffb1aa';
    }
})();

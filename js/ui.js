(function () {
    const scoreStorageKey = 'catch-or-fire-score';

    function createGameUi() {
        const logElement = document.getElementById('log');
        const logToggle = document.getElementById('log-toggle');
        const timerElement = document.getElementById('timer');
        const scoreElement = document.getElementById('score');
        const controlsHint = document.getElementById('controls-hint');
        const gameOverElement = document.getElementById('game-over');
        const gameOverMessage = document.getElementById('game-over-message');
        const scores = loadScores();
        let controlsHintTimeout = null;
        const usesTouchControls = window.matchMedia('(pointer: coarse)').matches;

        logToggle.addEventListener('click', () => {
            const shouldShowLog = logElement.hidden;

            logElement.hidden = !shouldShowLog;
            logToggle.setAttribute('aria-expanded', String(shouldShowLog));
            logToggle.title = shouldShowLog ? 'Hide help' : 'Show help';

            if (shouldShowLog) {
                showControlsHint({ autoHide: false });
            } else if (usesTouchControls) {
                showControlsHint({ autoHide: false });
            } else {
                hideControlsHint();
            }
        });

        function log(message, value) {
            const text = value === undefined ? message : `${message} ${JSON.stringify(value, null, 2)}`;

            console.log(message, value ?? '');
            logElement.textContent += `${text}\n`;
        }

        function addWin(winnerName) {
            scores[winnerName] = (scores[winnerName] || 0) + 1;
            sessionStorage.setItem(scoreStorageKey, JSON.stringify(scores));
        }

        function updateHud(state) {
            const remainingSeconds = state.gameStarted && !state.gameOver
                ? Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000))
                : state.roundSeconds;

            timerElement.textContent = `Time: ${remainingSeconds}s`;
            scoreElement.textContent = `Score: ${state.playerName} ${scores[state.playerName] || 0} - ${scores[state.aiName] || 0} ${state.aiName}`;
        }

        function logScore(playerName, aiName) {
            log(`Session score: ${playerName} ${scores[playerName] || 0} - ${scores[aiName] || 0} ${aiName}.`);
        }

        function showGameOver(winnerName) {
            gameOverMessage.textContent = `${winnerName} wins`;
            gameOverElement.hidden = false;
        }

        function hideGameOver() {
            gameOverElement.hidden = true;
            gameOverMessage.textContent = '';
        }

        function showControlsHint(options = {}) {
            const autoHide = options.autoHide !== false;

            if (options.singlePlayerAuto !== undefined) {
                setControlsMode(options.singlePlayerAuto);
            }

            clearTimeout(controlsHintTimeout);
            controlsHint.hidden = false;
            controlsHint.classList.remove('fading');

            if (!autoHide) {
                return;
            }

            controlsHintTimeout = setTimeout(() => {
                hideControlsHint();
            }, 4800);
        }

        function hideControlsHint() {
            if (usesTouchControls) {
                showControlsHint({ autoHide: false });
                return;
            }

            clearTimeout(controlsHintTimeout);
            controlsHint.classList.add('fading');

            setTimeout(() => {
                controlsHint.hidden = true;
            }, 220);
        }

        function setControlsMode(singlePlayerAuto) {
            controlsHint.classList.toggle('single-player-auto', singlePlayerAuto);
        }

        return { log, addWin, updateHud, logScore, showGameOver, hideGameOver, showControlsHint, hideControlsHint, setControlsMode, scores };
    }

    function loadScores() {
        try {
            return JSON.parse(sessionStorage.getItem(scoreStorageKey)) || {};
        } catch (error) {
            return {};
        }
    }

    window.GameUi = { createGameUi };
})();

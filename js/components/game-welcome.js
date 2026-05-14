(function () {
    const clampNumber = window.GameRules.clampNumber;

    class GameWelcome extends HTMLElement {
        connectedCallback() {
            this.attachShadow({ mode: 'open' });
            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: block;
                        font-family: Arial, sans-serif;
                    }
                    .backdrop {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        overflow: auto;
                        padding: 20px;
                        box-sizing: border-box;
                        background: rgba(20, 24, 30, 0.58);
                    }
                    form {
                        width: min(420px, 100%);
                        max-height: calc(100vh - 40px);
                        overflow: auto;
                        padding: 24px;
                        border: 1px solid #d4d8df;
                        border-radius: 8px;
                        background: #ffffff;
                        box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25);
                        box-sizing: border-box;
                    }
                    h2 {
                        margin: 0 0 18px;
                        color: #222;
                        font-size: 28px;
                    }
                    .timer-field {
                        display: grid;
                        gap: 6px;
                        margin-bottom: 14px;
                        color: #222;
                        font-size: 14px;
                        font-weight: 700;
                    }
                    input {
                        height: 40px;
                        padding: 0 10px;
                        border: 1px solid #b8c0cc;
                        border-radius: 6px;
                        font: inherit;
                    }
                    button {
                        width: 100%;
                        height: 42px;
                        margin-top: 6px;
                        border: 0;
                        border-radius: 6px;
                        background: #2f80ed;
                        color: #ffffff;
                        cursor: pointer;
                        font: inherit;
                        font-weight: 700;
                    }
                    @media (max-width: 700px) {
                        .backdrop {
                            padding: 12px;
                        }

                        form {
                            width: min(380px, 100%);
                            max-height: calc(100vh - 24px);
                            padding: 16px;
                        }

                        h2 {
                            margin-bottom: 12px;
                            font-size: 22px;
                        }

                        .timer-field {
                            margin-bottom: 10px;
                            font-size: 13px;
                        }

                        input {
                            height: 36px;
                        }

                        button {
                            height: 38px;
                        }
                    }

                    @media (max-height: 430px) and (orientation: landscape) {
                        .backdrop {
                            align-items: flex-start;
                            padding: 8px;
                        }

                        form {
                            width: min(620px, 100%);
                            max-height: calc(100vh - 16px);
                            padding: 12px;
                        }

                        h2 {
                            margin-bottom: 8px;
                            font-size: 20px;
                        }

                        .timer-field {
                            margin-bottom: 8px;
                        }
                    }
                </style>
                <div class="backdrop">
                    <form>
                        <h2>Tiny Tag Game</h2>
                        <player-setup-field id="player-field" label="Blue player" value="Replaceable Human" maxlength="24" escaping escaping-toggle single-player-toggle></player-setup-field>
                        <player-setup-field id="ai-field" label="Red player" value="Mischievous AI" maxlength="18"></player-setup-field>
                        <label class="timer-field">
                            Seconds to catch
                            <input id="round-time" type="number" value="60" min="5" max="180" step="5">
                        </label>
                        <label class="timer-field">
                            Max traps
                            <input id="trap-count" type="number" value="3" min="1" max="12" step="1">
                        </label>
                        <label class="timer-field">
                            Shot delay seconds
                            <input id="shot-delay" type="number" value="1.2" min="0.3" max="5" step="0.1">
                        </label>
                        <button type="submit">Start Game</button>
                    </form>
                </div>
            `;

            const playerField = this.shadowRoot.getElementById('player-field');
            const aiField = this.shadowRoot.getElementById('ai-field');
            const form = this.shadowRoot.querySelector('form');
            const shouldDefaultToSinglePlayer = sessionStorage.getItem('tiny-tag-restart-single-player') !== 'false';

            sessionStorage.removeItem('tiny-tag-restart-single-player');

            playerField.focusInput();

            if (shouldDefaultToSinglePlayer) {
                playerField.singlePlayer = true;
                aiField.disabled = true;
            }

            this.shadowRoot.addEventListener('escaping-change', (event) => {
                playerField.escaping = event.detail.enabled;
            });

            this.shadowRoot.addEventListener('single-player-change', (event) => {
                aiField.disabled = event.detail.enabled;
            });

            this.shadowRoot.addEventListener('keydown', (event) => {
                const isSinglePlayerToggle = event.composedPath().some((element) => {
                    return element.type === 'checkbox';
                });

                if (isSinglePlayerToggle) {
                    return;
                }

                if (event.key === 'Enter') {
                    event.preventDefault();
                    form.requestSubmit();
                }
            });

            form.addEventListener('submit', (event) => {
                event.preventDefault();

                const playerName = playerField.playerName || 'Replaceable Human';
                const aiName = aiField.playerName || 'Mischievous AI';
                const role = playerField.escaping ? 'human-escaping' : 'human-catching';
                const roundSeconds = clampNumber(this.shadowRoot.getElementById('round-time').value, 5, 180, 30);
                const trapCount = clampNumber(this.shadowRoot.getElementById('trap-count').value, 1, 12, 3);
                const shotDelaySeconds = clampNumber(this.shadowRoot.getElementById('shot-delay').value, 0.3, 5, 1.2);
                const autoRed = playerField.singlePlayer;

                this.dispatchEvent(new CustomEvent('start-game', {
                    bubbles: true,
                    detail: { playerName, aiName, role, roundSeconds, trapCount, shotDelaySeconds, autoRed }
                }));

                this.remove();
            });
        }
    }

    customElements.define('game-welcome', GameWelcome);
})();

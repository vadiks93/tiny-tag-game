(function () {
    class PlayerSetupField extends HTMLElement {
        connectedCallback() {
            const label = this.getAttribute('label') || 'Player';
            const defaultName = this.getAttribute('value') || label;
            const maxLength = this.getAttribute('maxlength') || '18';
            const isEscaping = this.hasAttribute('escaping');
            const hasEscapingToggle = this.hasAttribute('escaping-toggle');
            const hasSinglePlayerToggle = this.hasAttribute('single-player-toggle');

            this.attachShadow({ mode: 'open' });
            this.shadowRoot.innerHTML = `
                <style>
                    :host { display: block; }
                    :host([hidden]) { display: none; }
                    .field {
                        display: grid;
                        grid-template-columns: minmax(0, 1fr) 112px;
                        gap: 8px;
                        align-items: end;
                        margin-bottom: 14px;
                    }
                    label {
                        display: grid;
                        gap: 6px;
                        color: #222;
                        font-size: 14px;
                        font-weight: 700;
                    }
                    .label-text {
                        display: flex;
                        gap: 6px;
                        align-items: center;
                    }
                    input {
                        min-width: 0;
                        height: 40px;
                        padding: 0 10px;
                        border: 1px solid #b8c0cc;
                        border-radius: 6px;
                        font: inherit;
                    }
                    input:disabled {
                        opacity: 0.55;
                        cursor: not-allowed;
                    }
                    .side-controls {
                        display: grid;
                        gap: 6px;
                        align-self: end;
                    }
                    .switch-control {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 6px;
                        min-height: 32px;
                        color: #4b5563;
                        font-size: 12px;
                        font-weight: 700;
                        cursor: pointer;
                    }
                    .switch-control input {
                        position: absolute;
                        width: 1px;
                        height: 1px;
                        opacity: 0;
                    }
                    .switch {
                        position: relative;
                        width: 42px;
                        height: 24px;
                        flex: 0 0 auto;
                        border: 1px solid #b8c0cc;
                        border-radius: 999px;
                        background: #eef1f5;
                        transition: background 160ms ease, border-color 160ms ease;
                    }
                    .switch::after {
                        content: "";
                        position: absolute;
                        top: 3px;
                        left: 3px;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: #ffffff;
                        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.24);
                        transition: transform 160ms ease;
                    }
                    .switch-control input:checked + .switch {
                        border-color: #2f80ed;
                        background: #2f80ed;
                    }
                    .switch-control input:checked + .switch::after {
                        transform: translateX(18px);
                    }
                    .switch-control input:focus-visible + .switch {
                        outline: 2px solid #111827;
                        outline-offset: 2px;
                    }
                    .switch-control input:disabled + .switch {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                    .switch-text {
                        white-space: nowrap;
                    }
                    .info-button {
                        display: none;
                        width: 24px;
                        height: 24px;
                        border: 1px solid #b8c0cc;
                        border-radius: 50%;
                        background: #ffffff;
                        color: #4b5563;
                        cursor: pointer;
                        padding: 0;
                        font: 700 14px/1 Arial, sans-serif;
                    }
                    .info-button.visible {
                        display: grid;
                        place-items: center;
                    }
                    .placeholder-control {
                        min-height: 32px;
                    }
                    .top-control {
                        grid-column: 1 / -1;
                        justify-content: flex-start;
                        margin-bottom: -2px;
                    }
                    .input-row-control {
                        min-height: 40px;
                    }

                    @media (max-width: 700px) {
                        .field {
                            grid-template-columns: minmax(0, 1fr) 96px;
                            gap: 6px;
                            margin-bottom: 10px;
                        }

                        label {
                            font-size: 13px;
                        }

                        input {
                            height: 36px;
                        }

                        .input-row-control {
                            min-height: 36px;
                        }
                    }

                    @media (max-height: 430px) and (orientation: landscape) {
                        .field {
                            margin-bottom: 8px;
                        }
                    }
                </style>
                <div class="field">
                    ${hasSinglePlayerToggle ? `
                            <label class="switch-control top-control">
                                <input id="single-player" type="checkbox">
                                <span class="switch" aria-hidden="true"></span>
                                <span class="switch-text">Single Player</span>
                                <button id="single-player-info" class="info-button" type="button" title="Mobile uses single player">?</button>
                            </label>
                        ` : ''}
                    <label>
                        <span class="label-text">${label}</span>
                        <input type="text" value="${defaultName}" maxlength="${maxLength}" autocomplete="off">
                    </label>
                    <div class="side-controls">
                        ${hasEscapingToggle ? `
                            <label class="switch-control input-row-control">
                                <input id="escaping-toggle" type="checkbox" ${isEscaping ? 'checked' : ''}>
                                <span class="switch" aria-hidden="true"></span>
                                <span class="switch-text">Escaping</span>
                            </label>
                        ` : '<div class="placeholder-control"></div>'}
                    </div>
                </div>
            `;

            this.setupSwitch('escaping-toggle', 'escaping-change');
            this.setupSwitch('single-player', 'single-player-change');

            const singlePlayerInfo = this.shadowRoot.getElementById('single-player-info');

            if (singlePlayerInfo) {
                singlePlayerInfo.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.dispatchEvent(new CustomEvent('single-player-info', { bubbles: true }));
                });
            }
        }

        setupSwitch(id, eventName) {
            const input = this.shadowRoot.getElementById(id);

            if (!input) {
                return;
            }

            input.addEventListener('change', () => {
                this.dispatchEvent(new CustomEvent(eventName, {
                    bubbles: true,
                    detail: { enabled: input.checked }
                }));
            });

            input.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                input.checked = !input.checked;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }

        get playerName() {
            return this.shadowRoot.querySelector('input[type="text"]').value.trim();
        }

        focusCheckbox() {
            this.shadowRoot.querySelector('input[type="checkbox"]').focus();
        }

        get escaping() {
            const input = this.shadowRoot.getElementById('escaping-toggle');
            return Boolean(input && input.checked);
        }

        set escaping(value) {
            const input = this.shadowRoot.getElementById('escaping-toggle');

            if (input) {
                input.checked = Boolean(value);
            }
        }

        get singlePlayer() {
            const input = this.shadowRoot.getElementById('single-player');
            return Boolean(input && input.checked);
        }

        set singlePlayer(value) {
            const input = this.shadowRoot.getElementById('single-player');

            if (input) {
                input.checked = Boolean(value);
            }
        }

        set singlePlayerDisabled(value) {
            const input = this.shadowRoot.getElementById('single-player');
            const info = this.shadowRoot.getElementById('single-player-info');

            if (input) {
                input.disabled = Boolean(value);
            }

            if (info) {
                info.classList.toggle('visible', Boolean(value));
            }
        }

        set disabled(value) {
            this.shadowRoot.querySelector('input[type="text"]').disabled = Boolean(value);
        }
    }

    customElements.define('player-setup-field', PlayerSetupField);
})();

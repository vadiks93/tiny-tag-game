# Tiny Tag Game Specification

This document captures the current intended behavior and structure of the game. Use it as the reference context before changing gameplay, refactoring files, or adding mechanics.

## Goal

Tiny Tag Game is a small Matter.js browser game with two circular players. One player is the catcher and the other is escaping. The catcher tries to tag or shoot the escaping player before time expires. The escaping player tries to survive, drop traps, and use defensive pickups.

## Runtime

- Plain HTML, CSS, and JavaScript.
- Matter.js is loaded from `node_modules/matter-js/build/matter.min.js`.
- Scripts are regular browser scripts, not ES modules.
- Shared helpers are exposed through `window` namespaces.
- `index.html` should keep working when opened directly in a browser.
- `server.js` is an optional local static server.

## Files

- `index.html`: page shell, HUD, log button, script loading.
- `server.js`: optional static server.
- `assets/`: SVG player icons used for the canvas-drawn player visuals.
- `js/game-rules.js`: small shared rules/helpers that can be unit tested in Node.
- `js/components/player-setup-field.js`: player setup row web component.
- `js/components/game-welcome.js`: start modal web component.
- `js/ui.js`: log panel, HUD updates, session score storage.
- `js/effects.js`: canvas drawing helpers and explosion effect.
- `js/game.js`: Matter.js world, controls, rules, spawners, traps, bullets, pickups, and win conditions.

## Start Modal

The game starts with `<game-welcome>`.

Setup fields:

- Blue player name, default `Replaceable Human`.
- Single player checkbox appears on the blue player row. When enabled, red becomes the automated player and the red name input is disabled.
- Red player name, default `Mischievous AI`.
- A single switch on the blue player row controls roles: on means blue escapes, off means red escapes.
- Seconds to catch, default `60`, clamped from `5` to `180`.
- Max traps, default `3`, clamped from `1` to `12`.
- Shot delay seconds, default `1.2`, clamped from `0.3` to `5`.

Behavior:

- Blue player input is focused on load.
- Mobile landscape uses a compact setup layout with numeric settings in one row.
- Pressing `Enter` submits the modal unless focus is on a switch.
- Switches support `Space` natively and also toggle on `Enter`.
- The modal opens with Single Player enabled by default.
- Submit dispatches `start-game`.
- Modal removes itself after submit.

`start-game` detail:

```js
{
  playerName,
  aiName,
  role,
  roundSeconds,
  trapCount,
  shotDelaySeconds,
  autoRed
}
```

## Controls

- Blue player: arrow keys.
- Red player: `W`, `A`, `S`, `D`.
- Current catcher shoots with `Space`.
- If auto red player is enabled, red movement is controlled by simple AI instead of `W`, `A`, `S`, `D`.
- If auto red player is enabled, the control hint shows only the blue arrow controls and centers them near the bottom.
- On touch/mobile devices, Single Player is forced because two-player controls work better on desktop.
- On touch/mobile single-player, tapping the arena moves blue toward the tapped point instead of relying on arrow controls.
- On touch/mobile, a virtual shoot button appears under the HUD only when blue/human is catching.
- Touch/mobile movement speed is slightly reduced for better control.
- Holding exactly one movement direction builds a capped acceleration bonus over a short ramp. Changing direction, pressing multiple directions, or moving diagonally resets that bonus.

Only the catcher shows:

- black center dot
- rotating aim line

The dot and aim line are canvas-only visuals and scale down on mobile.

## Roles

Each round has:

- one `catching` player
- one `escaping` player

If blue is escaping, red catches. If blue is catching, red escapes.

Optional red player AI behavior:

- if red is catching, red moves toward blue
- if red is catching, nearby bombs push its movement away from danger
- if red is escaping, it evaluates possible movement directions every physics tick and chooses the projected position that puts it farthest from blue
- escaping AI applies a small wall penalty so it avoids sitting against arena edges when another escape path is better
- escaping AI also penalizes projected positions near incoming bullets, with powered bullets treated as more dangerous
- the AI uses simple directional movement, not pathfinding
- if red appears stuck against an obstacle, it briefly moves in a random direction before resuming its normal chase or escape behavior
- if auto red is catching, it shoots automatically when its rotating aim line is close enough to the blue player

## Win Conditions

The catcher wins if:

- catcher touches the escaping player
- catcher bullet hits the escaping player and no shield blocks it

The escaping player wins if:

- timer expires
- catcher touches a trap

On loss:

- losing body is removed from the Matter world
- explosion particles are spawned
- score is updated
- round spawners stop
- surviving player is frozen so the game is clearly over
- all arena sticks become dynamic and fall under gravity
- scheduled stick cleanup is ignored after game over so falling sticks remain visible
- physics continues so explosion particles and falling sticks can finish moving

## Timer And Score

HUD shows:

- remaining time
- session score
- centered game-over banner with winner name after the round ends
- after game over, `Enter`, `Space`, or tapping/clicking the arena reloads the page to start a new round

Score is stored in `sessionStorage` under:

```js
catch-or-fire-score
```

Scores are keyed by player name.

## Log Panel

The log is hidden by default behind the bottom-right `?` button.

The log records:

- round start
- roles
- timer/trap/shot settings
- pickup events
- win/loss reasons
- session score

## Arena

The Matter world includes:

- ground
- ceiling
- left wall
- right wall
- one initial diagonal line
- random chaos lines
- players start near opposite horizontal sides so the round begins with more distance

Chaos lines:

- are straight static rectangle bodies
- spawn faster over time
- use random position, length, thickness, angle, and color
- are shorter and thinner on mobile, with smaller mobile player bodies for extra room
- expire after a delay
- have a growing active cap up to `32`

Curved chaos lines were tried and intentionally removed. Current chaos obstacles are straight lines only.

## Traps

The escaping player drops traps automatically.

Trap rules:

- static sensor circle
- radius `6`
- fill and outline match the escaping player color
- trigger distance `26`
- max active traps comes from modal setup
- if active traps exceed the max, oldest trap is removed
- traps expire after `11000ms`
- if the catcher touches a trap, the catcher loses

Traps do not physically push players.

## Shooting

The catcher shoots from the rotating aim line.

In auto red mode, `Space` only fires when blue is the catcher. If red is the auto catcher, the bot controls its own shots.

Normal bullet:

- radius `5`
- speed `18`
- lifetime `1800ms`
- hit distance `29`
- fill matches the current catcher color, blue for human and red for AI

Powered bullet:

- radius `9`
- speed `25`
- hit distance `36`
- fill `#f2c94c`

Shot delay is configured in the modal.

## Shield Pickup

Shield is for the escaping player.

Rules:

- appears randomly
- one active shield pickup at a time
- visible as a shield icon matching the escaping player color
- hidden sensor body handles pickup
- expires after `8500ms`
- escaping player gets a matching color aura when collected
- blocks one bullet, then disappears
- can block a powered bullet

## Power Shot Pickup

Power shot is for the catcher.

Rules:

- appears randomly
- one active power pickup at a time
- visible as golden bullet icon
- hidden sensor body handles pickup
- expires after `8500ms`
- catcher gets a yellow aura when collected
- next bullet is powered
- power is consumed after one shot

## Drawing Strategy

Canvas-only visuals live in `js/effects.js`:

- player SVG icons drawn over colored fallback badges while the Matter bodies remain circular
- player names
- catcher center dot
- rotating aim line
- shield icon
- shield aura
- power bullet icon
- power aura

Use canvas drawing for decoration. Use Matter bodies only when physics, pickup detection, or world interaction is needed.

## Physics Strategy

Current approach:

- players are Matter circle bodies
- player tag is checked by distance
- traps, bullets, and pickups use distance checks for game rules
- pickups have hidden sensor bodies for position/presence
- decorative objects should not be Matter bodies
- player collision filters avoid physical shoving between the two players

## Change Rules

When adding or changing features:

- update this document if behavior changes
- keep setup UI inside web components
- keep HUD/log/session score in `js/ui.js`
- keep canvas-only drawings in `js/effects.js`
- keep gameplay rules and Matter objects in `js/game.js`
- avoid physics bodies for purely visual details
- preserve direct `index.html` loading unless intentionally adding a build step
- run `npm test` after changing shared rule helpers

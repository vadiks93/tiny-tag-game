# Tiny Tag Game

Tiny Tag Game is a small browser game built with Matter.js. One player catches, the other escapes. The catcher can tag or shoot, while the escaping player drops traps, grabs shields, and tries to survive until time runs out.

The game supports local two-player controls and a single-player mode where the red player becomes a simple AI bot.

## Play Locally

Install dependencies:

```bash
npm install
```

Run the local static server:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

You can also open `index.html` directly in a browser during local development.

## Controls

- Blue player: arrow keys
- Red player: `W`, `A`, `S`, `D`
- Current catcher: `Space` to shoot
- On mobile, virtual controls are shown on screen

## Single Player

Single Player is enabled by default in the setup modal. In this mode, the red player is controlled by a simple AI that can chase, escape, avoid bombs, and dodge incoming bullets.

## Build

Create the static production bundle:

```bash
npm run build
```

The build output is written to `dist/`.

## Test

Run unit tests:

```bash
npm test
```

## GitHub Pages

This project includes a GitHub Actions workflow in `.github/workflows/ci-pages.yml`.

On pushes and pull requests to `main` or `develop`, the workflow runs:

```bash
npm ci
npm test
npm run build
```

On pushes to `main`, it also deploys the built `dist/` folder to GitHub Pages.

In your GitHub repository settings, set Pages source to **GitHub Actions**.

## Project Notes

- `server.js` is only a local development server.
- GitHub Pages serves the static files generated in `dist/`.
- `documentation.md` is the gameplay/spec reference for future changes.

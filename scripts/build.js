const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const sourceAssets = path.join(root, 'assets');
const distAssets = path.join(dist, 'assets');
const bundlePath = path.join(dist, 'bundle.js');
const htmlPath = path.join(dist, 'index.html');

const scripts = [
    'node_modules/matter-js/build/matter.min.js',
    'js/game-rules.js',
    'js/components/player-setup-field.js',
    'js/components/game-welcome.js',
    'js/ui.js',
    'js/effects.js',
    'js/game.js'
];

if (!fs.existsSync(dist)) {
    fs.mkdirSync(dist);
}

if (!fs.existsSync(distAssets)) {
    fs.mkdirSync(distAssets);
}

const bundle = scripts
    .map((file) => {
        const absolutePath = path.join(root, file);
        return `\n/* ${file} */\n${fs.readFileSync(absolutePath, 'utf8')}\n`;
    })
    .join('\n');

const html = fs
    .readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace(
        /    <script src="\.\/node_modules\/matter-js\/build\/matter\.min\.js"><\/script>\r?\n    <script src="\.\/js\/game-rules\.js"><\/script>\r?\n    <script src="\.\/js\/components\/player-setup-field\.js"><\/script>\r?\n    <script src="\.\/js\/components\/game-welcome\.js"><\/script>\r?\n    <script src="\.\/js\/ui\.js"><\/script>\r?\n    <script src="\.\/js\/effects\.js"><\/script>\r?\n    <script src="\.\/js\/game\.js"><\/script>/,
        '    <script src="./bundle.js"></script>'
    );

fs.writeFileSync(bundlePath, bundle);
fs.writeFileSync(htmlPath, html);

fs.readdirSync(sourceAssets)
    .filter((file) => file.endsWith('.svg'))
    .forEach((file) => {
        fs.copyFileSync(path.join(sourceAssets, file), path.join(distAssets, file));
    });

console.log('Built dist/index.html');
console.log('Built dist/bundle.js');
console.log('Copied dist/assets');

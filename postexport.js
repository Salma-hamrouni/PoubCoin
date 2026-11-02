const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'dist/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts');
const indexPath = path.join(__dirname, 'dist/index.html');

// Find Ionicons font file
const files = fs.readdirSync(fontsDir);
const ioniconsFile = files.find(f => f.startsWith('Ionicons'));
if (!ioniconsFile) { console.error('Ionicons font not found'); process.exit(1); }

// Convert to base64
const fontPath = path.join(fontsDir, ioniconsFile);
const fontBytes = fs.readFileSync(fontPath);
const fontBase64 = fontBytes.toString('base64');
const dataUrl = `data:font/truetype;base64,${fontBase64}`;

// 1. Inject @font-face into index.html (CSS-based loading)
let html = fs.readFileSync(indexPath, 'utf8');
const fontFace = `<style>@font-face{font-family:'Ionicons';src:url('${dataUrl}') format('truetype');font-display:block;}</style>`;
html = html.replace('</head>', `${fontFace}</head>`);
fs.writeFileSync(indexPath, html, 'utf8');
console.log(`✓ Injected Ionicons font (${(fontBase64.length / 1024).toFixed(0)}KB base64) into index.html`);

// 2. Copy font to /fonts/ so Vercel can serve it without node_modules path issues
const fontsDest = path.join(__dirname, 'dist/fonts');
if (!fs.existsSync(fontsDest)) fs.mkdirSync(fontsDest, { recursive: true });
fs.copyFileSync(fontPath, path.join(fontsDest, ioniconsFile));
console.log(`✓ Copied font to dist/fonts/${ioniconsFile}`);

// 3. Patch every JS bundle: replace the deep node_modules font URL with the simple /fonts/ path
const expoStaticDir = path.join(__dirname, 'dist/_expo/static/js/web');
if (fs.existsSync(expoStaticDir)) {
  const jsFiles = fs.readdirSync(expoStaticDir).filter(f => f.endsWith('.js'));
  jsFiles.forEach(jsFile => {
    const jsPath = path.join(expoStaticDir, jsFile);
    let js = fs.readFileSync(jsPath, 'utf8');
    // Replace the hashed Ionicons URL with the simple /fonts/ path
    const before = js.length;
    js = js.replace(
      /assets\/node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/Ionicons\.[a-f0-9]+\.ttf/g,
      `fonts/${ioniconsFile}`
    );
    if (js.length !== before || js.includes(`fonts/${ioniconsFile}`)) {
      fs.writeFileSync(jsPath, js, 'utf8');
      console.log(`✓ Patched font URL in ${jsFile}`);
    }
  });
}

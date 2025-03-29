// config.js
require('dotenv').config({ path: './env' });
const fs = require('fs');
const path = require('path');

// config.json の読み込み（なければ空オブジェクト）
const configPath = path.join(__dirname, 'config.json');
let jsonConfig = {};
if (fs.existsSync(configPath)) {
    try {
        jsonConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
        console.error("config.json の読み込みに失敗しました:", e);
    }
}

const config = {
    isWindows: process.platform === 'win32',
    isMac: process.platform === 'darwin',
    isLinux: process.platform === 'linux',
    testMode: process.argv.includes("test"),
    camTestMode: parseInt(process.argv.find(arg => arg.startsWith("cam="))?.split("=")[1]) || 0,
    watchDir: process.env.WATCH_DIR,
    renamedDir: process.env.RENAMED_DIR,
    backupDir: process.env.BACKUP_DIR || '../backup_images',
    timelag: process.argv[3] || process.env.TIMELAG || 2000,
    dayText: "20310101",
    imageWidth: process.env.IMAGE_WIDTH,
    imageQuality: process.env.IMAGE_QUALITY,
    photoSizes: [
        process.env.XL || 'X',
        process.env.L || 'H',
        process.env.M || 'M',
        process.env.S || 'L',
        process.env.XS || 'P'
    ],
    clipRatios: [
        process.env.XL_R || 0.7,
        process.env.L_R || 0.6,
        process.env.M_R || 0.45,
        process.env.S_R || 0.33,
        process.env.XS_R || 0.28
    ],
    // 🔽 config.json > 環境変数 > デフォルトの優先順で読み込む
    aspectRatio: jsonConfig.aspectRatio || parseFloat(process.env.ASPECT_RATIO) || 1.0,
};

module.exports = config;
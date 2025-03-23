// config.js
require('dotenv').config({ path: './env' });

const config = {
    isWindows: process.platform === 'win32',
    isMac: process.platform === 'darwin',
    isLinux: process.platform === 'linux',
    testMode: process.argv.includes("test"),
    camTestMode: process.argv.includes("cam"),
    watchDir: process.env.WATCH_DIR,
    renamedDir: process.env.RENAMED_DIR,
    timelag: process.argv[3] || process.env.TIMELAG || 2000,
    dayText: "20310101",
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
    ]
};

module.exports = config;
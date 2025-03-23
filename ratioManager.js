// ratioManager.js
const fs = require("fs");
const path = "./clipRatios.json";

// デフォルト比率を定義（config.jsと同じ値にしておく）
const defaultRatios = {
    XL: parseFloat(process.env.XL_R) || 0.7,
    L:  parseFloat(process.env.L_R)  || 0.6,
    M:  parseFloat(process.env.M_R)  || 0.45,
    S:  parseFloat(process.env.S_R)  || 0.33,
    XS: parseFloat(process.env.XS_R) || 0.28
};

function loadRatios() {
    try {
        return JSON.parse(fs.readFileSync(path));
    } catch (e) {
        return {};
    }
}

function saveRatios(ratios) {
    fs.writeFileSync(path, JSON.stringify(ratios, null, 2));
}

function updateClipRatio(sizeKey, newRatio) {
    const ratios = loadRatios();
    ratios[sizeKey] = parseFloat(newRatio);
    saveRatios(ratios);
    console.log(`✅ ${sizeKey} を ${newRatio} に更新しました`);
}

function displayRatios() {
    const ratios = loadRatios();
    console.log("現在のclipRatios:");
    console.table(ratios);
}

function resetRatios() {
    saveRatios(defaultRatios);
    console.log("✅ clipRatios を初期値にリセットしました");
}

module.exports = {
    updateClipRatio,
    displayRatios,
    loadRatios,
    resetRatios
};
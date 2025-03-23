// ratioManager.js
const fs = require("fs");
const path = "./clipRatios.json";

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

module.exports = {
    updateClipRatio,
    displayRatios,
    loadRatios
};
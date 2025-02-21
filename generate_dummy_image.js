const sharp = require('sharp');
const { createCanvas } = require('canvas');
const path = require('path');
const fs = require('fs');

/**
 * ダミー画像を生成し、製品番号を印字する
 * @param {string} barcode_number - バーコード番号
 * @param {string} dest - 画像の保存先
 * @param {string} ext - 画像の拡張子 (jpg, png)
 * @param {object} eventLogger - ログ出力用オブジェクト
 */
async function generateDummyImage(barcode_number, dest, ext, eventLogger) {
    try {
        const width = 800;
        const height = 800;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // 背景をグレーにする
        ctx.fillStyle = '#CCCCCC';
        ctx.fillRect(0, 0, width, height);

        // 製品番号を描画
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 96px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${barcode_number}`, width / 2, height / 2);

        // バッファに変換
        const buffer = canvas.toBuffer('image/png');

        // sharp で JPEG に変換して保存
        await sharp(buffer)
            .jpeg({ quality: 80 })
            .toFile(`${dest}.${ext}`);

        eventLogger.info(`ダミー画像を作成: ${dest}.${ext}`);
    } catch (error) {
        eventLogger.error(`ダミー画像の生成に失敗しました: ${error.message}`);
    }
}

module.exports = generateDummyImage;
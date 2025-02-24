const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * 既存の画像 (/images/noimage.jpg) を背景にして製品番号を印字する (canvas なし)
 * @param {string} barcode_number - バーコード番号
 * @param {string} dest - 画像の保存先
 * @param {string} ext - 画像の拡張子 (jpg, png)
 * @param {object} eventLogger - ログ出力用オブジェクト
 */
async function generateDummyImage(barcode_number, dest, ext, eventLogger) {
    try {
        const inputImagePath = path.join(__dirname, '/images/noimage.jpg');

        // 画像情報を取得（サイズを取得）
        const metadata = await sharp(inputImagePath).metadata();
        const width = metadata.width || 800;
        const height = metadata.height || 800;

        // テキストを画像として生成
        const textSvg = `
            <svg width="${width}" height="${height}">
                <rect width="100%" height="100%" fill="rgba(0,0,0,0)" />
                <text x="50%" y="50%" font-size="144" font-weight="bold" font-family="Arial"
                      fill="black" text-anchor="middle" dominant-baseline="middle">${barcode_number}</text>
            </svg>
        `;

        // `sharp` を使って背景画像の上にテキスト画像を重ねる
        await sharp(inputImagePath)
            .composite([
                {
                    input: Buffer.from(textSvg),
                    gravity: 'center' // 画像の中央にテキストを配置
                }
            ])
            .toFormat(ext === 'jpg' ? 'jpeg' : 'png', { quality: 80 })
            .toFile(`${dest}.${ext}`);

        eventLogger.info(`ダミー画像を作成: ${dest}.${ext}`);
    } catch (error) {
        eventLogger.error(`ダミー画像の生成に失敗しました: ${error.message}`);
    }
}

module.exports = generateDummyImage;
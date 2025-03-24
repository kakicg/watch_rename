const sys = require("./systemController");
const log4js = require('log4js');
log4js.configure("log-config.json");
const eventLogger = log4js.getLogger('event');
const image_clipper = require('./imageClipper');
const fs = require('fs');
const ratioFilePath = './clipRatios.json';

function loadClipRatios() {
    try {
        return JSON.parse(fs.readFileSync(ratioFilePath));
    } catch (e) {
        return {}; // fallback
    }
}

const create_dest = (config, barcode) => {
    let dest = config.renamedDir
    dest = dest + "/" + config.dayText;
    sys.check_dir(dest);
    dest = dest + "/" + barcode.lane;
    sys.check_dir(dest);
    dest = dest + "/" + barcode.name;
    console.log(`dest(ev): ${dest}`);
    return dest;
}
const evaluate_and_or_copy = (photo, barcode, config) => {
    let pdate_bdate = photo.date - barcode.date;
    console.log(`barcode.name: ${barcode.name}`);
    console.log(`barcode.number: ${barcode.number}`);
    console.log(`barcode.date: ${barcode.date}`);
    console.log(`barcode.size: ${barcode.size}`);
    if ( photo.name.length > 0 && barcode.name.length > 0) {
        eventLogger.info(`config.timelag: ${Math.abs(photo.date - barcode.date)}, photo: ${photo.date}, barcode: ${barcode.date}`);
        if ( Math.abs(pdate_bdate) < config.timelag || config.testMode ) {

            let p = config.photoSizes.indexOf(barcode.size);
            if (p < 0) p = 0;

            const ratios = loadClipRatios();
            const ratioKey = Object.keys(ratios)[p] || 'XS'; // Fallback
            const clipRatio = ratios[ratioKey] || config.clipRatios[p];

            let src = config.watchDir + "/" + photo.name;
            let exts = photo.name.split(".");
            let ext = exts.length > 1 ? exts[exts.length - 1] : "";

            let dest = config.renamedDir + "/" + config.dayText;
            sys.check_dir(dest);
            dest = dest + "/" + barcode.lane;
            sys.check_dir(dest);
            dest = dest + "/" + barcode.name;

            console.log(`dest(ev): ${dest}`);
            image_clipper.clip_rename(src, dest, ext, clipRatio, eventLogger);
            eventLogger.info(`**** ファイル名:${barcode.name}, クリップサイズ: ${barcode.size}, クリップ率:${clipRatio}`);

            photo.reset();
            barcode.reset();
        } else {
            if (pdate_bdate <0) {
                if (photo.name.length>0) {
                    eventLogger.warn(`フォトデータ[ ${photo.name}(${photo.date}) ] に対応するバーコード情報が得られませんでした。\n余分な写真データが作られたか、バーコードリーダーが作動しなかった可能性があります。`);
                    // uncompleted_images.push({pname:photo.name, pdate:photo.date})
                }
                photo.reset();
                sys.clear_folder(config.watchDir);
            } else {
                if (barcode.number.length>0) {
                    const message = `バーコードデータ[ ${barcode.number}(${barcode.date}) ] に対応する写真データが得られませんでした。\n写真シャッターが作動しなかった可能性があります。`
                    eventLogger.warn(message);
                    // uncompleted_barcodes.push({bnumber:barcode.number, bdate:barcode.date})
                }
                barcode.reset();
            }
        }
    }
};
module.exports = evaluate_and_or_copy;
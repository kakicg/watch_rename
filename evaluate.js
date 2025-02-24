const sys = require("./systemController");
const log4js = require('log4js');
log4js.configure("log-config.json");
const eventLogger = log4js.getLogger('event');
const image_clipper = require('./imageClipper');

const evaluate_and_or_copy = (photo, barcode, config) => {
    let pdate_bdate = photo.date - barcode.date;
    if ( photo.name.length > 0 && barcode.name.length > 0) {
        eventLogger.info(`config.timelag: ${Math.abs(photo.date - barcode.date)}, photo: ${photo.date}, barcode: ${barcode.date}`);
        if ( Math.abs(pdate_bdate) < config.timelag || config.testMode ) {
            let src = config.watchDir + "/" + photo.name;
            let exts = photo.name.split(".");
            let ext ="";
            if(exts.length>1) ext=exts[exts.length-1];
            subdir = config.dayText + "/" + barcode.lane;
            let dest = config.renamedDir
            dest = dest + "/" + config.dayText;
            sys.check_dir(dest);
            dest = dest + "/" + barcode.lane;
            sys.check_dir(dest);
            dest = dest + "/" + barcode.name;
            let p = config.photoSizes.indexOf(barcode.size);
            if ( p < 0 ) { p = 0 }
            image_clipper.clip_rename(src, dest, ext, config.clipRatios[p], eventLogger)
            eventLogger.info(`**** ファイル名:${barcode.name}, クリップサイズ: ${barcode.size}, クリップ率:${config.clipRatios[p]}`);
            photo.reset();
            barcode.reset();
        } else {
            if (pdate_bdate <0) {
                if (photo.name.length>0) {
                    eventLogger.warn(`フォトデータ[ ${photo.name}(${photo.date}) ] に対応するバーコード情報が得られませんでした。\n余分な写真データが作られたか、バーコードリーダーが作動しなかった可能性があります。`);
                        uncompleted_images.push({pname:photo.name, pdate:photo.date})
                }
                photo.reset();
                sys.clear_folder(config.watchDir);
            } else {
                if (barcode.number.length>0) {
                    const message = `バーコードデータ[ ${barcode.number}(${barcode.date}) ] に対応する写真データが得られませんでした。\n写真シャッターが作動しなかった可能性があります。`
                    send_warning("写真データなし", message, 1 )
                    eventLogger.warn(message);
                        uncompleted_barcodes.push({bnumber:barcode.number, bdate:barcode.date})
                }
                barcode.reset();
            }
        }
    }
};
module.exports = evaluate_and_or_copy;
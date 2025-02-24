const config = require('./config');
const fs = require("fs");
const path = require("path");
const sys = require("./systemController");
const image_clipper = require('./imageClipper');
const log4js = require('log4js');
log4js.configure("log-config.json");
const eventLogger = log4js.getLogger('event');

const evaluate_and_or_copy = (photo, barcode, watch_dir, rename_dir, timelag, test_mode, clip_ratios, photo_sizes, day_text, photo_reset, barcode_reset) => {
    let pdate_bdate = photo.date - barcode.date;
    if (photo.name.length > 0 && barcode.name.length > 0) {
        eventLogger.info(`timelag: ${Math.abs(photo.date - barcode.date)}, photo: ${photo.date}, barcode: ${barcode.date}`);
        if (Math.abs(pdate_bdate) < timelag || test_mode) {
            let src = watch_dir + "/" + photo.name;
            let exts = photo.name.split(".");
            let ext = "";
            if (exts.length > 1) ext = exts[exts.length - 1];

            let subdir = day_text + "/" + barcode.lane;
            let dest = rename_dir + "/" + day_text;
            sys.check_dir(dest);
            dest += "/" + barcode.lane;
            sys.check_dir(dest);
            dest += "/" + barcode.name;

            let p = photo_sizes.indexOf(barcode.size);
            if (p < 0) { p = 0 }

            image_clipper.clip_rename(src, dest, ext, clip_ratios[p], eventLogger);
            eventLogger.info(`**** ファイル名:${barcode.name}, クリップサイズ: ${barcode.size}, クリップ率:${clip_ratios[p]}`);

            photo_reset();
            barcode_reset();
        } else {
            if (pdate_bdate < 0) {
                if (photo.name.length > 0) {
                    eventLogger.warn(`フォトデータ[ ${photo.name}(${photo.date}) ] に対応するバーコード情報が得られませんでした。\n余分な写真データが作られました。`);
                    uncompleted_images.push({ pname: photo.name, pdate: photo.date });
                }
                photo_reset();
                sys.clear_folder(watch_dir);
            } else {
                if (barcode.number.length > 0) {
                    const message = `バーコードデータ[ ${barcode.number}(${barcode.date}) ] に対応する写真データが得られませんでした。\n写真シャッターが作動しませんでした。`;
                    send_warning("写真データなし", message, 1);
                    eventLogger.warn(message);
                    uncompleted_barcodes.push({ bnumber: barcode.number, bdate: barcode.date });
                }
                barcode_reset();
            }
        }
    }
};

module.exports = evaluate_and_or_copy;
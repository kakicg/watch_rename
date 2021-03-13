const sharp = require('sharp');
const fs = require("fs");
const path = require("path");


//トリミング処理
const clip_image = (src, dest, ext, width, height, offset_x, offset_y, eventLogger) => {
    eventLogger.info(`width:${width}, height:${height}, offset_x:${offset_x}, offset_y:${offset_y}`);
    sharp(src).extract({ width: width, height: height, left: offset_x, top: offset_y }).resize(800).jpeg({quality:60}).toFile(`${dest}.${ext}`)
    .then(function(new_file_info) {
        eventLogger.info(`リネーム（${src}　> ${dest}.${ext}`);
        fs.unlinkSync(src, (err) => {
            if (err) {
                eventLogger.error(err);
                throw err;
            }
        });

    })
    .catch(function(err) {
        console.log(err);
    });
}

//画像トリミング&リネーム
exports.clip_rename = (src, dest, ext, clip_ratio, eventLogger) => {
    let width, height, offset_x, offset_y;
    sharp(src).metadata()
    .then(function(metadata) {
        width = Math.round(metadata.width*clip_ratio);
        height = Math.round(metadata.height*clip_ratio);

        offset_x = Math.round( (metadata.width-width)/2 );
        offset_y = metadata.height - height;        

        clip_image(src, dest, ext, width, height, offset_x, offset_y, eventLogger);

    });
};


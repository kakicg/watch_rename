const sharp = require('sharp');
const fs = require("fs");
const path = require("path");
const sys = require("./systemController");

require('dotenv').config({ path: './env' });
const env = process.env;

const image_width = Number(env.IMAGE_WIDTH);
const image_quality = Number(env.IMAGE_QUALITY);
const cutoff = Number(env.IMAGE_CUTOFF);

//トリミング処理
const clip_image = (src, dest, ext, width, height, offset_x, offset_y, eventLogger) => {
    let today = new Date();
    const original_width = width + offset_x * 2;
    const original_height = height + offset_y;
    const cutoff_width = original_height;
    const cutoff_height = original_height;
    const cutoff_offset_x = (original_width - original_height)/2;

    console.log(`cutoff_width:${cutoff_width}, cutoff_height:${cutoff_height}, cutoff_offset_x:${cutoff_offset_x}`)
    console.log(`width:${width}, height:${height}`)
        
    sharp(src)
    .extract({ width: width, height: height, left: offset_x, top: offset_y }).resize(image_width)
    .normalise().jpeg({quality:image_quality}).toFile(`${dest}.${ext}`)
    .then(function(new_file_info) {
        eventLogger.info(`リネーム（${src}　> ${dest}.${ext}`);
        
        let stat = fs.statSync(`${dest}.${ext}`);
        console.log(`ファイルサイズ: ${Math.round(stat.size/1024)}K\n`);
        sys.remove_file(src);
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
        height = Math.round(metadata.height*clip_ratio);
        if (env.IMAGE_IS_SQUARE) {
            width = height;
        } else {
            width = Math.round(metadata.width*clip_ratio);
        }

        offset_x = Math.round( (metadata.width-width)/2 );
        offset_y = metadata.height - height;        
        eventLogger.info(`width:${width}, height:${height}, offset_x:${offset_x}, offset_y:${offset_y}`);

        clip_image(src, dest, ext, width, height, offset_x, offset_y, eventLogger);

    });
};

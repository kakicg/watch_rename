const sharp = require('sharp');
const fs = require("fs");
const path = require("path");
const sys = require("./systemController");

require('dotenv').config({ path: '../watch_rename_env' });
const env = process.env;
const sample_dir ='../watch_rename_samples';

sys.check_dir(sample_dir);
sys.check_dir(`${sample_dir}/original`);
sys.check_dir(`${sample_dir}/resized`);

const image_width = env.IMAGE_WIDTH * 1;
const image_quality = env.IMAGE_QUALITY * 1;
let samples_num = fs.readdirSync(`${sample_dir}/original`).length;
const sample_start = new Date(env.SAMPLE_START);
const sample_end = new Date(env.SAMPLE_END);//サンプル採取の期間

//トリミング処理
const clip_image = (src, dest, ext, width, height, offset_x, offset_y, eventLogger) => {
    let today = new Date();
    console.log(`start:${sample_start}, end:${sample_end}, num: ${samples_num}`)
    if ( today > sample_start && today < sample_end && samples_num < 10001 ) {
        const sample_name = dest.split("/")[3];
        sharp(src).extract({ width: width, height: height, left: offset_x, top: offset_y })
        .resize(400)
        .grayscale()
        .jpeg({quality:60})
        .toFile(`${sample_dir}/resized/${sample_name}.jpg`)
        .catch(function(err) {
            console.log(err);
        });
        sharp(src)
        .resize(400)
        .grayscale()
        .jpeg({quality:60})
        .toFile(`${sample_dir}/original/${sample_name}.jpg`)
        .catch(function(err) {
            console.log(err);
        });
        console.log(`samples = ${samples_num}`);
        samples_num = samples_num + 1;
    }
    sharp(src).extract({ width: width, height: height, left: offset_x, top: offset_y }).resize(image_width).normalise().jpeg({quality:image_quality}).toFile(`${dest}.${ext}`)
    .then(function(new_file_info) {
        eventLogger.info(`リネーム（${src}　> ${dest}.${ext}`);
        // fs.unlinkSync(src, (err) => {
        //     if (err) {
        //         eventLogger.error(err);
        //         //throw err;
        //     }
        // });
        let stat = fs.statSync(`${dest}.${ext}`);
        console.log(`ファイルサイズ: ${Math.round(stat.size/1024)}K\n`);
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
        eventLogger.info(`width:${width}, height:${height}, offset_x:${offset_x}, offset_y:${offset_y}`);

        clip_image(src, dest, ext, width, height, offset_x, offset_y, eventLogger);

    });
};
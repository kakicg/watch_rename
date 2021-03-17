const sharp = require('sharp');
const fs = require("fs");
const path = require("path");
require('dotenv').config({ path: '../watch_rename_sample_env' });
const env = process.env;
const sample_dir ='../watch_rename_samples';

const check_dir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
                eventLogger.error(err);
                throw err;
            }
        });
        console.log(`created ${dir}.`)
    }
}
check_dir(sample_dir);
check_dir(`${sample_dir}/original`);
check_dir(`${sample_dir}/resized`);

let samples_num = fs.readdirSync(`${sample_dir}/original`).length;
const sample_start = new Date(env.SAMPLE_START);
const sample_end = new Date(env.SAMPLE_END);//サンプル採取フォルダーのパス

if ( sample_start && sample_end) {
    console.log(`sample duration: ${sample_start} - ${sample_end}`)
}
//トリミング処理
const clip_image = (src, dest, ext, width, height, offset_x, offset_y, eventLogger) => {
    eventLogger.info(`width:${width}, height:${height}, offset_x:${offset_x}, offset_y:${offset_y}`);
    let today = new Date();
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
const sharp = require('sharp');
const fs = require("fs");
const path = require("path");
const sys = require("./systemController");

const image_width = 1200;
const image_quality = 80;
const cutoff = 1.0;

//カットオフ処理
const cutoff_image = (src, dest, ext, width, height, offset_x, offset_y, eventLogger) => {
    sharp(src).extract({ width: width, height: height, left: offset_x, top: offset_y })
    .resize(image_width, image_width/4*3,{fit: 'contain', background: { r: 255, g: 255, b: 255 }})
    .jpeg({quality:100}).toFile(`${dest}.${ext}`)
    .then(function(new_file_info) {
        eventLogger.info(`カットオフ（${src}　> ${dest}.${ext}`);
        sys.remove_file(src);
    })
    .catch(function(err) {
        console.log(err);
    });
}

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

//コンポジット(Difference)
exports.difference_images = (src, bg, dest, eventLogger) => {
    console.log(`src:${src}¥n`)
    console.log(`bg:${bg}¥n`)
    console.log(`dest:${dest}¥n`)
    
    sharp(src)
    // .resize(400, 300, {fit: 'fill'})
    .composite([
        { input: bg, blend: 'difference' },
        // { input: bg },
      ])
    .greyscale()
    .jpeg({quality:image_quality})
    .raw()
    .toBuffer()
    .then((data) => {
        console.log(`Buffer size: ${data.length}`)
     })
    
    // .toFile(`${dest}`)
    // .then(function(new_file_info) {
    //     eventLogger.info(`コンポジット(difference）${src}　> ${dest}`);
    //     console.log(`コンポジット(difference）${src}　> ${dest}`)
        
    //     let stat = fs.statSync(`${dest}`);
    //     // sys.remove_file(src);
    // })
    .catch(function(err) {
        console.log(err);
    });

    
}

//画像トリミング&リネーム
exports.clip_rename = (src, dest, ext, clip_ratio, eventLogger) => {
    let width, height, offset_x, offset_y;
    sharp(src).composit()
    .then(function(metadata) {
        // width = Math.round(metadata.width*clip_ratio);
        height = Math.round(metadata.height*clip_ratio);
        width = height;

        offset_x = Math.round( (metadata.width-width)/2 );
        offset_y = metadata.height - height;        
        eventLogger.info(`width:${width}, height:${height}, offset_x:${offset_x}, offset_y:${offset_y}`);

        clip_image(src, dest, ext, width, height, offset_x, offset_y, eventLogger);

    });
};

//画像CUTOFF処理
exports.cutoff_move = (src, dest, ext, eventLogger) => {
    let width, height, offset_x, offset_y;
    sharp(src).metadata()
    .then(function(metadata) {
        width = Math.round(metadata.height*cutoff);
        height = Math.round(metadata.height);

        offset_x = Math.round( (metadata.width-width)/2 );
        offset_y = 0;        

        cutoff_image(src, dest, ext, width, height, offset_x, offset_y, eventLogger);
    });
}
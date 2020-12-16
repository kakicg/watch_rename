const sharp = require('sharp');
const fs = require("fs");
const path = require("path");


//トリミング処理
const clip_image = (src, dest, ext, width, height, offset_x, offset_y, clip_size, eventLogger) => {
    sharp(src).extract({ width: width, height: height, left: offset_x, top: offset_y }).resize(800).jpeg({quality:60}).toFile(`${dest}-${clip_size}.${ext}`)
    .then(function(new_file_info) {
        console.log(`リネーム（${clip_size}）: ${src}　> ${dest}-${clip_size}.${ext}`);
        eventLogger.info(`リネーム（${clip_size}）: ${src}　> ${dest}-${clip_size}.${ext}`);
        // fs.unlinkSync(src, (err) => {
        //     if (err) throw err;
        // });

    })
    .catch(function(err) {
        console.log(err);
    });
}

//画像トリミング&リネーム
exports.clip_rename = (src, dest, ext, clip_size, eventLogger) => {
    let width, height, offset_x, offset_y;
    sharp(src).metadata()
    .then(function(metadata) {
        switch(clip_size) {
            case "C":
                //S
                width = Math.round(metadata.width*0.7);
                height = Math.round(metadata.height*0.7);
              break;
            case "B":
                //M
                width = Math.round(metadata.width*0.85);
                height = Math.round(metadata.height*0.85);
              break;
            default:
                //L
                width = metadata.width;
                height = metadata.height;
          }
          offset_x = Math.round( (metadata.width-width)/2 );
          offset_y = metadata.height - height;        

    
        clip_image(src, dest, ext, width, height, offset_x, offset_y, clip_size, eventLogger);

    });
};


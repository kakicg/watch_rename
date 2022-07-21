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
    console.log(`src:${src}\n`)
    console.log(`bg:${bg}\n`)
    console.log(`dest:${dest}\n`)

    const image = sharp(src)
 
    image
    .composite([
        { input: bg, blend: 'difference' },
    ])
    .greyscale()
    .normalise()
    // .jpeg({quality:image_quality})
    .raw()
    .toBuffer( (err, buffer, info)=> {
        if (err) { image.log.error('optimize error', err); }
        // const {bb_x, bb_y, bb_width, bb_height } = bbox( buffer, info.width, info.height)
        const bb_info = bbox( buffer, info.width, info.height)
        console.log(bb_info.bb_x, bb_info.bb_y, bb_info.bb_width, bb_info.bb_height )
        sharp(src).extract({ width: bb_info.bb_width, height: bb_info.bb_height, left: bb_info.bb_x, top: bb_info.bb_y })
        .toFile(dest);
        return bb_info
    })
    // .then((bb_info) => {
    //     console.log(bb_info.bb_x, bb_info.bb_y, bb_info.bb_width, bb_info.bb_height)
    // })
}
const bbox = (buffer, width, height)=> {
    const x_sample = 200
    const y_sample = 200
    const threadhold = 10
    const x_increment = width/x_sample
    const y_increment = height/y_sample
    console.log(`Buffer size: ${buffer.length}`)
    console.log(`Info: ${width}, ${height}`)
    let x = x_increment
    let y = y_increment
    let i = Math.round( x )
    let j = Math.round( y )
    let count = 0
    let bb_x_index_max = 0
    let bb_x_index_min = width
    let bb_y_index_max = 0
    let bb_y_index_min = height
    while ( j  < height) {
        while ( i < width ) {
            if ( buffer[ Math.round( y )*width + Math.round( x ) ] > 30 ) {
                if (bb_x_index_max < i) { bb_x_index_max = i }
                if (bb_x_index_min > i) { bb_x_index_min = i }
                if (bb_y_index_max < j) { bb_y_index_max = j }
                if (bb_y_index_min > j) { bb_y_index_min = j }
                count++
            }

            x = x + x_increment
            i = Math.round( x )

        }
        x = x_increment
        i = Math.round( x )
        y = y + y_increment
        j = Math.round( y )
    }
    console.log(count)
    console.log(bb_x_index_min, bb_y_index_min, bb_x_index_max - bb_x_index_min, bb_y_index_max - bb_y_index_min)

    return {
        bb_x : bb_x_index_min, 
        bb_y : bb_y_index_min, 
        bb_width : bb_x_index_max - bb_x_index_min, 
        bb_height: bb_y_index_max - bb_y_index_min
    }
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
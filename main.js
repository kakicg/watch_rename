// 第一引数 許容タイムラグ（単位：ミリ秒)
// 第二引数 リネームしたファイルのフォルダーのパス
// 第三引数 最初にファイルが書き込まれるフォルダーのパス

//require
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});
require('date-utils');
require('dotenv').config();
const env = process.env;
const log4js = require('log4js');
const { time } = require("console");
log4js.configure({
    appenders : {
        event : {type : 'file', filename : 'event.log'}
    },
    categories : {
        default : {appenders : ['event'], level : 'info'}
    }
});
const eventLogger = log4js.getLogger('event');
const sharp = require('sharp');

//監視するフォルダーの相対パス
const watch_dir = process.argv[4] || env.WATCH_DIR || "./watch";
console.log(`写真転送フォルダー: ${watch_dir}`);
eventLogger.info(`写真転送フォルダー: ${watch_dir}`);
//リネームファイルが入るフォルダーの相対パス
const rename_dir = process.argv[3] || env.RENAMED_DIR || "./renamed";
console.log(`リネームフォルダー: ${rename_dir}`);
eventLogger.info(`リネームフォルダー: ${rename_dir}`);

const lane_dir = ["01","02","03","04","05","06","07","08","09","10","11","12"];
lane_dir.forEach( num => {
    if (!fs.existsSync(rename_dir+"/"+num)) {
        fs.mkdir(rename_dir+"/"+num, { recursive: true }, (err) => {
            if (err) throw err;
        });
    }
});
if (!fs.existsSync(rename_dir+"/others")) {
    fs.mkdir(rename_dir+"/others", { recursive: true }, (err) => {
        if (err) throw err;
    });
}
const timelag = process.argv[2] || env.TIMELAG || 60*1000; //単位「ミリ秒」

console.log(`許容タイムラグ: ${timelag}ミリ秒`);
eventLogger.info(`許容タイムラグ: ${timelag}ミリ秒`);


let photo = {name:'', date: new Date(0)};
let barcode = {name:'', date: new Date(0), lane: ''};

//chokidarの初期化
const watcher = chokidar.watch(watch_dir+"/",{
    ignored:/[\/\\]\./,
    persistent:true
});

//リネームコピー
const rename_copy = (src, dest) => {
    fs.copyFile( src, dest, (err) => {
        if (err) {
            if (err.errno == -5) {
                console.log(`ファイル名が異常です。`);
                eventLogger.error(`ファイル名異常: ${src} , ${dest}`);
            } else {
                throw err;
            }
        } else {
          console.log(`リネーム: ${src}　> ${dest}`);
          eventLogger.info(`リネーム: ${src}　> ${dest}`);
            if(!env.LEAVE_ORIGINAL_FILE) {
                fs.unlink(path.join( src ), (err) => {
                    if (err) throw err;
                });
            }
        }
    });
};
//画像トリミング&リネーム
const clip_rename = (src, dest, ext) => {
    let middle_width, middle_height, m_offset_x, m_offset_y;
    let low_width, low_height, l_offset_x, l_offset_y;

    sharp(src).metadata()
    .then(function(metadata) {
        middle_width = Math.round(metadata.width*0.85);
        middle_height = Math.round(metadata.height*0.85);
        m_offset_x = Math.round( (metadata.width-middle_width)/2 );
        m_offset_y = metadata.height - middle_height;
        low_width = Math.round(metadata.width*0.7);
        low_height = Math.round(metadata.height*0.7);
        l_offset_x = Math.round( (metadata.width-low_width)/2 );
        l_offset_y = metadata.height - low_height;

    sharp(src).png().extract({ width: middle_width, height: middle_height, left: m_offset_x, top: m_offset_y }).resize(800).jpeg().toFile(dest+"-B."+ext)
    .then(function(new_file_info) {
        console.log(`リネーム（中）: ${src}　> ${dest+"-B."+ext}`);
        eventLogger.info(`リネーム（中）: ${src}　> ${dest+"-B."+ext}`);
          if(!env.LEAVE_ORIGINAL_FILE) {
              fs.unlink(src, (err) => {
                  if (err) throw err;
              });
          }
    })
    .catch(function(err) {
        console.log("An error occured");
    });

    sharp(src).png().extract({ width: low_width, height: low_height, left: l_offset_x, top: l_offset_y }).resize(800).jpeg().toFile(dest+"-C."+ext)
    .then(function(new_file_info) {
        console.log(`リネーム（小）: ${src}　> ${dest+"-C."+ext}`);
        eventLogger.info(`リネーム（小）: ${src}　> ${dest+"-C."+ext}`);
          if(!env.LEAVE_ORIGINAL_FILE) {
              fs.unlink(src, (err) => {
                  if (err) throw err;
              });
          }
    })
    .catch(function(err) {
        console.log("An error occured");
    });

    })
    //A （大）
    sharp(src).resize(800).toFile(dest+"-A."+ext)
    .then(function(new_file_info) {
        console.log(`リネーム（大）: ${src}　> ${dest+"-A."+ext}`);
        eventLogger.info(`リネーム（大）: ${src}　> ${dest+"-A."+ext}`);
          if(!env.LEAVE_ORIGINAL_FILE) {
              fs.unlink(src, (err) => {
                  if (err) throw err;
              });
          }
    })
    .catch(function(err) {
        console.log("An error occured");
    });
    //B （中）
    
};



const evaluate_and_or_copy = () => {
    console.log(`phototime: ${photo.date}, barcodetime: ${barcode.date}`);
    if ( Math.abs(photo.date - barcode.date) < timelag && photo.name.length > 0 && barcode.name.length > 0) {
        let src = watch_dir + "/" + photo.name;
        let exts = photo.name.split(".");
        let ext ="";
        //if (photo.name.split(".")[1]) barcode.name = barcode.name + "." + exts[exts.length-1];
        if(exts.length>1) ext=exts[exts.length-1];
        let sub_dir = '';
        lane_dir.forEach( str => {
            if(barcode.lane===str) sub_dir = str;
        });
        if(sub_dir.length<1) sub_dir = "others";
        let dest = rename_dir + "/" + sub_dir + "/" + barcode.name;
        //rename_copy(src, dest);
        clip_rename(src, dest, ext);
        photo.name = '';
        barcode.name = ''; 
        barcode.lane = ''; 
    }
};

//監視イベント
watcher.on('ready',function(){

    //準備完了
    console.log("フォルダー監視プログラム稼働中。");

    //ファイル受け取り
    watcher.on( 'add', function(file_name) {
        photo.date = new Date();
        photo.name = path.basename(file_name);
        console.log( `ファイル: ${photo.name}` );
        eventLogger.info(`ファイル: ${photo.name}`);
        evaluate_and_or_copy();
    });

    //バーコード入力
    readline.on('line', function(line){
        console.log(`バーコード: ${line}`);
        eventLogger.info(`バーコード: ${line}`);
        if (line.length > 0) {
            barcode.date = new Date();
            barcode.name = barcode.date.toFormat("YYYYMMDD") + "-" + line.slice(0,5);
            barcode.lane = line.slice(0,2);
        }
        evaluate_and_or_copy();
    });
    
}); //watcher.on('ready',function(){
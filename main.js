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

//監視するフォルダーの相対パス
const watch_dir =env.WATCH_DIR || "./watch";
//リネームファイルが入るフォルダーの相対パス
const rename_dir =env.RENAMED_DIR || "./renamed";
const timelag = env.TIMELAG * 1000 || 10000;


let photo = {name:'', date: new Date(0)};
let barcode = {name:'', date: new Date(0)};

//chokidarの初期化
const watcher = chokidar.watch(watch_dir+"/",{
    ignored:/[\/\\]\./,
    persistent:true
});

//リネームコピー
const rename_copy = (src, dest) => {
    fs.copyFile( src, dest, (err) => {
        if (err) {
          throw err;
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
const evaluate_and_or_copy = () => {
    console.log(`phototime: ${photo.date}, barcodetime: ${barcode.date}`);
    if ( Math.abs(photo.date - barcode.date) < timelag && photo.name.length > 0 && barcode.name.length > 0) {
        let src = watch_dir + "/" + photo.name;
        if (photo.name.split(".")[1]) barcode.name = barcode.name + "." + photo.name.split(".")[1];
        let dest = rename_dir + "/" + barcode.name;
        rename_copy(src, dest);
        photo.name = '';
        barcode.name = ''; 
    }
};

//監視イベント
watcher.on('ready',function(){

    //準備完了
    console.log("ready watching...");

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
        }
        evaluate_and_or_copy();
    });
    
}); //watcher.on('ready',function(){
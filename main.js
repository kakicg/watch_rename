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
const log4js = require('log4js')
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
const watch_dir = "./watch";
//リネームファイルが入るフォルダーの相対パス
const rename_dir = "./renamed";

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

        //   fs.unlink(path.join( src ), (err) => {
        //     if (err) throw err;
        //   });
        }
    });
};
const evaluate_and_or_copy = () => {
    console.log(`phototime: ${photo.date}, barcodetime: ${barcode.date}`);
    if ( Math.abs(photo.date - barcode.date) < 10000 && photo.name.length > 0 && barcode.name.length > 0) {
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

    //画像ファイル受け取り
    watcher.on( 'add', function(file_name) {
        photo.date = new Date();
        photo.name = path.basename(file_name);
        console.log( `画像ファイル: ${photo.name}` );
        eventLogger.info(`画像ファイル: ${photo.name}`);
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
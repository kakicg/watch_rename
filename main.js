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
log4js.configure("log-config.json");
const eventLogger = log4js.getLogger('event');
const image_clipper = require('./imageClipper');

const check_dir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
                eventLogger.error(err);
                throw err;
            }
        });
    }
}

//監視するフォルダーの相対パス
const watch_dir = process.argv[4] || env.WATCH_DIR || "./watch";
check_dir(watch_dir);
eventLogger.info(`写真転送フォルダー: ${watch_dir}`);

//リネームファイルが入るフォルダーの相対パス
const rename_dir = process.argv[3] || env.RENAMED_DIR || "./renamed";
check_dir(rename_dir);

eventLogger.info(`リネームフォルダー: ${rename_dir}`);

const lane_dir = ["01","02","03","04","05","06","07","08","09","10","11","12"];
lane_dir.forEach( num => {
    check_dir(rename_dir+"/"+num);
});
check_dir(rename_dir+"/others");

const timelag = process.argv[2] || env.TIMELAG || 60*1000; //単位「ミリ秒」
eventLogger.info(`許容タイムラグ: ${timelag}ミリ秒`);


let photo = {name:'', date: new Date(0)};
let barcode = {name:'', date: new Date(0), lane: ''};

//chokidarの初期化
const watcher = chokidar.watch(watch_dir+"/",{
    ignored:/[\/\\]\./,
    persistent:true
});



const evaluate_and_or_copy = () => {
    eventLogger.info(`phototime: ${photo.date}, barcodetime: ${barcode.date}`);
    if ( Math.abs(photo.date - barcode.date) < timelag && photo.name.length > 0 && barcode.name.length > 0) {
        let src = watch_dir + "/" + photo.name;
        let exts = photo.name.split(".");
        let ext ="";
        if(exts.length>1) ext=exts[exts.length-1];
        let sub_dir = '';
        lane_dir.forEach( str => {
            if(barcode.lane===str) sub_dir = str;
        });
        if(sub_dir.length<1) sub_dir = "others";
        let dest = rename_dir + "/" + sub_dir + "/" + barcode.name;
        //rename_copy(src, dest);
        image_clipper.clip_rename(src, dest, ext, "A", eventLogger);
        image_clipper.clip_rename(src, dest, ext, "B", eventLogger);
        image_clipper.clip_rename(src, dest, ext, "C", eventLogger);

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
        eventLogger.info(`ファイル: ${photo.name}`);
        evaluate_and_or_copy();
    });

    //バーコード入力
    readline.on('line', function(line){
        eventLogger.info(`バーコード: ${line}`);
        if (line.length > 0) {
            barcode.date = new Date();
            barcode.name = barcode.date.toFormat("YYYYMMDD") + "-" + line.slice(0,5);
            barcode.lane = line.slice(0,2);
        }
        evaluate_and_or_copy();
    });
    
}); //watcher.on('ready',function(){
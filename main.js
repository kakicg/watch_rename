// 第一引数 許容タイムラグ（単位：ミリ秒)
// 第二引数 リネームしたファイルのフォルダーのパス
// 第三引数 最初にファイルが書き込まれるフォルダーのパス

//require
const fs = require("fs");
const path = require("path");
const sys = require("./systemController");
const chokidar = require("chokidar");
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});
require('date-utils');
require('dotenv').config({ path: '../watch_rename_env' });
const env = process.env;
const log4js = require('log4js');
const { time } = require("console");
log4js.configure("log-config.json");
const eventLogger = log4js.getLogger('event');

//監視するフォルダーの相対パス
const watch_dir = process.argv[4] || env.WATCH_DIR || "./watch";
sys.check_dir(watch_dir);
eventLogger.info(`写真転送フォルダー: ${watch_dir}`);

//リネームファイルが入るフォルダーの相対パス
const rename_dir = process.argv[3] || env.RENAMED_DIR || "./renamed";
sys.check_dir(rename_dir);

eventLogger.info(`リネームフォルダー: ${rename_dir}`);

const image_clipper = require('./imageClipper');

const timelag = process.argv[2] || env.TIMELAG || 60*1000; //単位「ミリ秒」
eventLogger.info(`許容タイムラグ: ${timelag}ミリ秒`);

let photo = {name:'', date: new Date(0), size:''};
let barcode = {name:'', date: new Date(0), number: '', lane: ''};
const photo_sizes = [env.XL||'A', env.L||'B', env.M||'C', env.S||'D', env.XS||'E'];
const clip_ratios = [env.XL_R, env.L_R, env.M_R, env.S_R, env.XS_R];
eventLogger.info(`クリップサイズ等級: ${photo_sizes}`);
eventLogger.info(`クリップ率: ${clip_ratios}`);

//chokidarの初期化
const watcher = chokidar.watch(watch_dir+"/",{
    ignored:/[\/\\]\./,
    persistent:true
});

const evaluate_and_or_copy = () => {
    eventLogger.info(`timelag: ${Math.abs(photo.date - barcode.date)}, photo: ${photo.name.length}|${photo.date}, barcode: ${barcode.name.length}|${barcode.date}`);
    
    if ( Math.abs(photo.date - barcode.date) < timelag && photo.name.length > 0 && barcode.name.length > 0) {
        let src = watch_dir + "/" + photo.name;
        let exts = photo.name.split(".");
        let ext ="";

        if(exts.length>1) ext=exts[exts.length-1];
        subdir = barcode.date.toFormat("YYYYMMDD") + "/" + barcode.lane;
        let dest = rename_dir
        dest = dest + "/" + barcode.date.toFormat("YYYYMMDD");
        sys.check_dir(dest);
        dest = dest + "/" + barcode.lane;
        sys.check_dir(dest);
        dest = dest + "/" + barcode.name;

        let p = photo_sizes.indexOf(photo.size);
        if ( p < 0 ) { p = 0 }
 
        eventLogger.info(`**** ファイル名:${barcode.name}, クリップサイズ: ${photo.size}, クリップ率:${clip_ratios[p]}`);
        image_clipper.clip_rename(src, dest, ext, clip_ratios[p], eventLogger);

        photo.name = '';
        photo.size = '';
        barcode.name = ''; 
        barcode.lane = '';
        barcode.number='';
    } else {
        let p = photo_sizes.indexOf(photo.size);
        if (p>=0 && barcode.number < 1.0 && barcode.number > 0.0) {
            console.log(`${photo_sizes[p]}: ${clip_ratios[p]} --> ${barcode.number*1}`);
            clip_ratios[p]=barcode.number*1;
        }
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
        eventLogger.info(`元ファイル: ${photo.name}`);
        //evaluate_and_or_copy();
    });

    //バーコード入力
    readline.on('line', function(line){
        eventLogger.info(`バーコード: ${line}`);
        if (line.length > 0) {
            barcode.date = new Date();
            photo.size = line.slice(0,1);
            barcode.number = line.slice(2,7);
            barcode.name = barcode.date.toFormat("YYYYMMDD") + barcode.number;
            barcode.lane = barcode.number.slice(0,2);
            evaluate_and_or_copy();
        }
    });
    
}); //watcher.on('ready',function(){
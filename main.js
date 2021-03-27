// 第一引数 "test"の場合テストモード
// 第二引数 テストモードの場合の許容タイムラグ（単位：ミリ秒)

require('dotenv').config({ path: '../watch_rename_env' });
const env = process.env;
//テストモード
const test_mode = (process.argv[2] === "test");
console.log(test_mode);
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
//ログ記録
const log4js = require('log4js');
const { time } = require("console");
log4js.configure("log-config.json");
const eventLogger = log4js.getLogger('event');
const warnLogger = log4js.getLogger('warn');

//監視するフォルダーの相対パス
let watch_dir = env.WATCH_DIR;
if (!fs.existsSync(watch_dir) ) {
    eventLogger.error(`写真供給側のネットワーク(${watch_dir})に接続されていません。`);
    watch_dir = "../watch";
    sys.check_dir(watch_dir);
}
eventLogger.info(`写真供給フォルダー: ${watch_dir}`);

//リネームファイルが入るフォルダーの相対パス
let rename_dir = env.RENAMED_DIR;
if (!fs.existsSync(rename_dir) || test_mode) {
    if(!fs.existsSync(rename_dir)) {
        eventLogger.error(`画像書込み側のネットワーク(${rename_dir})に接続されていません。`);
    }
    rename_dir = "../renamed";
    sys.check_dir(rename_dir);
}
eventLogger.info(`画像書込みフォルダー: ${rename_dir}`);
let day_text = sys.read_day_text(`${rename_dir}/day.txt`);
day_text = day_text.slice(0,8);
console.log(`day.txt[${day_text}]`);

const image_clipper = require('./imageClipper');

let timelag = process.argv[3] || env.TIMELAG; //単位「ミリ秒」

eventLogger.info(`許容タイムラグ: ${timelag}ミリ秒`);

let photo = {name:'', date: new Date(0), size:''};
let barcode = {name:'', date: new Date(0), number: '', lane: '',size:''};
const photo_sizes = [env.XL||'A', env.L||'B', env.M||'C', env.S||'D', env.XS||'E'];
const clip_ratios = [env.XL_R, env.L_R, env.M_R, env.S_R, env.XS_R];
eventLogger.info(`クリップサイズ等級: ${photo_sizes}`);
eventLogger.info(`クリップ率: ${clip_ratios}`);

//写真供給フォルダーのクリア
sys.clear_folder(watch_dir);

//chokidarの初期化
const watcher = chokidar.watch(watch_dir+"/",{
    ignored:/[\/\\]\./,
    persistent:true
});
const photo_reset = () => {
    photo.name = '';
    photo.date = new Date(0);
};
const barcode_reset = () => {
    barcode.name = ''; 
    barcode.lane = '';
    barcode.number='';
    barcode.size='';
    barcode.date = new Date(0);
};
let uncompleted_images = [];
let uncompleted_barcodes = [];

const evaluate_and_or_copy = () => {
    eventLogger.info(`timelag: ${Math.abs(photo.date - barcode.date)}, photo: ${photo.date}, barcode: ${barcode.date}`);
    let pdate_bdate = photo.date - barcode.date;
    if ( photo.name.length > 0 && barcode.name.length > 0) {
        if (Math.abs(pdate_bdate) < timelag) {
            let src = watch_dir + "/" + photo.name;
            let exts = photo.name.split(".");
            let ext ="";
    
            if(exts.length>1) ext=exts[exts.length-1];
            subdir = day_text + "/" + barcode.lane;
            let dest = rename_dir
            dest = dest + "/" + day_text;
            sys.check_dir(dest);
            dest = dest + "/" + barcode.lane;
            sys.check_dir(dest);
            dest = dest + "/" + barcode.name;
    
            let p = photo_sizes.indexOf(barcode.size);
            if ( p < 0 ) { p = 0 }
     
            eventLogger.info(`**** ファイル名:${barcode.name}, クリップサイズ: ${barcode.size}, クリップ率:${clip_ratios[p]}`);
            image_clipper.clip_rename(src, dest, ext, clip_ratios[p], eventLogger);
    
            photo_reset();
            barcode_reset();
        } else {
            if (pdate_bdate <0) {
              eventLogger.warn(`フォトデータ[ ${photo.name}(${photo.date}) ] に対応するバーコード情報が得られませんでした。\n
              余分な写真データが作られたか、バーコードリーダーが作動しなかった可能性があります。`);
              photo_reset();
              sys.clear_folder(watch_dir);
            } else {
              eventLogger.warn(`バーコードデータ[ ${barcode.number}(${barcode.date}) ] に対応する写真データが得られませんでした。\n
              写真シャッターセンサーが作動しなかった可能性があります。`);
              barcode_reset();
            }
        }
        
    } else {
        //let p = photo_sizes.indexOf(barcode.size);
        // if (p>=0 && barcode.number < 1.0 && barcode.number > 0.0) {
        //     console.log(`${photo_sizes[p]}: ${clip_ratios[p]} --> ${barcode.number*1}`);
        //     clip_ratios[p]=barcode.number*1;
        // }
    }
};

//監視イベント
watcher.on('ready',function(){

    //準備完了
    console.log("フォルダー監視プログラム稼働中。");
    if (test_mode) {
        eventLogger.trace("[ テストモード ]");

    }

    // //ファイル受け取り
    //    watcher.on( 'add', function(file_name) {
    //     photo.date = new Date();
    //     photo.name = path.basename(file_name);
    //     eventLogger.info(`元ファイル: ${photo.name}`);
    //     //evaluate_and_or_copy();
    // });
    //ファイル受け取り
    watcher.on( 'add', function(file_name) {

        let exts = path.basename(file_name).split(".");
        if(exts.length>1) {
            ext=exts[exts.length-1];
            if (ext.toUpperCase() ==="JPG" || ext.toUpperCase() === "JPEG") {
                if (photo.name.length>0) {
                    eventLogger.warn(`フォトデータ[ ${photo.name}(${photo.date}) ]\nに対応するバーコード情報が得られませんでした。\n余分な写真データが作られたか、バーコードリーダーが作動しなかった可能性があります。`);
                    sys.remove_file(watch_dir + "/" + photo.name);
                    uncompleted_images.push(photo);
                }
                photo.date = new Date();
                photo.name = path.basename(file_name);

                eventLogger.info(`元ファイル: ${photo.name}|${photo.date}`);    
            } else {
                photo.name = "";
            }
        }
        evaluate_and_or_copy();
   });

    //バーコード入力
    readline.on('line', function(line){
        eventLogger.info(`バーコード: ${line}`);
        if (line.length > 0) {
            barcode.date = new Date();
            // let second_ltr = line.slice(1,2);
            // if (second_ltr === "a") {
            //     barcode.size = line.slice(0,1);
            //     barcode.number = line.slice(2,7);
            // } else {
            //     barcode.size = second_ltr;
            //     barcode.number = line.slice(3,8);
            // }
            // barcode.name = day_text + barcode.number;
            // barcode.lane = barcode.number.slice(0,2);
            let barcode_items = line.split("a");
            console.log(barcode_items)
            if (barcode_items[0].length>0) {
                barcode.size=barcode_items[0]; // barcode_items = [P L M H X]
                barcode.size=barcode.size[barcode.size.length - 1];
            } else {
                barcode.size = 'X';
                eventLogger.error('高さセンサー情報がありません');
                console.log("対応する写真はトリミングされません");
            }
            barcode.number = barcode_items[1].slice(0,5);
            barcode.lane = barcode.number.slice(0,2);
            barcode.name = day_text + barcode.number;
            eventLogger.info(`サイズ：${barcode.size} バーコード: ${barcode.number}`);
            evaluate_and_or_copy();
        }
    });
    
}); //watcher.on('ready',function(){
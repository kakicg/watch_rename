// main.js
const config = require('./config');

//テストモード
const test_mode = (process.argv[2] === "test");

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

const beep = ( interval )=> {
    setTimeout( ()=> {
        config.isMac && require("child_process").exec("afplay /System/Library/Sounds/Blow.aiff");
        config.isWindows && require("child_process").exec("powershell.exe [console]::beep(1000,600)");    
    }, interval*500);
}
async function send_warning( subject, message, count ) {
    let i=count;
    while(i>0){
        beep(i--);
    }
    console.log(`${subject}: ${message}`);
}

//監視するフォルダーの相対パス
if (!fs.existsSync(config.watchDir) ) {
    eventLogger.error(`写真供給側のネットワーク(${config.watchDir})に接続されていません。`);
    config.watchDir = "../watch";
    sys.check_dir(config.watchDir);
}
//Temp画像フォルダー
const tmp_image_dir = "../tmp_image"
sys.check_dir(tmp_image_dir);

eventLogger.info(`写真供給フォルダー: ${config.watchDir}`);

if (!fs.existsSync(config.renamedDir) || test_mode) {
    if(!fs.existsSync(config.renamedDir)) {
        eventLogger.error(`画像書込み側のネットワーク(${config.renamedDir})に接続されていません。`);
    }
    config.renamedDir = "../renamed";
    //config.renamedDir がなければ作成
    sys.check_dir(config.renamedDir);
}
eventLogger.info(`画像書込みフォルダー: ${config.renamedDir}`);
let day_text = "20310101";
if (fs.existsSync(`${config.renamedDir}/day.txt`)) {
    day_text = sys.read_day_text(`${config.renamedDir}/day.txt`)
    day_text = day_text.slice(0,8);
}

console.log(`day.txt[${day_text}]`);

const Storage = require('node-storage');
const store = new Storage('photo_count.txt');
let reckoned_ate = store.get('reckoned_ate'); //カウンターの起算日
const resetPhotoCounter = ()=> {
    reckoned_ate = new Date();
    store.put('reckoned_ate', reckoned_ate.toFormat('YYYY/MM/DD'));
    store.put('photo_count', 0)
}
reckoned_ate || resetPhotoCounter()

const display_photo_count = () => {
    console.log(`写真撮影枚数　: ${store.get('photo_count')} (${store.get('reckoned_ate')} 以来)`);
}
display_photo_count()
const image_clipper = require('./imageClipper');
const { getSystemErrorMap } = require('util');

eventLogger.info(`許容タイムラグ: ${config.timelag}ミリ秒`);

const Photo = require('./Photo');
const Barcode = require('./Barcode');

let photo = new Photo();
let barcode = new Barcode();

const photo_reset = () => photo.reset();
const barcode_reset = () => barcode.reset();


//写真供給フォルダーのクリア
sys.clear_folder(config.watchDir);

//chokidarの初期化
const watcher = chokidar.watch(config.watchDir+"/",{
    ignored:/[\/\\]\./,
    persistent:true
});

let uncompleted_images = [];
let uncompleted_barcodes = [];
let timer;

const set_barcode_items = (barcode_items) => {
    barcode.date = new Date();
    console.log(barcode_items)
    if (barcode_items[0].length>0) {
        barcode.size=barcode_items[0]; // barcode_items = [P L M H X]
        barcode.size=barcode.size[barcode.size.length - 1];
    } else {
        barcode.size = 'X';
        eventLogger.error('高さセンサー情報がありません\n対応する写真はトリミングされません');
    }
    barcode.number = barcode_items[1].slice(0,5);
    console.log(`バーコードNO: ${barcode.number}`);
    barcode.lane = barcode.number.slice(0,2);
    barcode.name = day_text + barcode.number;
    eventLogger.info(`サイズ：${barcode.size}\n バーコード____: ${barcode.number}\n${barcode.date}`);
}

const copy_file = (src, d_dir) => {
    console.log(`${src} -> ${d_dir}`)

    if ( fs.existsSync(src) ) {
        const current_file_name = path.basename(src);

        fs.copyFile(src, `${d_dir}`, (err) => {
            if (err) throw err;
            console.log('ファイルをコピーしました');
        });
    }
}

const evaluate_and_or_copy = () => {

    let pdate_bdate = photo.date - barcode.date;
    if ( photo.name.length > 0 && barcode.name.length > 0) {
        eventLogger.info(`config.timelag: ${Math.abs(photo.date - barcode.date)}, photo: ${photo.date}, barcode: ${barcode.date}`);
        if ( Math.abs(pdate_bdate) < config.timelag || test_mode ) {
            let src = config.watchDir + "/" + photo.name;
            let exts = photo.name.split(".");
            let ext ="";
    
            if(exts.length>1) ext=exts[exts.length-1];
            subdir = day_text + "/" + barcode.lane;
            let dest = config.renamedDir
            dest = dest + "/" + day_text;
            sys.check_dir(dest);
            dest = dest + "/" + barcode.lane;
            sys.check_dir(dest);
            dest = dest + "/" + barcode.name;
    
            let p = config.photoSizes.indexOf(barcode.size);
            if ( p < 0 ) { p = 0 }
     
            image_clipper.clip_rename(src, dest, ext, config.clipRatios[p], eventLogger)
            eventLogger.info(`**** ファイル名:${barcode.name}, クリップサイズ: ${barcode.size}, クリップ率:${config.clipRatios[p]}`);

            photo.reset();
            barcode.reset();
        } else {
            if (pdate_bdate <0) {
                if (photo.name.length>0) {
                    eventLogger.warn(`フォトデータ[ ${photo.name}(${photo.date}) ] に対応するバーコード情報が得られませんでした。\n余分な写真データが作られたか、バーコードリーダーが作動しなかった可能性があります。`);
                        uncompleted_images.push({pname:photo.name, pdate:photo.date})
                }

                photo.reset();
                sys.clear_folder(config.watchDir);
            } else {
                if (barcode.number.length>0) {
                    const message = `バーコードデータ[ ${barcode.number}(${barcode.date}) ] に対応する写真データが得られませんでした。\n写真シャッターが作動しなかった可能性があります。`
                    send_warning("写真データなし", message, 1 )
                    eventLogger.warn(message);
                        uncompleted_barcodes.push({bnumber:barcode.number, bdate:barcode.date})
                }
                barcode.reset();
            }
        }
    }
};

//監視イベント
watcher.on('ready',function(){

    //準備完了
    console.log("フォルダー監視プログラム稼働中。");

    //ファイル受け取り
    watcher.on( 'add', function(file_name) {
        const new_name = path.basename(file_name);
        let exts = new_name.split(".");
        eventLogger.info(`追加されたファイル: ${new_name}`);            
        if(exts.length>1) {
            ext=exts[exts.length-1];
            if (ext.toUpperCase() ==="JPG" || ext.toUpperCase() === "JPEG") {
                store.put('photo_count', store.get('photo_count') + 1 );
                if (photo.name.length>0) {
                    if( photo.name < new_name ) {
                        const message = `フォトデータ[ ${photo.name}(${photo.date}) ]\nに対応するバーコード情報が得られませんでした。\n余分な写真データが作られたか、バーコードリーダーが作動しなかった可能性があります。`
                        eventLogger.warn(message);
                        send_warning("バーコード情報がありません", message, 1)

                        sys.remove_file(config.watchDir + "/" + photo.name);
                        uncompleted_images.push({pname:photo.name, pdate:photo.date});
                        photo.date = new Date();
                        photo.name = new_name;
                        eventLogger.info(`フォトデータ: ${photo.name} ${photo.date}`);            
                    } else {
                        sys.remove_file( config.watchDir + "/" + new_name );
                        send_warning("バーコード情報がありません", message, 1)
                    }
                } else {
                    photo.date = new Date();
                    photo.name = new_name;
                    eventLogger.info(`フォトデータ: ${photo.name} ${photo.date}`);            
                }
            } 
        }
        evaluate_and_or_copy();
   });

    //バーコード入力
    readline.on('line', function(line){
        let barcode_items = line.split("a");
        if (barcode_items.length > 1) {
            eventLogger.info(`バーコード: ${line}`);
            if (barcode.name.length>0) {
                const message = `バーコード[ ${barcode.name}(${barcode.date}) ]\nに対応するフォトデータが得られませんでした。(シャッターが作動しなかった可能性があります。)`
                eventLogger.warn(message);
                send_warning("写真データがありません", message, 1)

                if (barcode.name.length>0) {
                    uncompleted_barcodes.push({bnumber:barcode.number,bdate:barcode.date});
                }
            }
            set_barcode_items(barcode_items)
            
            evaluate_and_or_copy();
        } else {
            const cmd = barcode_items[0].toUpperCase();
            if ( cmd === "" ) {
                console.log("コマンドリスト\n");
                console.log("    L: 未処理リスト\n");
                console.log("    Q: 終了\n");
                console.log("    C: 終了をキャンセル\n");
                console.log("    P: 写真撮影累計\n");
                console.log("    PR: 写真撮影累計リセット\n");

            } else if ( cmd === "Q" || cmd == "E" ) {
                if (photo.name.length>0) {
                    uncompleted_images.push({pname:photo.name, pdate:photo.date})
                }
                if (barcode.name.length>0) {
                    uncompleted_barcodes.push({bnumber:barcode.number, bdate:barcode.date})
                }

                console.log("処理されなかったフォトデータ")
                eventLogger.info(uncompleted_images)
                console.log("処理されなかったバーコードデータ")
                eventLogger.info(uncompleted_barcodes)
                test_mode || console.log("5秒後に終了します");
                timer = setTimeout( () => {
                    process.exit();
                }, test_mode ? 0 : 5000 );

            } else if ( cmd === "C") {
                if (timer) {
                    new Promise(()=> {
                        console.log("終了をキャンセルします");
                        clearTimeout(timer); 
                        timer = null;
                    })
                }
            } else if ( cmd === 'P') {
                display_photo_count();
            } else if ( cmd ==='PR') {
                resetPhotoCounter();
                display_photo_count();
            } else if ( cmd === "L") {
                if (photo.name.length>0) {
                    uncompleted_images.push({pname:photo.name, pdate:photo.date})
                    photo.reset();
                    sys.clear_folder(config.watchDir);
                }
                if (barcode.name.length>0) {
                    uncompleted_barcodes.push({bnumber:barcode.number, bdate:barcode.date})
                    barcode.reset()
                }
                console.log("処理されなかった写真\n")
                console.log(uncompleted_images)
                console.log("\n上記の写真に対応するバーコードが認識されませんでした。\n\n")
                console.log("処理されなかったバーコードデータ\n")
                console.log(uncompleted_barcodes)
                console.log("\n上記のバーコードデータに対応する写真が認識されませんでした。\n")
            }
        }
    });
    
});


// テストモードの場合、バーコードと画像を送信
// if (process.argv.includes("test")) {
if (test_mode) {
        console.log("DEBUG: テストモードでバーコードと画像を送信");

    const fs = require("fs");
    const path = require("path");

    config.watchDir = "../watch";
    const test_images_dir = "../test_images";

    let firstRun = true;  // 最初の画像の処理を特別扱いする

    // バーコードデータの生成関数
    const generate_barcode_data = () => {
        const sizes = ["P", "PL", "PM", "PH", "PX"];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        const lane = "99";
        const product = String(Math.floor(Math.random() * 900) + 100); // 100〜999のランダムな3桁
        return `${size}a${lane}${product}`;
    };

    // 画像をwatchフォルダーにコピーする関数
    const copy_images_to_watch = async () => {
        const files = fs.readdirSync(test_images_dir);
        let count = 0;

        for (const file of files) {
            if (!file.match(/\.(jpg|jpeg)$/i)) continue; // 画像ファイルのみ処理

            setTimeout(() => {
                const barcode = generate_barcode_data();
                console.log(`DEBUG: バーコード送信 - ${barcode}`);

                // `readline.on("line")` の登録を待つため、最初のバーコード送信を遅らせる
                setTimeout(() => {
                    console.log(`DEBUG: 実際にバーコードを送信 - ${barcode}`);
                    readline.emit("line", barcode);
                }, firstRun ? 3000 : 500); // 初回は 3 秒遅らせる

                // 最初のバーコード送信を遅らせるために、画像のコピーも遅らせる
                setTimeout(() => {
                    const src = path.join(test_images_dir, file);
                    const dest = path.join(config.watchDir, file);

                    fs.copyFile(src, dest, (err) => {
                        if (err) {
                            console.error(`ファイルコピーエラー: ${err}`);
                        } else {
                            console.log(`DEBUG: 画像追加 - ${file}`);
                        }
                    });
                }, firstRun ? 3500 : 500); // 初回は 3.5 秒遅らせる

                firstRun = false; // 以降は通常通り処理
            }, count * 5000); // 5秒間隔で次の画像をコピー
            count++;
        }
    };

    // テスト開始
    copy_images_to_watch();
}
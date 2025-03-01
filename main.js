// main.js
const config = require('./config');
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

if (!fs.existsSync(config.renamedDir) || config.testMode) {
    if(!fs.existsSync(config.renamedDir)) {
        eventLogger.error(`画像書込み側のネットワーク(${config.renamedDir})に接続されていません。`);
    }
    config.renamedDir = "../renamed";
    //config.renamedDir がなければ作成
    sys.check_dir(config.renamedDir);
}
eventLogger.info(`画像書込みフォルダー: ${config.renamedDir}`);
if (fs.existsSync(`${config.renamedDir}/day.txt`)) {
    config.dayText = sys.read_day_text(`${config.renamedDir}/day.txt`)
    config.dayText = config.dayText.slice(0,8);
}

console.log(`day.txt[${config.dayText}]`);

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
    barcode.name = config.dayText + barcode.number;
    eventLogger.info(`サイズ：${barcode.size}\n バーコード: ${barcode.number}\n${barcode.date}`);
}

const evaluate_and_or_copy = require('./evaluate');
// const create_dest = require('./evaluate');
const generateDummyImage = require('./generate_dummy_image');

function create_nobarcode_image() {
    const hours = String(photo.date.getHours()).padStart(2, "0");
    const minutes = String(photo.date.getMinutes()).padStart(2, "0");
    const seconds = String(photo.date.getSeconds()).padStart(2, "0");
    const timestamp = `${hours}-${minutes}-${seconds}`;

    let fake_barcode = new Barcode();
    fake_barcode.date = photo.date;
    fake_barcode.name = timestamp;
    fake_barcode.number = 'XXXXX';
    fake_barcode.lane = 'nobarcode';
    fake_barcode.size = 'X';
    console.log(`fake_barcode: ${fake_barcode.name}`);
    evaluate_and_or_copy(photo, fake_barcode, config);
    console.log(`evaluate_and_or_copy`);
}
// 画像追加時の処理を有名関数として定義
function handleNewFile(file_name) {
    const new_name = path.basename(file_name);
    let exts = new_name.split(".");
    eventLogger.info(`追加されたファイル: ${new_name}`);            
    
    if (exts.length > 1) {
        let ext = exts[exts.length - 1].toUpperCase();
        if (ext === "JPG" || ext === "JPEG") {
            store.put('photo_count', store.get('photo_count') + 1);
            
            if (photo.name.length > 0) {
                const message = `フォトデータ [${photo.name} (${photo.date})] に対応するバーコード情報が得られませんでした。\nバーコードリーダーが作動しなかった可能性があります。`;
                eventLogger.warn(message);
                send_warning("バーコード情報がありません", message, 1);
                uncompleted_images.push({ pname: photo.name, pdate: photo.date });
                create_nobarcode_image();
            }
            photo.date = new Date();
            photo.name = new_name;
            eventLogger.info(`フォトデータ: ${photo.name} ${photo.date}`);            
        }
    }
    evaluate_and_or_copy(photo, barcode, config);
}

// バーコード入力時の処理を有名関数として定義
function handleBarcodeInput(line) {
    let barcode_items = line.split("a");
    if (barcode_items.length > 1) {
        eventLogger.info(`バーコード: ${line}`);
        if (barcode.name.length > 0) {
            const message = `バーコード[ ${barcode.name}(${barcode.date}) ]\nに対応するフォトデータが得られませんでした。(シャッターが作動しなかった可能性があります。)`;
            eventLogger.warn(message);
            send_warning("写真データがありません", message, 1);

            if (barcode.name.length > 0) {
                uncompleted_barcodes.push({ bnumber: barcode.number, bdate: barcode.date });
                let dest = config.renamedDir;
                dest = dest + "/" + config.dayText;
                sys.check_dir(dest);
                dest = dest + "/" + barcode.lane;
                sys.check_dir(dest);
                dest = dest + "/" + barcode.name;
                console.log(`dest(main): ${dest}`);
                generateDummyImage(barcode.number, dest, "jpg", eventLogger);
            }
        }
        set_barcode_items(barcode_items);
        evaluate_and_or_copy(photo, barcode, config);
    } else {
        const cmd = barcode_items[0].toUpperCase();
        if (cmd === "") {
            console.log("コマンドリスト\n");
            console.log("    L: 未処理リスト\n");
            console.log("    Q: 終了\n");
            console.log("    C: 終了をキャンセル\n");
            console.log("    P: 写真撮影累計\n");
            console.log("    PR: 写真撮影累計リセット\n");
        } else if (cmd === "Q" || cmd == "E") {
            if (photo.name.length > 0) {
                uncompleted_images.push({ pname: photo.name, pdate: photo.date });
            }
            if (barcode.name.length > 0) {
                uncompleted_barcodes.push({ bnumber: barcode.number, bdate: barcode.date });
            }

            console.log("処理されなかったフォトデータ");
            eventLogger.info(uncompleted_images);
            console.log("処理されなかったバーコードデータ");
            eventLogger.info(uncompleted_barcodes);
            process.exit();
        } else if (cmd === "C") {
            if (timer) {
                new Promise(() => {
                    console.log("終了をキャンセルします");
                    clearTimeout(timer);
                    timer = null;
                });
            }
        } else if (cmd === "P") {
            display_photo_count();
        } else if (cmd === "PR") {
            resetPhotoCounter();
            display_photo_count();
        } else if (cmd === "L") {
            if (photo.name.length > 0) {
                uncompleted_images.push({ pname: photo.name, pdate: photo.date });
                photo.reset();
                sys.clear_folder(config.watchDir);
            }
            if (barcode.name.length > 0) {
                uncompleted_barcodes.push({ bnumber: barcode.number, bdate: barcode.date });
                barcode.reset();
            }
            console.log("処理されなかった写真\n");
            console.log(uncompleted_images);
            console.log("\n上記の写真に対応するバーコードが認識されませんでした。\n\n");
            console.log("処理されなかったバーコードデータ\n");
            console.log(uncompleted_barcodes);
            console.log("\n上記のバーコードデータに対応する写真が認識されませんでした。\n");
        }
    }
}
//監視イベント
watcher.on('ready',function(){

    //準備完了
    console.log("フォルダー監視プログラム稼働中。");

    //ファイル受け取り
    watcher.on( 'add', handleNewFile );
    
    //バーコード入力
    readline.on('line', handleBarcodeInput);
});


// テストモードの場合、バーコードと画像を送信
// if (process.argv.includes("test")) {
if (config.testMode) {
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
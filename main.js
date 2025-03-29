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
    evaluate_and_or_copy(photo, fake_barcode, config);
}

const generate_barcode_data = () => {
    if (config.camTestMode >= 1 && config.camTestMode <= 5) {
        const sizeSymbol = config.photoSizes[5 - config.camTestMode]; // モードと逆順に注意
        const lane = "XX";
        const product = String(Math.floor(Math.random() * 900) + 100);
        return `${sizeSymbol}a${sizeSymbol}${sizeSymbol}${product}`;
    } else {
        // 通常モード（デバッグ用ランダム生成）
        const sizes = ["P", "PL", "PM", "PH", "PX"];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        const lane = "99";
        const product = String(Math.floor(Math.random() * 900) + 100);
        return `${size}a${lane}${product}`;
    }
};

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

            // 📸 camTestMode が有効なとき：ダミーバーコードを自動投入
            if (config.camTestMode > 0) {
                const dummy_barcode = generate_barcode_data();
                eventLogger.info(`camTestMode(${config.camTestMode})用ダミーバーコード生成: ${dummy_barcode}`);
                handleBarcodeInput(dummy_barcode);
            }

            evaluate_and_or_copy(photo, barcode, config);
        }
    }
}

const { updateClipRatio, displayRatios, resetRatios } = require('./ratioManager');

// バーコード入力時の処理を有名関数として定義
function handleBarcodeInput(line) {
    const raw = line.trim();

    // 🔽 コマンド判定を先に
    if (/^set /i.test(raw) || /^show$/i.test(raw) || /^reset$/i.test(raw) ) {
        const parts = raw.split(" ");

        if (parts[0].toLowerCase() === "set") {
            if (parts.length === 3 && parts[1].toLowerCase() === "sq") {
                const mode = parts[2]?.toLowerCase();
                const configPath = path.join(__dirname, 'config.json');
            
                if (mode === 'on' || mode === 'off') {
                    const newAspectRatio = mode === 'on' ? 1.0 : 1.5;
            
                    // config.json 読み込み
                    let json = {};
                    if (fs.existsSync(configPath)) {
                        json = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    }
            
                    json.aspectRatio = newAspectRatio;
                    fs.writeFileSync(configPath, JSON.stringify(json, null, 2));
                    config.aspectRatio = newAspectRatio;
            
                    console.log(`✅ aspectRatio を ${newAspectRatio} に設定しました（${mode.toUpperCase()} モード）`);
                    eventLogger.info(`aspectRatio updated to ${newAspectRatio} via set sq ${mode}`);
                } else {
                    console.log("⚠ 無効なモードです。使用例: set sq on / set sq off");
                }
                return;
            } else if (parts.length === 3) {
                const key = parts[1].toUpperCase();
                const val = parts[2];

                if (key === "CAM") {
                    const camVal = parseInt(val);
                    if (camVal >= 0 && camVal <= 5) {
                        config.camTestMode = camVal;
                        const sizeLabels = ["OFF", "XS", "S", "M", "L", "XL"];
                        console.log(`✅ camTestMode を ${camVal} に設定しました（${sizeLabels[camVal]} サイズモード）`);
                        eventLogger.info(`camTestMode updated to ${camVal} (${sizeLabels[camVal]})`);
                    } else {
                        console.log("⚠ camTestMode は 0〜5 の整数で指定してください");
                    }
                } else {
                    const validKeys = ["XL", "L", "M", "S", "XS"];
                    if (validKeys.includes(key) && !isNaN(parseFloat(val))) {
                        updateClipRatio(key, parseFloat(val));
                    } else {
                        console.log("⚠ 無効なキーまたは値です。使用可能キー: XL, L, M, S, XS");
                    }
                }
            }  else {
                console.log("⚠ SET コマンド形式: set [KEY] [VALUE]  例: set cam 2, set XS 0.4");
            }
            return;
        } else if (raw.toLowerCase() === "show") {
            displayRatios();
            // アスペクト比の状態も表示
            const modeText = config.aspectRatio == 1.0
            ? "（アスペクト比 1:1）"
            : config.aspectRatio == 1.5
                ? "（アスペクト比 3:2）"
                : `（アスペクト比 ${config.aspectRatio}）`;

            console.log(`📐 現在のアスペクト比: ${config.aspectRatio} ${modeText}`);
            return;
        } else if (raw.toLowerCase() === "reset") {
            resetRatios();
            return;
        }
    }

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
            console.log("    L     : 未処理リスト表示");
            console.log("    Q / E : 終了");
            console.log("    P     : 写真撮影累計表示");
            console.log("    PR    : 写真撮影累計リセット");
            console.log("    SHOW  : clipRatios（切り抜き比率）やアスペクト比を表示");
            console.log("    SET   : clipRatios、camTestMode、アスペクト比を設定");
            console.log("             例: set XS 0.4, set cam 3, set sq on（1:1）, set sq off（3:2）");
            console.log("    RESET : clipRatios を初期値に戻す");
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
//監視イベント
watcher.on('ready', function() {
    console.log("フォルダー監視プログラム稼働中。");

    // ファイル追加時
    watcher.on('add', handleNewFile);

    // バーコード入力時
    readline.on('line', handleBarcodeInput);

    // ✅ テストモード実行はここに移す
    if (config.testMode) {
        console.log("DEBUG: テストモード開始");
    
        const test_images_dir = "../test_images";
        config.watchDir = "../watch"; // 念のため
    
        const sizeToCamMode = {
            'X': 5,
            'H': 4,
            'M': 3,
            'L': 2,
            'P': 1
        };
    
        const files = fs.readdirSync(test_images_dir).filter(file => file.match(/\.(jpg|jpeg)$/i));
        let count = 1;
    
        for (const file of files) {
            const sizeChar = path.basename(file)[0].toUpperCase(); // 'M.jpg' → 'M'
            const camMode = sizeToCamMode[sizeChar] || 0;
    
            // 拡張子を保ってファイル名を通し番号付きに変更
            const ext = path.extname(file);
            const newName = `${sizeChar}${String(count).padStart(3, "0")}${ext}`;
    
            setTimeout(() => {
                // camTestMode を変更
                config.camTestMode = camMode;
                console.log(`camTestMode を ${camMode} (${sizeChar}) に設定`);
    
                const src = path.join(test_images_dir, file);
                const dest = path.join(config.watchDir, newName);
    
                fs.copyFile(src, dest, (err) => {
                    if (err) {
                        console.error(`コピー失敗: ${err}`);
                    } else {
                        console.log(`画像コピー完了: ${newName}`);
                    }
                });
            }, count * 3000); // 3秒ごとに実行
    
            count++;
        }
    }
});

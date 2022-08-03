// 第一引数 "test"の場合テストモード
// 第一引数 "resize"の場合auto＿resizeのテストモード
// 第二引数 テストモードの場合の許容タイムラグ（単位：ミリ秒)

require('dotenv').config({ path: '../watch_rename_env' });
const env = process.env;
//テストモード
const test_mode = (process.argv[2] === "test");
const resize_test_mode = (process.argv[2] === "resize");
const auto_clip_mode = env.AUTO_CLIP
auto_clip_mode && console.log('Auto clip mode\n')

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

async function send_warning( subject, message, count ) {
    let i=count;
    while(i>0){
        sys.beep(i--);
    }
    console.log(`${subject}: ${message}`);
}
send_warning("start", "起動中",1)

//監視するフォルダーの相対パス
let watch_dir = env.WATCH_DIR || 'P:/';
if (!fs.existsSync(watch_dir) ) {
    eventLogger.error(`写真供給側のネットワーク(${watch_dir})に接続されていません。`);
    watch_dir = "../watch";
    sys.check_dir(watch_dir);
}
eventLogger.info(`写真供給フォルダー: ${watch_dir}`);

//Temp画像フォルダー
const tmp_image_dir = "../tmp_image"
sys.check_dir(tmp_image_dir);

//背景画像
const bg_image_dir = "../bg_image"
sys.check_dir(bg_image_dir);
const bg_img = `${bg_image_dir}/bg.jpg`;
const clip_threashold = env.CLIP_THREASHOULD



//リネームファイルが入るフォルダーの相対パス
let rename_dir = env.RENAMED_DIR || '//192.168.128.11/g_drive';
if (!fs.existsSync(rename_dir) || test_mode) {
    if(!fs.existsSync(rename_dir)) {
        eventLogger.error(`画像書込み側のネットワーク(${rename_dir})に接続されていません。`);
    }
    rename_dir = "../renamed";
    sys.check_dir(rename_dir);
}
eventLogger.info(`画像書込みフォルダー: ${rename_dir}`);
let day_text = "20310101";
if (fs.existsSync(`${rename_dir}/day.txt`)) {
    day_text = sys.read_day_text(`${rename_dir}/day.txt`)
    day_text = day_text.slice(0,8);
}
console.log(`day.txt[${day_text}]`);

const image_clipper = require('./imageClipper');

//写真とバーコードの許容時間差
let timelag = process.argv[3] || env.TIMELAG || 10000; //単位「ミリ秒」
timelag = 10000; //10秒

eventLogger.info(`許容タイムラグ: ${timelag}ミリ秒`);

//直近の写真/バーコード
let photo = {name:'', date: new Date(0), size:''};
let barcode = {name:'', date: new Date(0), number: '', lane: '',size:''};

//クリップ画像サイズの設定
const photo_sizes = [env.XL||'X', env.L||'H', env.M||'M', env.S||'L', env.XS||'P'];
const clip_ratios = [env.XL_R || 0.7, env.L_R || 0.6, env.M_R || 0.45, env.S_R || 0.33, env.XS_R || 0.28];
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
    barcode.lane = barcode.number.slice(0,2);
    barcode.name = day_text + barcode.number;
    eventLogger.info(`サイズ：${barcode.size}\n バーコード: ${barcode.number}\n${barcode.date}`);
}

const evaluate_and_or_copy = () => {

    let pdate_bdate = photo.date - barcode.date;
    if ( photo.name.length > 0 && barcode.name.length > 0) {
        eventLogger.info(`timelag: ${Math.abs(photo.date - barcode.date)}, photo: ${photo.date}, barcode: ${barcode.date}`);
        if ( Math.abs(pdate_bdate) < timelag || test_mode ) {
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
            env.AUTO_CLIP && image_clipper.difference_clip(src, bg_img, dest, ext, clip_threashold, eventLogger)
            env.AUTO_CLIP || image_clipper.clip_rename(src, dest, ext, clip_ratios[p], eventLogger)

            photo_reset();
            barcode_reset();
        } else {
            if (pdate_bdate <0) {
                if (photo.name.length>0) {
                    eventLogger.warn(`フォトデータ[ ${photo.name}(${photo.date}) ] に対応するバーコード情報が得られませんでした。\n余分な写真データが作られたか、バーコードリーダーが作動しなかった可能性があります。`);
                        uncompleted_images.push({pname:photo.name, pdate:photo.date})
                }

                photo_reset();
                sys.clear_folder(watch_dir);
            } else {
                if (barcode.number.length>0) {
                    const message = `バーコードデータ[ ${barcode.number}(${barcode.date}) ] に対応する写真データが得られませんでした。\n写真シャッターが作動しなかった可能性があります。`
                    send_warning("写真データなし", message, 15 )
                    eventLogger.warn(message);
                        uncompleted_barcodes.push({bnumber:barcode.number, bdate:barcode.date})
                }
                barcode_reset();
            }
        }
    }
};

//監視イベント
watcher.on('ready',function(){

    //背景写真を撮る

    //準備完了
    console.log("フォルダー監視プログラム稼働中。");
    test_mode && eventLogger.trace("[ テストモード ]");
    test_mode && test_rename_files('../test_images', '../watch')
    resize_test_mode && test_resize_files('../test_images', '../watch')
    let bg_image_mode = true
    if ( test_mode || resize_test_mode )  bg_image_mode = false

    console.log(`背景画像を撮影してください`)
    //ファイル受け取り
    watcher.on( 'add', function(file_name) {
        const new_name = path.basename(file_name);
        let exts = new_name.split(".");
        eventLogger.info(`追加されたファイル: ${file_name}`);            
        if(exts.length>1) {
            ext=exts[exts.length-1];
            if (ext.toUpperCase() ==="JPG" || ext.toUpperCase() === "JPEG") {
                if ( bg_image_mode ) {
                    console.log("背景撮影モード")
                    fs.rename( file_name, bg_img, (err) => {
                        if (err) throw err;
                    
                        console.log('背景画像をセットしました');
                    });
                    return
                }        
                store.put('photo_count', store.get('photo_count') + 1 );
                if (photo.name.length>0) {
                    if( test_mode || photo.name < new_name ) {
                        const message = `フォトデータ[ ${photo.name}(${photo.date}) ]\nに対応するバーコード情報が得られませんでした。\n余分な写真データが作られたか、バーコードリーダーが作動しなかった可能性があります。`
                        eventLogger.warn(message);
                        send_warning("バーコード情報がありません", message, 3)

                        sys.remove_file(watch_dir + "/" + photo.name);
                        uncompleted_images.push({pname:photo.name, pdate:photo.date});
                        photo.date = new Date();
                        photo.name = new_name;
                        eventLogger.info(`フォトデータ: ${photo.name} ${photo.date}`);            
                    } else {
                        sys.remove_file( watch_dir + "/" + new_name );
                    }
                } else {
                    photo.date = new Date();
                    photo.name = new_name;
                    eventLogger.info(`フォトデータ: ${photo.name} ${photo.date}`);            
                }
            } 
        }
        if ( test_mode ) {
            set_barcode_items(["P", sys.setTestCode()])
        }
        evaluate_and_or_copy();
   });

//写真カウンター
const Storage = require('node-storage');
const store = new Storage('photo_count.txt');
let reckoned_date = store.get('reckoned_date'); //カウンターの起算日
const resetPhotoCounter = ()=> {
    reckoned_date = new Date();
    store.put('reckoned_date', reckoned_date.toFormat('YYYY/MM/DD'));
    store.put('photo_count', 0)
}
reckoned_date || resetPhotoCounter()

const display_photo_count = () => {
    console.log(`写真撮影枚数　: ${store.get('photo_count')} (${store.get('reckoned_date')} 以来)`);
}
  // TEXTインプット : バーコード入力 / コマンド入力
    readline.on('line', function(line){
        let barcode_items = line.split("a");
        if (barcode_items.length > 1) {
            eventLogger.info(`バーコード: ${line}`);
            if (barcode.name.length>0) {
                const message = `バーコード[ ${barcode.name}(${barcode.date}) ]\nに対応するフォトデータが得られませんでした。(シャッターが作動しなかった可能性があります。)`
                eventLogger.warn(message);
                send_warning("写真データがありません", message, 15)

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
                console.log("    S: 撮影開始\n");
                console.log("    L: 未処理リスト\n");
                console.log("    Q: 終了\n");
                console.log("    C: 終了をキャンセル\n");
                console.log("    P: 写真撮影累計\n");
                console.log("    PR: 写真撮影累計リセット\n");

            } else if ( cmd === "S" ) {
                console.log("商品撮影を開始します")
                bg_image_mode = false
            }  else if ( cmd === "Q" || cmd == "E" ) {
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
                test_mode || resize_test_mode || auto_clip_mode || console.log("5秒後に終了します");
                timer = setTimeout( () => {
                    process.exit();
                }, test_mode || resize_test_mode || auto_clip_mode ? 0 : 5000 );

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
                    photo_reset();
                    sys.clear_folder(watch_dir);
                }
                if (barcode.name.length>0) {
                    uncompleted_barcodes.push({bnumber:barcode.number, bdate:barcode.date})
                    barcode_reset()
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
    
}); //watcher.on('ready',function(){

//TEST
//renameテスト
const test_rename_files = (s_dir, d_dir) => {
    const files = fs.readdirSync(s_dir);
    let count = 0;
    console.log(files)
    files.forEach(file => {
        let file_strings = file.split('.');
        if (file_strings[0].length === 0) { return }

        const ext = file_strings[file_strings.length -1];
        console.log (file_strings)
        if (ext.toUpperCase() ==="JPG" || ext.toUpperCase() === "JPEG") {
            setTimeout( ()=>{
                const new_num =  Math.floor( Math.random() * (199 + 1 - 101) ) + 101 ;
                const barcode_items = [ 'P', sys.setTestCode()]
                set_barcode_items(barcode_items)
                eventLogger.info(`サイズ：${barcode.size}\n バーコード: ${barcode.number}\n${barcode.date}`);
                sys.copy_file( `${s_dir}/${file}`, `${d_dir}/${file}` )
            }, 2000*count );
            count++;
        }
    });
}

// //Auto Resize テスト
const test_resize_files = () => {
    // image_clipper.difference_images('../test_images/X.jpg', '../test_images/bg.jpg', '../resized/P.jpg', eventLogger)
    const s_dir = "../test_images"
    const d_dir = "../resized"
    const files = fs.readdirSync(s_dir);

    const threasholds = [ 20, 30, 40, 50, 60]
    
    files.forEach( sname => {
        sname = sname.split(".")[0]
        if (sname.length === 0) { return }
        console.log(sname)
        sys.check_dir(`${d_dir}/${sname}`);
        threasholds.forEach( threashold => {
            const s_file = `${s_dir}/${sname}.jpg`
            const bg_file =  `../bg_image/bg.jpg`
            const d_file = `${d_dir}/${sname}/${threashold}.jpg`
            console.log(`${s_file} / ${bg_file} / ${d_file}`)
            image_clipper.difference_images( s_file, bg_file, d_file, threashold, eventLogger)
        })
    })
    
    console.log('resizeテスト')
}

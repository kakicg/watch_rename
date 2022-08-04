const is_windows = process.platform==='win32'
const is_mac = process.platform==='darwin'
const is_linux = process.platform==='linux'
const fs = require("fs");
const path = require("path");
const log4js = require('log4js');
const { time } = require("console");
log4js.configure("log-config.json");
const eventLogger = log4js.getLogger('event');

exports.check_dir = (dir) => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdir(dir, { recursive: true }, (err) => {
                if (err) {
                    eventLogger.error(err);
                    //throw err;
                }
            });
            console.log(`created ${dir}.`)
        }
    } catch {
        eventLogger.error(`フォルダ[ ${dir} ] は作れませんでした。`)
    }
}
exports.read_day_text = (file) => {
    let data="";
    try {
        data = fs.readFileSync(file, 'utf-8');
    } catch {
        data = null;
    }
    return data;
}
exports.clear_folder = (dir) => {
    const files = fs.readdirSync(dir);
    console.log(files)

    files.forEach(file => {
        this.remove_file(dir + "/" + file);
    });
}
exports.remove_file = (file) => {
    if ( fs.existsSync(file) ) {
        fs.unlink( file, (err => {
            if (err) console.log(err);
            else {
              console.log(`${file}を削除しました。`);
            }
        }));
    }
}

exports.test_resize_files = (s_dir, d_dir) => {
    const files = fs.readdirSync(s_dir);
    let count = 0;
    console.log(files)

    files.forEach(file => {
        // fs.unlink( dir + "/" + file, (err => {
        //     if (err) console.log(err);
        //     else {
        //       console.log(`${dir}内の${file}を削除しました。`);
        //     }
        // }));
        setTimeout( ()=>{
            this.copy_file( `${s_dir}/${file}`, `${d_dir}/${file}` )
        }, 6000*count );
        count++;
    });
}

exports.copy_file = (src, d_dir) => {
    console.log(`copy: ${src} -> ${d_dir}`)

    if ( fs.existsSync(src) ) {
        const current_file_name = path.basename(src);

        fs.copyFile(src, `${d_dir}`, (err) => {
            if (err) throw err;
            console.log('ファイルをコピーしました');
        });
    }
}

exports.move_file = (src, dest) => {
    console.log(`move: ${src} -> ${dest}`)

    if ( fs.existsSync(src) ) {
        fs.rename(src, `${dest}`, (err) => {
            if (err) throw err;
            console.log('ファイルを移動しました');
        });
    }
}

exports.beep = ( interval )=> {
    setTimeout( ()=> {
        is_mac && require("child_process").exec("afplay /System/Library/Sounds/Blow.aiff");
        is_windows && require("child_process").exec("powershell.exe [console]::beep(1000,600)");    
    }, interval*500);
}

exports.setTestCode = (n=3) => {
    let i=0;
    let str = ""
    while ( i<n ) {
        str = `${str}${Math.floor( Math.random()*10 )}`
        i++;
    }
    return `99${str}`
}
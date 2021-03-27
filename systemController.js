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
exports.read_day_text = (dir) => {
    let data="";
    try {
        data = fs.readFileSync(dir, 'utf-8');
    } catch {
        data = null;
    }
    return data;
}
exports.clear_folder = (dir) => {
    const files = fs.readdirSync(dir);
    console.log(files)

    files.forEach(file => {
        fs.unlink( dir + "/" + file, (err => {
            if (err) console.log(err);
            else {
              console.log(`${file}を削除しました。`);
            }
        }));
    });
}
exports.remove_file = (file) => {
    fs.unlink( file, (err => {
        if (err) console.log(err);
        else {
          console.log(`${file}を削除しました。`);
        }
    }));
    // try {
    //     fs.unlinkSync(file, (err) => {
    //         if (err) {
    //             eventLogger.error(err);
    //             throw err;
    //         }
    //     });
    //     eventLogger.info(`${file}を削除しました。`)

    // } catch {
    //     eventLogger.error(`${file}は削除されませんでした。`)
    // }
}
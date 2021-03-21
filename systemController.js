const fs = require("fs");
const path = require("path");
const log4js = require('log4js');
const { time } = require("console");
log4js.configure("log-config.json");
const eventLogger = log4js.getLogger('event');

exports.check_dir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
                eventLogger.error(err);
                throw err;
            }
        });
        console.log(`created ${dir}.`)
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
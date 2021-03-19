const fs = require("fs");
const path = require("path");

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
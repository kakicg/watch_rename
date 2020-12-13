const fs = require('fs');
var sharp = require('sharp');
var smartcrop = require('smartcrop-sharp');
 
function applySmartCrop(src, dest, width, height) {
    smartcrop.crop(src, { width: width, height: height }).then(function(result) {
        var crop = result.topCrop;
        sharp(src)
          .extract({ width: crop.width, height: crop.height, left: crop.x, top: crop.y })
          .resize(width, height)
          .toFile(dest);
      });
}
 
fs.readdir('./images', (err, files) => {
    files.forEach(file => {
        let the_file = file.split(".");
        console.log(file);
        applySmartCrop(`./images/${file}`, `./croped/${the_file[0]}-croped.${the_file[1]}`, 400, 300);
    });
});
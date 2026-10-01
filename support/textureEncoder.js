var fs = require("fs"),
    PNG = require("pngjs").PNG;

fs.createReadStream("stone.png")
    .pipe(
        new PNG({
            filterType: 4,
        })
    )
    .on("parsed", function () {
        let data = new Float64Array(this.data);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.round(data[i] / 255 * 100) / 100;
        }
        fs.writeFileSync(
            "./texture.txt",
            `export const stone = new Float64Array([${data.toString()}]);`
        );

        this.pack().pipe(fs.createWriteStream("out.png"));
    });

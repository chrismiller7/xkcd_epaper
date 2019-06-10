const epd7x5 = require('epd7x5');
const gd = require('node-gd');
const request = require('request');
const fs = require('fs');

var white = epd7x5.white;
var black = epd7x5.black;
var yellow = epd7x5.red;
let font = '/usr/share/fonts/truetype/roboto/Roboto-Regular.ttf';
let fontSize = 20;

var count = 1;
var maxId = 2000;
var picFile = "/RW/xkcd_pic";

//init the module
epd7x5.init();

setTimeout(DisplayRandom, 1000 * 5);
setInterval(DisplayRandom, 1000 * 60 * 5);


function DisplayRandom() {
    if (count % 5 == 0) {
        DisplayComic(0);
    } else {

        var rangeFirst = 1;
        var rangeLast = maxId;
        var rnd = Math.floor(Math.random() * Math.floor(rangeLast - rangeFirst)) + rangeFirst;
        DisplayComic(rnd);
    }
    count++;
}


function DisplayComic(id) {
    var data = GetXkcdData(id, function(data) {
        if (data != null) {

            DownloadImage(data.img, picFile, function() {
                var img = null;
                if (data.img.endsWith("png")) img = gd.createFromPng(picFile);
                else if (data.img.endsWith("jpg")) img = gd.createFromJpeg(picFile);
                else console.log("image format not recognized!   " + data.img);
                console.log("Image = " + img);
                var p = id;
                if (id == 0) p = "Today";
                DrawScreen("(" + p + ") " + data.safe_title, img);
            });

        } else {
            DrawScreen("Not Connected!", gd.createFromJpeg("404.jpg"));
        }

    });
}


function DrawScreen(text, img) {
    var buff = epd7x5.getImageBuffer();
    buff.filledRectangle(0, 0, buff.width, buff.height, black);

    if (img != null) {
        ScaleImageToRegion(img, buff, 0, 30, buff.width, buff.height - 30);
        FixImage(buff);
    }

    if (text != null) {
        buff.filledRectangle(0, 0, buff.width, 30, yellow);
        buff.stringFT(white, font, fontSize, -0.0, 10, 30 - 5, text);
    }

    epd7x5.displayImageBuffer(buff);
}


function FixImage(img) {
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            let p = img.getPixel(x, y);
            if (p < 64) img.setPixel(x, y, black);
            else if (p > 255 - 64) img.setPixel(x, y, white);
            else img.setPixel(x, y, yellow);
        }
    }
}


function ScaleImageToRegion(img, buff, dx, dy, dw, dh) {
    var srcRatio = img.width / img.height;
    var dstRatio = dw / dh;
    var nw = img.width;
    var nh = img.height;
    if (img.width > dw || img.height > dh) //only shrink, never expand.
    {
        if (srcRatio > dstRatio) { // src is longer than dst
            nw = dw;
            nh = img.height * dw / img.width;
        } else {
            nh = dh;
            nw = img.width * dh / img.height;
        }
    }

    var nx = dx + dw / 2 - nw / 2;
    var ny = dy + dh / 2 - nh / 2;

    var sx = 0;
    var sy = 0;
    var sw = img.width;
    var sh = img.height;
    console.log(img);
    console.log(buff);
    img.copyResampled(buff, Math.trunc(nx), Math.trunc(ny), Math.trunc(sx), Math.trunc(sy), Math.trunc(nw), Math.trunc(nh), Math.trunc(sw), Math.trunc(sh));
}


function GetXkcdData(id, f) {
    var url = "https://xkcd.com/" + id + "/info.0.json";
    if (id == 0) {
        url = "https://xkcd.com/info.0.json";
    }
    request(url, function(err, resp, body) {
        console.log(body);
        try {
            f(JSON.parse(body));
        } catch (e) {
            f(null);
        }
    });
}


function DownloadImage(uri, filename, callback) {

    request.head(uri, function(err, res, body) {
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};
var gcloud   = require('gcloud');
var jimp     = require('jimp');

// This is a local copy

/**
 * Mapping function. Maps all decimals range
 * (.4 - 2.5) -> { 2:3, 3:4, 4:5, 1:1 and reciprocals}
 *  [[ 1:1, 2:3 (.667 , 1.5), 3:4 (.75, 1.33) and 4:5 (.8, 1.25) ]]
 * @param  {number} w         :width of the artwork
 * @param  {number} h         :height of the artwork
 * @param  {number} widthRatio: the ratio of whiteWidth to artWidth. Ie, if the
 * artwork has width 100, and the whiteboard has width 125, the widthRatio would
 * be 5/4.
 * @return { number[] } [whiteWidth,whiteHeight] the w,h of the whiteboard
 */
function getPaddingRatio(w,h, widthRatio) {
    var aspectRatio = w/h; // h*ratio = w
    var ratio;
    if (aspectRatio > 2.5) {
        console.log(">>Image exceeds max Aspect Ratio of 3:2");
        return([0,0]);
    } else if (aspectRatio <= 2.5 && aspectRatio >= 1.5) {
        ratio = 1.5;
    } else if (aspectRatio < 1.5 && aspectRatio >= 1.333) {
        ratio = 1.333;
    } else if (aspectRatio < 1.333 && aspectRatio >= 1.25) {
        ratio = 1.25;
    } else if (aspectRatio < 1.25 && aspectRatio >= 0.95) {
        ratio = 1;
    } else if (aspectRatio < 0.95 && aspectRatio >= 0.8) {
        ratio = 0.8;
    } else if (aspectRatio < 0.8 && aspectRatio >= 0.75) {
        ratio = 0.75
    } else if (aspectRatio < 0.75 && aspectRatio >= 0.6777) {
        ratio = 0.677;
    } else {
        console.log(">>Image doesnt meet min Aspect Ratio of 2 : 3");
        return([0,0]);
    }
    var whiteWidth  = Math.floor(w*widthRatio);
    var whiteHeight = Math.floor(whiteWidth/ratio);

    return([whiteWidth,whiteHeight]);
}

/**
 * Connect to Google Cloud via auth key
 */
function authenticateArtist() {
    //READMORE: http://googlecloudplatform.github.io/gcloud-node/#/docs/v0.37.0/storage/file?method=createWriteStream
    return gcloud.storage({
        keyFilename: './auth/artistKey.json',
        projectId  : 'artist-tekuma-4a697'
    });
}

/**
 * Connect to Google Cloud via auth key
 */
function authenticateCurator() {
    //READMORE: http://googlecloudplatform.github.io/gcloud-node/#/docs/v0.37.0/storage/file?method=createWriteStream
    return gcloud.storage({
        keyFilename: './auth/curatorKey.json',
        projectId  : 'artist-tekuma-4a697'
    });
    console.log("connected art storage");
}

/** Creates a printfile from an artwork */
function createPrintFile(uid, artworkUID, artistName) {
    var curatorStorage = authenticateCurator();
    var artStorage     = authenticateArtist();

    var pfBucket   = curatorStorage.bucket("printfiles");
    var artBucket  = artStorage.bucket("art-uploads");
    var artPath    = "portal/" + uid + "/uploads/" + artworkUID;
    var master     = artBucket.file(artPath);
    var white      = 0xFFFFFFFF; //R G B A in HEXDEC

    //NOTE arbitrary spacing variables
    var widthRatio = 4/3; //NOTE width of whiteboard to artwork
    var nameHeight = 50; //50px
    var logoSize   = 75; //75px (its a square)
    var maxLabelWidth  = 1800; // name shouldnt be wider than artwork
    var maxLabelHeight = 400;
    var minArtworkDim  = 1500; // no dimension of an artwork less than {}px

    master.download( function (err,artBuffer) {
        if (err) {
            console.log(err);
            // res.status(500).send({error:"Error connecting to Art Bucket file", e:err});
        }

        jimp.read(artBuffer).then(function (artwork) {
            // Set Artwork variables
            var artWidth    = artwork.bitmap.width;
            var artHeight   = artwork.bitmap.height;
            // Set Whiteboard Variables
            var dims        = getPaddingRatio(artWidth,artHeight,widthRatio);
            var whiteWidth  = dims[0];
            var whiteHeight = dims[1];
            var wPad = Math.floor((whiteWidth-artWidth)/2); //
            var hPad = Math.floor(((whiteHeight-artHeight)/2));

            if (artWidth >= minArtworkDim && artHeight >= minArtworkDim) {
                console.log(">Image Meets Min Resolution");
                var placeholder = new jimp(dims[0], dims[1], white, function (err, whiteboard) {
                    // console.log(">Whiteboard Drawn");
                jimp.loadFont('./font/tekuma128.fnt').then(function (font) {
                    // console.log(">Font Loaded");
                jimp.read('./img/logo.png').then(function(rawLogo) {
                    // console.log(">Logo Loaded");
                var placeholder2 = new jimp(maxLabelWidth,maxLabelHeight, function (err,fullLabel) {
                    if (err) {console.log(err);}
                    // Write the artist name, crop around it, then down scale it.
                    var name =   fullLabel.clone()
                                .print(font, 0,0, artistName)
                                .autocrop()
                                .resize(jimp.AUTO, nameHeight); // 50px height
                    var nameWidth = name.bitmap.width;

                    // Set Logo Params
                    var logo    = rawLogo.autocrop().resize(logoSize,logoSize);
                    var logoX   = nameWidth/2 - logoSize/2;
                    var logoY   = nameHeight  + logoSize/2;
                    // Create Label ( name and logo composition )
                    var cropHeight = nameHeight + logoSize*2;
                    var cropWidth  = nameWidth  + 5;
                    fullLabel.composite(name,0,0)
                             .composite(logo,logoX,logoY)
                             .crop(0,0, cropWidth, cropHeight);

                    var labelWidth  = fullLabel.bitmap.width;
                    var labelHeight = fullLabel.bitmap.height;
                    var labelX      = (whiteWidth/2) - (labelWidth/2);
                    var labelY      = (whiteHeight) - (hPad/2) - (labelHeight/2);

                    console.log(">Label Made");
                    whiteboard
                           .composite(artwork ,wPad, hPad)
                           .composite(fullLabel, labelX,labelY)
                           .rgba(false)
                           .getBuffer(jimp.MIME_PNG, function (err,printBuffer){
                               var savePath  = uid + '/' + artworkUID;
                               var printfile = pfBucket.file(savePath);
                               var options   = {
                                   metadata:{
                                       contentType: 'image/png'
                                   },
                                   predefinedAcl:"projectPrivate"
                               };
                               printfile.save(printBuffer,options, function (err) {
                                   if (!err) {
                                       console.log(">>>Printfile Generated Successfully");
                                    //    res.status(200).send(">Printfile Generated Successfully")
                                   } else {
                                       console.log(">>>Error:",err);
                                    //    res.status(500).send({error: ">Error uploading to Curator"});
                                   }
                               });
                           });
                });
                });
                });
                });
            } else {
                console.log(">Image Error. Min w or h is "+minArtworkDim+" px. Was:",artWidth,artHeight);
                // res.status(400).send({error: "Requested image does not meet 1800x1800px minimum."});
            }
        });
    });
}


let info = {uid:"JvrOHCvEKRaLiFHmjmq02rg0Ava2" , artworkuid:"-KOAlYQiVqtVX9Bgwrba" , artist:"Test Name"};

createPrintFile(info.uid, info.artworkuid, info.artist);

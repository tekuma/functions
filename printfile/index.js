const gcloud   = require('gcloud');
const jimp     = require('jimp');

// See README.md for deployment and testing

exports.printfile = function printfile(req,res) {
    // ============== Methods ================

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
    getPaddingRatio = (w,h, widthRatio) => {
        let aspectRatio = w/h; // h*ratio = w
        let ratio;
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
        let whiteWidth  = Math.floor(w*widthRatio);
        let whiteHeight = Math.floor(whiteWidth/ratio);

        return([whiteWidth,whiteHeight]);
    }

    /**
     * Connect to Google Cloud via auth key
     */
    authenticateArtist = () => {
        //READMORE: http://googlecloudplatform.github.io/gcloud-node/#/docs/v0.37.0/storage/file?method=createWriteStream
        let a_auth;
        try {
            a_auth = gcloud.storage({
                keyFilename: './auth/artistKey.json',
                projectId  : 'artist-tekuma-4a697'
            });
        } catch (e) {
            console.log(">Error with Artist Atuh:",e);
        }
        return a_auth;
    }

    /**
     * Connect to Google Cloud via auth key
     */
    authenticateCurator = () => {
        //READMORE: http://googlecloudplatform.github.io/gcloud-node/#/docs/v0.37.0/storage/file?method=createWriteStream
        let c_auth;
        try {
            c_auth = gcloud.storage({
                keyFilename: './auth/curatorKey.json',
                projectId  : 'curator-tekuma'
            });
        } catch (e) {
            console.log(">Error with Curator Auth:",e);
        }
        return c_auth;
    }

    /** Creates a printfile from an artwork */
    createPrintFile = (uid, artworkUID, artistName) => {
        const artStorage = authenticateArtist();

        let artBucket  = artStorage.bucket("art-uploads");
        let artPath    = "portal/" + uid + "/uploads/" + artworkUID;
        let master     = artBucket.file(artPath);
        let white      = 0xFFFFFFFF; //R G B A in HEXDEC

        //NOTE arbitrary spacing letiables
        const widthRatio = 4/3; //NOTE width of whiteboard to artwork
        const nameHeight = 50; //50px
        const logoSize   = 75; //75px (its a square)
        const maxLabelWidth  = 1800; // name shouldnt be wider than artwork
        const maxLabelHeight = 400;
        const minArtworkDim  = 1500; // no dimension of an artwork less than {}px

        master.download((err,artBuffer)=>{
            if (err) {
                console.log(err);
                res.status(500).send({error:"Error connecting to Art Bucket file", e:err});
            }

            jimp.read(artBuffer).then((artwork)=>{
                // Set Artwork letiables
                let artWidth    = artwork.bitmap.width;
                let artHeight   = artwork.bitmap.height;
                // Set Whiteboard letiables
                let dims        = getPaddingRatio(artWidth,artHeight,widthRatio);
                let whiteWidth  = dims[0];
                let whiteHeight = dims[1];
                let wPad = Math.floor((whiteWidth-artWidth)/2); //
                let hPad = Math.floor(((whiteHeight-artHeight)/2));

                if (artWidth >= minArtworkDim && artHeight >= minArtworkDim) {
                    console.log(">Image Meets Min Resolution");
                    let placeholder = new jimp(dims[0], dims[1], white, (err, whiteboard)=>{
                        // console.log(">Whiteboard Drawn");
                    jimp.loadFont('./font/tekuma128.fnt').then((font)=>{
                        // console.log(">Font Loaded");
                    jimp.read('./img/logo.png').then((rawLogo)=>{
                        // console.log(">Logo Loaded");
                    let placeholder2 = new jimp(maxLabelWidth,maxLabelHeight, function (err,fullLabel) {
                        if (err) {console.log(err);}
                        // Write the artist name, crop around it, then down scale it.
                        let name =   fullLabel.clone()
                                    .print(font, 0,0, artistName)
                                    .autocrop()
                                    .resize(jimp.AUTO, nameHeight); // 50px height
                        let nameWidth = name.bitmap.width;

                        // Set Logo Params
                        let logo    = rawLogo.autocrop().resize(logoSize,logoSize);
                        let logoX   = nameWidth/2 - logoSize/2;
                        let logoY   = nameHeight  + logoSize/2;
                        // Create Label ( name and logo composition )
                        let cropHeight = nameHeight + logoSize*2;
                        let cropWidth  = nameWidth  + 5;
                        fullLabel.composite(name,0,0)
                                 .composite(logo,logoX,logoY)
                                 .crop(0,0, cropWidth, cropHeight);

                        let labelWidth  = fullLabel.bitmap.width;
                        let labelHeight = fullLabel.bitmap.height;
                        let labelX      = (whiteWidth/2) - (labelWidth/2);
                        let labelY      = (whiteHeight) - (hPad/2) - (labelHeight/2);

                        console.log(">Label Made");
                        whiteboard
                               .composite(artwork ,wPad, hPad)
                               .composite(fullLabel, labelX,labelY)
                               .rgba(false)
                               .getBuffer(jimp.MIME_PNG, (err,printBuffer)=>{

                                   const pfBucket       = artStorage.bucket("art-printfiles");
                                   let savePath  = `${uid}/${artworkUID}`;
                                   let printfile = pfBucket.file(savePath);
                                   let options   = {
                                       metadata:{
                                           contentType: 'image/png'
                                       },
                                       predefinedAcl:"projectPrivate"
                                   };
                                   printfile.save(printBuffer,options, (err)=>{
                                       if (!err) {
                                           console.log(">>>Printfile Generated Successfully");
                                           res.status(200).send(">Printfile Generated Successfully")
                                       } else {
                                           console.log(">>>183:",err);
                                           res.status(500).send({error: ">Error uploading to Curator, but file was made"});
                                       }
                                   });
                               });
                    });
                    });
                    });
                    });
                } else {
                    console.log(">Image Error. Min w or h is "+minArtworkDim+" px. Was:",artWidth,artHeight);
                    res.status(400).send({error: "Requested image does not meet 1800x1800px minimum."});
                }
            });
        });
    }

    /**
     * Handle the server code here. This is an HTTP triggered GCF.
     *  READMORE https://cloud.google.com/functions/docs/writing/http
     * status(200) == OK
     * status(400) == client error
     * status(500) == server error
     */
    server = (req,res) => {
        if (req.method == "POST") {
            let r_uid;
            let r_artworkUID;
            let r_artist;
            try {
                r_uid        = req.body.uid;
                r_artworkUID = req.body.artworkuid;
                r_artist     = req.body.artist;
            } catch (e) {
                res.status(400).send({error:"> error requesting body attributes"});
                console.log(req);
            }
            if (r_uid != undefined && r_artworkUID != undefined && r_artist != undefined){
                createPrintFile(r_uid,r_artworkUID,r_artist);
            } else {
                res.status(400).send({error:"Request Body Missing Fields."});
                console.log(req);
            }
        } else {
            res.status(400).send({error:"Only Accepting POST reqs"});
        }
    }

    // =========== Execution ===========

    server(req,res);

}

const request  = require('request');
const gcloud   = require('gcloud');
const firebase = require('firebase');
const jimp     = require('jimp');

// gcloud alpha functions deploy resize --bucket art-functions --trigger-gs-uri art-uploads
// gcloud alpha functions deploy resize --stage-bucket dev-art-functions --trigger-bucket dev-art-uploads

exports.resize = function resize (context,data) {

    // =========== Methods ===========
    resizeAndUploadThumbnail = (image, width, quality) => {
        console.log(">processing image:", width);
        image.resize(width,jimp.AUTO).quality(quality).getBuffer(jimp.MIME_PNG, (err, tbuffer)=>{
            if(err){console.log(err);}
            let dest    = name.replace('uploads','thumb512');
            let thumb   = bucket.file(dest);
            let options = {
                metadata:{
                    contentType: 'image/png'
                },
                // make the thumbnail publicly readable
                predefinedAcl:"publicRead"
            };

            thumb.save(tbuffer, options, (err)=>{
                if (!err) {
                    console.log(">>Thumbnail 512xAUTO success");
                } else {
                    console.log(err);
                }
            });
        });
    }

    getFileThenResize = (small, large, quality) => {
        const name      = data.name;
        let path        = name.split('/');
        let fromPortal  = path.indexOf('portal')  > -1; //file from artist portal UX
        let fromUploads = path.indexOf('uploads') > -1; //art upload, not avatar or something else
        let isUpload    = data.resourceState === 'exists'; //as opposed to a deletion trigger
        if (fromPortal && fromUploads && isUpload) {
            let thisUID  = path[1];
            let artUID   = path[3];

            let gcs = gcloud.storage({
                keyFilename: './googleServiceKey.json',
                projectId  : 'artist-tekuma-4a697'
            });
            let bucket  = gcs.bucket(data.bucket);
            let master  = bucket.file(name);
            master.download((err,buffer)=>{
                console.log(">Download Success");
                jimp.read(buffer).then((image)=>{
                    console.log(">processing image");

                    resizeAndUploadThumbnail(image.clone(), small, quality);
                    resizeAndUploadThumbnail(image, large, quality);

                }).catch((err)=>{
                    console.log(err);
                });
            });
        }
    }

    // ========== Logic =========

    const small   = 128;
    const large   = 512;
    const quality = 85;

    getFileThenResize(small, large, quality);

}

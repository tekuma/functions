var request  = require('request');
var gcloud   = require('gcloud');
var firebase = require('firebase');
var jimp     = require('jimp');

// gcloud alpha functions deploy resize --bucket art-functions --trigger-gs-uri art-uploads



exports.resize = function resize (context,data) {
    var name        = data.name;
    var path        = name.split('/');
    var fromPortal  = path.indexOf('portal')  > -1; //file from artist portal UX
    var fromUploads = path.indexOf('uploads') > -1; //art upload, not avatar or something else
    var isUpload    = data.resourceState === 'exists'; //as opposed to a deletion trigger
    if (fromPortal && fromUploads && isUpload) {
        var bucket   = data.bucket;
        var thisUID  = path[1];
        var artUID   = path[3];

        var gcs = gcloud.storage({
            keyFilename: './googleServiceKey.json',
            projectId  : 'artist-tekuma-4a697'
        });
        var bucket  = gcs.bucket(data.bucket);
        var master  = bucket.file(name);
        master.download(function (err,buffer) {
            console.log("-----------");
            jimp.read(buffer).then(function (image) {
                console.log(">processing image");
                // First, make a (w*h) 512*auto thumbnail
                image.resize(512,jimp.AUTO).quality(85).getBuffer(jimp.MIME_JPEG, function (err, tbuffer) {
                    var dest     = name.replace('uploads','thumb512');
                    var thumb512 = bucket.file(dest);
                    var options = {
                        metadata:{
                            contentType: 'image/jpeg'
                        },
                        predefinedAcl:"publicRead"

                    };
                    thumb512.save(tbuffer, options, function (err) {
                        if (!err) {
                            console.log(">>Thumbnail 512xAUTO success");
                        }
                    });
                });
            }).catch(function (err) {
                console.log(err);
            });
            console.log("-----------");
            //FIXME read once, then clone rather than read twice?
            jimp.read(buffer).then(function (image) {
                console.log(">processing image2");
                // First, make a (w*h) 512*auto thumbnail
                image.resize(128,jimp.AUTO).quality(80).getBuffer(jimp.MIME_JPEG, function (err, buffer2) {
                    var dest     = name.replace('uploads','thumb128');
                    var thumb128 = bucket.file(dest);
                    var options = {
                        metadata:{
                            contentType: 'image/jpeg'
                        },
                        predefinedAcl:"publicRead"
                    };
                    thumb128.save(buffer2, options, function (err) {
                        if (!err) {
                            console.log(">>Thumbnail 128xAUTO success");
                        }
                    });
                });
            }).catch(function (err) {
                console.log(err);
            });
        });
    }
}//EOF

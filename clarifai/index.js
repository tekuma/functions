//NOTE this will execute in a node ~4 runtime. Use pre-ES6 language. No let/const

var firebase   = require("firebase");
var request    = require("request");
var Clarifai   = require('clarifai');
var gcloud     = require('gcloud');

// upload with ```bash
// gcloud alpha functions deploy autotag --bucket art-functions --trigger-gs-uri art-uploads

exports.autotag = function autotag (context,data) {
    var name        = data.name;
    var path        = name.split('/');
    var fromPortal  = path.indexOf('portal')  > -1; //file from artist portal UX
    var fromUploads = path.indexOf('uploads') > -1; //art upload, not avatar or something else
    var isUpload    = data.resourceState === 'exists'; //as opposed to a deletion trigger
    if (fromPortal && fromUploads && isUpload) {
        var bucket   = data.bucket;
        var thisUID  = path[1];
        var artUID   = path[3];
        var lifespan = 30000; // lifespan of URL in milliseconds
        var expires  = new Date().getTime() + lifespan;

        // Initialize connections to Clarifai, Cloud Storage, and Firebase.
        var clientID    = "M6m0sUVsWLHROSW0IjlrG2cojnJE8AaHJ1uBaJjZ";
        var clientScrt  = "DPPraf1aGGWgp08VbDskYi-ezk1lWTet78_zBER1"; //WARN: SENSITIVE
        Clarifai.initialize({
          'clientId'    : clientID,
          'clientSecret': clientScrt
        });
        var gcs = gcloud.storage({
        keyFilename: './googleServiceKey.json',
        projectId  : 'artist-tekuma-4a697'
        });


        var thisFile = gcs.bucket(bucket).file(name);
        var params   = {
            action : "read",
            expires: expires,
        };
        thisFile.getSignedUrl(params, function(err,url){
            //NOTE url is an auth'd url for {lifespan} ms
            Clarifai.getTagsByUrl(url, {
                // Pass tagging params here :
                // 'model': 'travel-v1.0'
            }).then(
                function(tagResponse) {
                  var tagResult = tagResponse.results[0].result.tag;
                  var docid     = tagResponse.results[0].docid;
                  Clarifai.getColorsByUrl(url).then(
                    function(colorResponse){
                        var colorResult = colorResponse.results[0].colors;
                        var dataPath = "/public/onboarders/"+thisUID+"/artworks/"+artUID ;
                        console.log('=============================');
                        console.log(">>User:", thisUID, "Artwork:", artUID, "Path:",dataPath );
                        console.log(">>Retrieved all info from Clarifai:", tagResponse, colorResponse);
                        // do try/catch

                        var dbRef;
                        try {
                            dbRef = firebase.database().ref(dataPath); //root refrence
                        } catch (e) {
                            firebase.initializeApp({
                              databaseURL   : "https://artist-tekuma-4a697.firebaseio.com",
                              serviceAccount: "./googleServiceKey.json"
                            });
                            dbRef = firebase.database().ref(dataPath)
                        }

                        dbRef.once("value").then(function(snapshot) {
                            var node   = snapshot.val();
                            var retlst = [];
                            node['colors'] = colorResult;
                            // create a tag object consistent with UX library
                            for (var i = 0; i < tagResult.probs.length; i++) {
                                // setting arbitrary cut-offs
                                if ((tagResult.probs[i] >= 0.88 && i < 16) || i < 4) {
                                    var tagObj = {
                                        id   : i+1,
                                        text : tagResult.classes[i]
                                    };
                                    retlst.push(tagObj);
                                }
                            }
                            node['tags']   = retlst;
                            node['doc_id'] = docid; //the clarifai file ID

                            firebase.database().ref(dataPath).set(node,function(err){
                                console.log(">>Firebase Database set ; err:", err);
                            });
                            context.success(); //kill process
                        });
                    },
                    function(error){
                        console.error(error, error.result);
                    }); //end getcolors
              },
              function(error){
                  console.error(error, error.result);
            }); //end gettags
        });
    }  else {
        // nothing happened
        console.log("< Empty Call");
        context.success(); //kill process
    }
};

const firebase   = require("firebase");
const request    = require("request");
const Clarifai   = require('clarifai');
const gcloud     = require('gcloud');

// upload with ```bash
// gcloud alpha functions deploy autotag --bucket art-functions --trigger-gs-uri art-uploads

//FIXME compress the image to 10MB max.

exports.autotag = function autotag (context,data) {
    const tagCutoff = .85;
    const name      = data.name;
    console.log(">Data:", data);

    let path        = name.split('/');
    let fromPortal  = path.indexOf('portal')  > -1; //file from artist portal UX
    let fromUploads = path.indexOf('uploads') > -1; //art upload, not avatar or something else
    let isUpload    = data.resourceState === 'exists'; //as opposed to a deletion trigger
    if (fromPortal && fromUploads && isUpload) {
        let bucket   = data.bucket;
        let thisUID  = path[1];
        let artUID   = path[3];
        let lifespan = 60000; // lifespan == timeout == 60sec
        let expires  = new Date().getTime() + lifespan;

        // Initialize connections to Clarifai, Cloud Storage, and Firebase.
        let clientID    = "M6m0sUVsWLHROSW0IjlrG2cojnJE8AaHJ1uBaJjZ";
        let clientScrt  = "DPPraf1aGGWgp08VbDskYi-ezk1lWTet78_zBER1"; //WARN: SENSITIVE
        Clarifai.initialize({
          'clientId'    : clientID,
          'clientSecret': clientScrt
        });
        let gcs = gcloud.storage({
        keyFilename: './googleServiceKey.json',
        projectId  : 'artist-tekuma-4a697'
        });


        let thisFile = gcs.bucket(bucket).file(name);
        let params   = {
            action : "read",
            expires: expires,
        };
        thisFile.getSignedUrl(params, function(err,url){
            //NOTE url is an auth'd url for {lifespan} ms
            Clarifai.getTagsByUrl(url, {
                // Pass tagging params here :
                // 'model': 'travel-v1.0'
            }).then( (tagResponse)=>{
                let tagResult = tagResponse.results[0].result.tag;
                let docid     = tagResponse.results[0].docid;
                Clarifai.getColorsByUrl(url).then( (colorResponse)=>{
                    let colorResult = colorResponse.results[0].colors;
                    let dataPath = "/public/onboarders/"+thisUID+"/artworks/"+artUID ;
                    console.log('=============================');
                    console.log(">>User:", thisUID, "Artwork:", artUID, "Path:",dataPath );
                    console.log(">>Retrieved all info from Clarifai:", tagResponse, colorResponse);

                    let dbRef;
                    try {
                        dbRef = firebase.database().ref(dataPath); //root refrence
                    } catch (e) {
                        firebase.initializeApp({
                          databaseURL   : "https://artist-tekuma-4a697.firebaseio.com",
                          serviceAccount: "./googleServiceKey.json"
                        });
                        dbRef = firebase.database().ref(dataPath)
                    }

                    dbRef.once("value").then((snapshot)=>{
                        let node   = snapshot.val();
                        let retlst = [];
                        node['colors'] = colorResult;
                        // create a tag object consistent with UX library
                        for (let i = 0; i < tagResult.probs.length; i++) {
                            // setting arbitrary cut-offs
                            if ((tagResult.probs[i] >= tagCutoff && i < 16) || i < 4) {
                                let tagObj = {
                                    id   : i+1,
                                    text : tagResult.classes[i]
                                };
                                retlst.push(tagObj);
                            }
                        }
                        node['tags']   = retlst;
                        node['doc_id'] = docid; //the clarifai file ID

                        firebase.database().ref(dataPath).set(node, (err)=>{
                            console.log(">>Firebase Database set ; err:", err);
                            context.success(">Success! <200>"); //kill process
                        });

                    });
                },
                (error)=>{
                    console.error(error, error.result);
                }); //end getcolors
              },
              (error)=>{
                  console.error(error, error.result);
            }); //end gettags
        });
    }  else {
        // nothing happened
        console.log("< Empty Call:", data.resourceState);
        context.success(); //kill process
    }
};

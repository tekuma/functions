const firebase   = require("firebase");
const request    = require("request");
const Clarifai   = require('clarifai');
const gcloud     = require('gcloud');

// upload with ```bash
// gcloud alpha functions deploy autotag --bucket art-functions --trigger-gs-uri art-uploads



 /*  Testing sample Data objects
{
"resourceState": "exists",
"id": "art-uploads/",
"bucket": "art-uploads",
"name": "portal/TwN7KQxDbFbGb5lnten6M8gEsfk2/thumb512/-KPqnhMqaOS0UMRhEJ__",
"mediaLink": "https://www.googleapis.com/storage/v1/b/art-uploads/o/?generation=0&alt=media"
}
*/


//FIXME compress the image to 10MB max.

exports.autotag = function autotag (context,data) {
    // Initialize
    console.log("--------------------------");
    console.log(">>>Data:", data);

    // ========== Methods ======================

    /**
     * Determines if the trigger was caused by a full size upload, or something else.
     */
    isValidTrigger = () => {
        const name      = data.name;

        let path        = name.split('/');
        let fromPortal  = path.indexOf('portal')  > -1; //file from artist portal UX
        let fromUploads = path.indexOf('thumb512') > -1; //art upload, not avatar or something else
        let isUpload    = data.resourceState === 'exists'; //as opposed to a deletion trigger
        return fromPortal && fromUploads && isUpload ;
    }

    /**
     * Called from initialize. Establishes connections to gCloud, and clarifai
     * @return {[obj]} [google cloud storage object]
     */
    logInToStorage = () => {
        return new Promise( function(resolve,reject){
            let gcs = gcloud.storage({
            keyFilename: './googleServiceKey.json',
            projectId  : 'artist-tekuma-4a697'
            });
            resolve(gcs);
        });

    }

    retrieveImageFile = (gcs) => {
        return new Promise(function(resolve,reject){
            console.log(">>> Retrieveing image");
            let expires  = new Date().getTime() + lifespan;
            let thisFile = gcs.bucket(data.bucket).file(data.name);
            let params   = {
                action : "read",
                expires: expires,
            };
            thisFile.getSignedUrl(params, (err,url)=>{
                resolve(url);
            });
        });

    }

    callClarifai = (url) => {
        console.log(">calling clarifai");
        return new Promise(function (resolve, reject){
            //NOTE url is an auth'd url for {lifespan} ms
            let clientID    = "M6m0sUVsWLHROSW0IjlrG2cojnJE8AaHJ1uBaJjZ";
            let clientScrt  = "DPPraf1aGGWgp08VbDskYi-ezk1lWTet78_zBER1"; //WARN: SENSITIVE
            Clarifai.initialize({
              'clientId'    : clientID,
              'clientSecret': clientScrt
            });
            console.log(">Clarifai Connected Successfully");
            Clarifai.getTagsByUrl(url, {
                // Pass tagging params here :
                // 'model': 'travel-v1.0'
            }).then( (tagResponse)=>{
                let tagResult = tagResponse.results[0].result.tag;
                let docid     = tagResponse.results[0].docid;
                Clarifai.getColorsByUrl(url)
                .then( (colorResponse)=>{
                    let colorResult = colorResponse.results[0].colors;
                    resolve([tagResult, colorResult, docid]);
                });
            });
        });
    }

    recordInDatabase = (results) => {
        let tagResult   = results[0];
        let colorResult = results[1];
        let docid       = results[2];
        console.log(">>Connecting to firebase");
        let path     = data.name.split('/');
        let thisUID  = path[1];
        let artUID   = path[3];
        let dataPath = `/public/onboarders/${thisUID}/artworks/${artUID}`;

        console.log('=============================');
        console.log(">>User:", thisUID, "Artwork:", artUID, "Path:",dataPath );
        console.log(">>Retrieved all info from Clarifai. Tags:", tagResult, "Color:", colorResult);

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
            console.log(">Firebase DB connected ");
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
            console.log("Doc ID:", docid);
            firebase.database().ref(dataPath).set(node, (err)=>{
                console.log(">>Firebase Database set ; err:", err);
                context.success("Info Set to DB")
            });
        });
    }


    // ============ Global Variables ==========
    const tagCutoff = .85;
    const lifespan  = 60000; // timespan of image URL to be not password protected. 60 seconds.


    // ============== Logic ==================

    if (isValidTrigger()) {
        logInToStorage()
            .then(retrieveImageFile)
            .then(callClarifai)
            .then(recordInDatabase);
    } else {
        // Trigger was not caused by a full size image upload. Thus, ignore it.
        console.log("<< Empty Call:", "from portal:",fromPortal,"from uploads:",fromUploads );
        context.done()
    }

};

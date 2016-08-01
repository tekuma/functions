var gcloud     = require('gcloud');
var firebase   = require("firebase");
const jsonfile   = require('jsonfile');

var vision = gcloud.vision({
  projectId: 'artist-tekuma',
  keyFilename: '../../auth/googleServiceKey.json'
});

var img = "./art1.jpg";

var options = {
    types:[
        'text'
    ],
    verbose: true
}

let imageURL = "https://instagram.fash1-1.fna.fbcdn.net/t51.2885-15/e35/13744243_749474725194106_409995437_n.jpg?ig_cache_key=MTMwMTU0ODMyNzUwNjE1OTc5Nw%3D%3D.2";

vision.detect(imageURL, options, function(err,results,response) {
    console.log(results);
    jsonfile.writeFile("./vision.json", results, function (err) {
        console.error(err);
    });
});

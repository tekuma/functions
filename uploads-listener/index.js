var request = require('request');

// upload with ```bash
// gcloud alpha functions deploy artalert --bucket staging.artist-tekuma-4a697.appspot.com --trigger-gs-uri art-uploads

/*
curl -X POST https://hooks.slack.com/services/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 -d '{"channel":"uploads", "username":"test", "text":"This is a test"}'
 */

exports.artalert = function artalert (context,data) {
    var slackURL   = "https://hooks.slack.com/services/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";
    var link       = "https://console.cloud.google.com/m/cloudstorage/b/art-uploads/o/"+ data.name;
    var messagetxt = "> New art upload stored into Tekuma storage at: \n "+ data.id + " \n>  View/Download at: \n " + link ;
    var form =  { // a URL-encoded payload form
        channel   : "#uploads",
        username  : "Stephen's AI",
        text      : messagetxt,
        icon_url  : "https://artist.tekuma.io/assets/favicons/favicon180px.png"
    };
    console.log("this is the data", data);
    if (data.resourceState == "exists") {
        request({
            url     : slackURL,
            method  : "POST",
            // json    : true, // not in use atm
            body    : JSON.stringify(form)
        }, function (error, response, body){
            console.log(">> Triggered!");
            console.log(body);

        });
    }

    context.success(); //kill process
};

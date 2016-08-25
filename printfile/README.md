# Printfile Generator
-----------------------
**This is an opaque function that takes in a raw image and returns a printfile**
You specify the image by providing:
* Arist UID
* Artwork UID
* the name to print on the printfile

Then, the printfile is uploaded directly to the curator printfile storage bucket located at
<https://console.cloud.google.com/storage/browser?project=curator-tekuma>


 (raw upload) -> [] => Printfile


-----------------------

## Deployment
To deploy this cloud function, from the cwd type
```
$ gcloud alpha functions deploy printfile --bucket art-functions --trigger-http
```

## Testing
To test this function while deployed, you may: (using any real Artist UID and Artwork UID)
1. Use the gcloud CLI.
```
gcloud alpha functions call printfile --data '{"uid":"JvrOHCvEKRaLiFHmjmq02rg0Ava2" , "artworkuid":"-KOAlYQiVqtVX9Bgwrba" , "artist":"Test Name"}'
```

2. Test from the GCloud Web GUI: <https://console.cloud.google.com/functions/list?project=curator-tekuma>
From the "Testing" Tab, submit:
```
{"uid":"JvrOHCvEKRaLiFHmjmq02rg0Ava2" , "artworkuid":"-KOAlYQiVqtVX9Bgwrba" , "artist":"Kanye West"}
```

3. cURL an HTTP Post Request directly to the trigger URL with the data JSON of
'{"uid":"JvrOHCvEKRaLiFHmjmq02rg0Ava2" , "artworkuid":"-KOAlYQiVqtVX9Bgwrba" , "artist":"Kanye West"}'


 ---------------------
## Usage
*This function uses arbitrary parameters.*

* All printfiles will have aspect ratios in the range 2:3 to 3:2.
* All paddings will have the artist name printed to them.

  (.4 - 2.5) -> { 2:3, 3:4, 4:5, 1:1 and reciprocals}
  [[ 1:1, 2:3 (.667 , 1.5), 3:4 (.75, 1.33) and 4:5 (.8, 1.25) ]]

* All arbitrary parameters are set with:
  ``` JavaScript
  //NOTE arbitrary spacing letiables
  const widthRatio = 4/3; //NOTE width of whiteboard to artwork
  const nameHeight = 50; //50px
  const logoSize   = 75; //75px (its a square)
  const maxLabelWidth  = 1800; // name shouldnt be wider than artwork
  const maxLabelHeight = 400;
  const minArtworkDim  = 1500; // no dimension of an artwork less than {}px
```

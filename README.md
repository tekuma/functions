# Cloud Function Repository

#### NOTE: This is Alpha-Technology. Things *will* change.

see: <https://cloud.google.com/functions/docs/>


### About
Google Cloud Functions (GCFs) act as opaque/blackbox functions which sit in the cloud. As they use a NodeJS Runtime Enviornment, they support a vary wide variety of functionality. See <https://www.npmjs.com/> for possible third party libraries.

NOTE: GCFs currently only support pre-ES6 JS notation. That is,  `const`, `let`, `()=>`, `${}`, etc, are NOT supported. If you have ES6+ code, you can use:
    <https://babeljs.io/repl/>
to transpile JS code.

Each function has its own directory which will be packaged and deployed. Each directory is also an NPM project, and will contain all dependencies.

### Triggers
GCFs have multiple types of triggers.

##### Background
GCFs can be deployed as passive listeners, which listen for changes in a Google Cloud storage bucket. On a change, the bucket will be triggered, and information about the change passed into the function as context.
see: <https://cloud.google.com/functions/docs/writing/background>

##### HTTP
GCFs can also be deployed as highly abstracted NodeJS Express servers, which listen for HTTP requests with `(req,res)` notation. see: <https://cloud.google.com/functions/docs/writing/http>



### Deployment and Testing
When you are ready to write a function, from a terminal do:
```Bash
$ mkdir anyName
$ cd anyName
$ touch index.js     // must be 'index.js'
$ npm init
$ npm install {whatever you need}
```
Then, proceed to write your function in index.js. Be sure to encase it in an export. For example, if you are writing an HTTP function called myLittleFunction :

 ```Javascript
 exports.myLittleFunction = function myLittleFunction(req,res) {
     // Function here
     res.status(200).send({Message:"eh-okay"});
 }
 ```

 When your function has been de-bugged, you can deploy it via Terminal from the CWD

 ```Bash
 // for HTTP functions
 $ gcloud alpha functions deploy myLittleFunction --bucket {name of bucket} --trigger-http
 ```

 Then, you can debug the live GCF via Terminal as well.

```Bash
$ gcloud alpha functions call myLittleFunction --data '{"foo":"bar"}'
```

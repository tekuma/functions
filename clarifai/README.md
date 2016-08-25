# Auto-tag Cloud Function
-------------------------
Powered by Clarifai

## Deployment
do
```
gcloud alpha functions deploy autotag --bucket art-functions --trigger-gs-uri art-uploads
```

## Testing

Testing can be accomplished via using the test Web interface from the gCloud console.
Simply pass a JSON to be used as a 'Data' object. I.e.

`"resourceState": "exists",
"id": "art-uploads/",
"bucket": "art-uploads",
"name": "portal/TwN7KQxDbFbGb5lnten6M8gEsfk2/uploads/-KPqnhMqaOS0UMRhEJ__",
"mediaLink": "https://www.googleapis.com/storage/v1/b/art-uploads/o/?generation=0&alt=media"
}`

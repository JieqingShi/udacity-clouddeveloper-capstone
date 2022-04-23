# udacity-clouddeveloper-capstone
Capstone project for the Udacity Cloud Developer Nanodegree

<img src=images/frontend-screenshot.png>

## Project description
This project is an serverless image sharing application, similar to the Udagram from lesson 4, but with a twist:

Upon upload of an image **an AI model is triggered which tells the user what object is displayed in the image**.

This image is then processed into a uniform size and a text overlay is projected onto the image which shows the top5 most likely object classes + their probabilities as calculated by the model.

Currently there is only one AI model active which has been trained to distinguish dog breeds. Therefore the current version of the app only works on dog images (of course it's also possible to upload images of other objects but the model predictions will still be dog breeds)


As this is intended to be an image sharing application users are supposed to see all avaible content on the website. It would not make sense to restrict the users to only see the content they have uploaded.

However we do restrict the use of the application through authentication in the way that only authenticated users are allowed to upload images (the same way the Udagram app from lecture 4 is designed). In other words, everyone can see the content of the website, but only authenticated users are allowed to create new content.

However due to the nature of this application this project automatically fails the authentication project rubric.

## Application structure

The application has 3 components

|          	| language 	| description                                                                                                                 	|
|----------	|----------	|-----------------------------------------------------------------------------------------------------------------------------	|
| Backend  	| nodejs   	| Reused a large part of the backend from lecture 4, but refactored  Also added some lambda functions and resource components 	|
| Frontend 	| React    	| Pretty much the same frontend from lecture 4                                                                                	|
| Model    	| python   	| The model backend infrastructure for obtaining predictions  Implemented using python and deployed with serverless           	|

These components will be described in more detail in the following sections.


### Backend

The backend portion relies in large parts on the same code as from lecture 4. Almost all key lambda functions are re-used. However I also added some modifications and refactored the code.

The first decision I made was to keep the `Group` -> `Image` hierarchy. 

Alternatively `Groups` could have been removed which would have changed this app into an image sharing application for only Dog pictures. However that would have meant that the frontend would have to be modfied as well, (which I have 0 experience in) so in the end I decided to not go through with it.

**Authorization**

Instead of using the authorization code from the lecture where secrets are stored in AWS KMS I changed it into the scheme from the Serverless Todo-App where the certificate is downloaded from the Auth0 JWKS Endpoint which is then used to verify tokens.

**Lambda functions** 

Removed some of the lambda functions from lecture 4 as they were not needed for this project, but most of the 

**Code Refactoring**


### Frontend

The same frontend is used as in lecture 4. I only added a function in `groups-api.ts` for obtaining predictions from the model endpoint. This can e.g. be used to change the alert text upon image upload to show the prediction results (although I decided to not go through with it). Furthermore I made a change to the `UdagramImage.tsx` to pull the image for display from the processedImageUrl instead of the original imageUrl.




### Image processing

webp does not work for JIMP

Can take a while for image to appear in Frontend (refresh)



### Model
Model has 133 classes ...

## Deployment
Why two different sections and not one serverless.yaml

Which node, npm, serverless versions are used

## Improvements
Lambda coldstart for model, look into smaller models ONNX Runtime
Allow user to delete images

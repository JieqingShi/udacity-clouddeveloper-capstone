# udacity-clouddeveloper-capstone
Capstone project for the Udacity Cloud Developer Nanodegree


## Project description
This project is an image sharing application, similar to Udagram from the lecture, but with a twist:

Upon upload of an image an AI model is triggered which tells the user what object is displayed in the image.
This image is then processed into a uniform size and a text overlay is projected onto the image which shows the top5 most likely object classes + their probabilities as calculated by the model.

Currently there is only one AI model active which has been trained to distinguish dog breeds. Therefore the current version of the app only works on dog images (of course it's also possible to upload images of other objects but the model predictions will still be dog breeds)

## Application structure

Kept groups

In a hypothetical continuation of this app different models could be deployed for different object groups (cats, fruits, plants etc.)

## Authentication

Since this is an image sharing application it is intended for users to see all images. Only the creation of is restricted by authorization, i.e. only logged-in users are allowed to create groups and images within groups (the same way the Udagram app is designed)

As such the project rubric about authentication is intentionally not satisifed.

### Image processing

webp does not work for JIMP

Can take a while for image to appear in Frontend (refresh)



### Model
Model has 133 classes ...

## Deployment
Why two different sections and not one serverless.yaml

## Improvements
Lambda coldstart for model, look into smaller models ONNX Runtime
Allow user to delete images

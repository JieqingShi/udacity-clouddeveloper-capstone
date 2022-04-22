# NOTE: it has no effect changing the code and then do sls deploy! The image has to be rebuilt!
# Steps: Rebuild the container and push to ECR
# Note new tag and digest and adapt it in serverless.yaml file
# Deploy
# Note new endpoint name and change it in node/backend/serverless.yaml environment variables as well as in client/src/config.ts


import json
import logging
import io
from PIL import Image
import requests
from inference_timm import *  

logger = logging.getLogger("lambdaHandler")
logger.setLevel(logging.INFO)

# downloading images from S3 is less flexible than using requests!
# s3 = boto3.resource('s3')
classifier = DogBreedClassifier("inference_config.yaml")


def get_image_from_url(url):
    """ Get image from url using requests; assuming the url is in the form of:
    https://serverless-udagram-images-redux-dev.s3.eu-west-1.amazonaws.com/1f0a6188-43bb-4d5c-84cc-61581774b609
    """
    try:
        r = requests.get(url)
        if r.status_code == 200:
            f = io.BytesIO(r.content)
            img = Image.open(f)
            return img
        else:
            logger.error(f"No image found under url: {url}")
            return None
    except Exception as e:
        raise e


def lambda_handler(event, context):
    try:
        body = json.loads(event["body"])
        image_url = body["url"]
        logger.info(f"image url: {image_url}")
        try:
            img = get_image_from_url(image_url)
        except Exception as e:
            logger.error(f"Error getting image from url: {image_url}")
            return {
                "statusCode": 400,
                "body": json.dumps({"error": str(e)})
            }

        pred_logits, top1, top5 = classifier.predict(img)
        pred_probabilities = classifier.get_probs()
        top1_class = classifier.get_class_name(top1)
        top5_class = classifier.get_class_name(top5)
        top1_probs = [pred_probabilities[0, top1].cpu().tolist()]
        top5_probs = pred_probabilities[0, top5].cpu().tolist()

        logger.info(f"top1 class: {top1_class} with probability {top1_probs}")
        logger.info(f"top5 class: {top5_class} with probabilities {top5_probs}")

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Credentials": True},
             "body": json.dumps({"url": image_url,  
                                 "top5": top5_class,
                                 "prob5": top5_probs})  
        }
    except Exception as e:
        logger.error(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Credentials": True},
            "body": json.dumps({"error": str(e)})
        }



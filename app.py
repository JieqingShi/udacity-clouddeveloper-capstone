import json
import logging
import numpy as np
# import boto3
import io
from PIL import Image
import requests
from inference_timm import *

logger = logging.getLogger("lambdaHandler")
logger.setLevel(logging.INFO)

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


# def get_image_from_s3(url):
#     """ Get image from s3 bucket; assuming the s3 object url is in the form of:
#     https://serverless-udagram-images-redux-dev.s3.eu-west-1.amazonaws.com/1f0a6188-43bb-4d5c-84cc-61581774b609
#     so that the bucket name and object key can be parsed from the url
#     """
#     def parse_s3_url(s3_object_url):
#         bucket = s3_object_url.split('/')[2].split(".s3")[0]
#         key = s3_object_url.split('/')[3]
#         return bucket, key
#
#     bucket_name, object_key = parse_s3_url(url)
#     try:
#         s3.Object(bucket_name, object_key).download_file("/tmp/image.jpg")
#         img = Image.open("/tmp/image.jpg")
#         return img
#     except Exception as e:
#         raise e


def lambda_handler(event, context):
    try:
        # body = json.loads(event["body"])
        # image_url = body["url"]
        # placeholder for now, might be adapted later when the url is sent in the payload of the requets
        image_url = event["url"]
        logger.info(f"image url: {image_url}")
        img = get_image_from_url(image_url)
        img_np = np.array(img)
        logger.info(f"image shape: {img_np.shape}")
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
                                "top1": top1_class,
                                "prob": top1_probs})
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



import json
import logging

logger = logging.getLogger("authLogger")
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(f"event: {event}")
    try:
        body = json.loads(event["body"])
        headers = event["headers"]
        id_token = headers.get("Authorization").split(" ")[1]  # splits away "Bearer"
        logger.info(f"id_token: {id_token}")
    except Exception as e:
        logger.error(f"Error parsing event: {e}")
        return {
            "statusCode": 400,
            "body": json.dumps({"error": str(e)})
        }


    return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Credentials": True},
             "body": json.dumps("Hello from lambda!")
        }
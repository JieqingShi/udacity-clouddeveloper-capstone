try:
  import unzip_requirements
except ImportError:
  pass
import json
import logging
import os
from auth0.v3.authentication.token_verifier import TokenVerifier, AsymmetricSignatureVerifier

logger = logging.getLogger("authLogger")
logger.setLevel(logging.INFO)

domain = os.environ.get("AUTH0_DOMAIN")
client_id = os.environ.get("AUTH0_CLIENT_ID")
jwks_url = os.environ.get("AUTH0_JWKS_URL")
sv = AsymmetricSignatureVerifier(jwks_url=jwks_url)
tv = TokenVerifier(signature_verifier=sv, 
                    issuer=f"https://{domain}/", 
                    audience=client_id)

def lambda_handler(event, context):
    logger.info(f"event: {event}")
    try:
        # if this is not connected to an API gateway there is no "headers" in event -> look for "authorizationToken" instead
        # headers = event["headers"]  # a dictionary, no need to parse as JSON
        # auth_token = headers.get("Authorization").split(" ")[1]  # splits away "Bearer"
        auth_token = event.get("authorizationToken").split(" ")[1]
        jwt_token = tv.verify(auth_token)
        logger.info(f"jwt_token: {jwt_token}")
        logger.info(f"User {jwt_token['sub']} is authorized")
        
        allow = {
            "principalId": jwt_token["sub"],
             "policyDocument": {
                "Version": '2012-10-17',
                "Statement": [
                    {
                        "Action": 'execute-api:Invoke',
                        "Effect": 'Allow',
                        "Resource": '*'
                    }
                ]
              }
            }
        return allow
    except Exception as e:
        logger.error(f"User not authorized! {e}")
        deny = {
            "principalId": 'user',
            "policyDocument": {
                "Version": '2012-10-17',
                "Statement": [
                    {
                        "Action": 'execute-api:Invoke',
                        "Effect": 'Deny',
                        "Resource": '*'
                    }
                ]
             }
        }
        return deny

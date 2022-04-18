# copied and modified from https://aws.amazon.com/blogs/machine-learning/using-container-images-to-run-pytorch-models-in-aws-lambda/
# see also https://github.com/anandsm7/BERT_as_serverless_service
FROM public.ecr.aws/lambda/python:3.8

# Copy the earlier created requirements.txt file to the container
COPY python/requirements.txt ./

# Install the python requirements from requirements.txt
RUN python3.8 -m pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy the earlier created app.py file to the container
COPY python/inference_config.yaml inference_timm.py ./
COPY python/app.py ./

# Load the BERT model from Huggingface and store it in the model directory
RUN mkdir model
COPY efficientnet_b2_dogbreedclassifier.pth.tar ./model/efficientnet_b2_dogbreedclassifier.pth.tar

# Set the CMD to your handler
CMD ["app.lambda_handler"]
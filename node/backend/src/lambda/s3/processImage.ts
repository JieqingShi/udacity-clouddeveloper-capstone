import { SNSEvent, SNSHandler, S3EventRecord } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS from 'aws-sdk'
import Jimp from 'jimp/es'
import Axios from 'axios'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'
import { createLogger } from '../../utils/logger'

const s3 = new AWS.S3()
const docClient = new AWS.DynamoDB.DocumentClient()
const imagesTable = process.env.IMAGES_TABLE
const imageIdIndex = process.env.IMAGE_ID_INDEX
const imagesBucketName = process.env.IMAGES_S3_BUCKET
const imagesProcessedBucketName = process.env.IMAGES_PROCESSED_S3_BUCKET
const modelEndpoint = process.env.MODEL_ENDPOINT

const logger = createLogger('processImage')

export const handler = middy(async (event: SNSEvent) => {
    logger.info('Processing SNS event ', JSON.stringify(event))
    for (const snsRecord of event.Records) {
      const s3EventStr = snsRecord.Sns.Message
      logger.info('Processing S3 event', s3EventStr)
      const s3Event = JSON.parse(s3EventStr)
  
      for (const record of s3Event.Records) {
        // "record" is an instance of S3EventRecord
        await processImage(record) // processes the image and stores the processed image in a separate S3 bucket
      }
    }
})

handler.use(
  cors({
    credentials: true
  })
)

async function processImage(record: S3EventRecord) {
  const key = record.s3.object.key  // Check cloudwatch logs to see how record looks like
  const imageUrl = `https://${imagesBucketName}.s3.amazonaws.com/${key}`  // construct imageUrl from the key name
  logger.info('Processing S3 item with key: ', key)
  logger.info("The image URL is ", imageUrl)

  // We're getting the image from the URL instead of from S3 like in the lecture
  // This is because we also need the URL to obtain the prediction results from the model endpoint

  // Resize and apply text overlay to image where the text is obtained from the model prediction
    // Get predictions from model endpoint which serves as the text to be overlayed
  logger.info("Getting predictions from model endpoint")
  const predictionResults = await getPredictions(imageUrl)
  const breeds = predictionResults.top5
  const probabilities = predictionResults.prob5

  logger.info("Resizing and applying text overlay to image")
  const image = await resizeAndApplyTextOverlay(imageUrl, breeds, probabilities)
  
  // Write image to processed image S3 bucket
  const convertedBuffer = await image.getBufferAsync(Jimp.AUTO)  // had to add toString() to get rid of error
  logger.info(`Saving processed images in S3 Bucket ${imagesProcessedBucketName}`)
  await s3.putObject({
        Bucket: imagesProcessedBucketName,
        // Key: `${key}.jpg`,
        Key: key,  // gets same key as the original image
        Body: convertedBuffer
  }).promise()

  // Store the processed image URL in the Image DynamoDB table
  // We do this with a PUT operation instead of an UPDATE operation (i.e. we REPLACE instead of UPDATE)
  // This is because the table is organized by groupId as the partition key and the timestamp as the sort key
  // If we update the item then we would have to provide these two keys to uniquely identify the item - this is possible but not really elegant
  // If we replace the item (where we leave all values intact and just update the processedImageUrl) then we can simply provide the item itself
  const processedImageUrl = `https://${imagesProcessedBucketName}.s3.amazonaws.com/${key}`
  // The new title is going to be the predicted class with the highest probability (i.e. the top prediction); the arrays are already sorted by likelihood
  const newTitle = `${breeds[0].split("_").join(" ")} - ${Math.round(probabilities[0]*10000)/100}%`
  await updateTable(key, processedImageUrl, newTitle)
}

async function resizeAndApplyTextOverlay(imageUrl: string, classes: string[], probabilities: number[]) {
  /* 
  
    What this does: Reads image from an URL, resizes it, applies a text overlay and returns the image as a buffer
    The text is obtained from the model prediction endpoint which returns the top 5 predictions and their probabilities as arrays
    The text is supposed to then show these predictions and is expected to be in the format <predicted class> - <probability> \n <predicted class> - <probability> \n ...
    Unfortunately the text cannot be constructed beforehand and passed as an input argument as the overlayed text will then be malformatted in the image (tested it, does not work)
    This means the overlay text has to be constructed inside this function, taking the two arrays as input
    The size of the new image is fixed
  */

  // Reading image
  const image = await Jimp.read(imageUrl);
  logger.info("Read image. Image has size: ", image.bitmap.width, image.bitmap.height)
  // Resize image
  image.resize(1000, Jimp.AUTO);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  logger.info("Resized image. Image has size: ", width, height)

  // Defining the text font and create the overlay with a custom color
  // The text is going to be 5 lines of "<breed> - <probability>"
  var textImage = new Jimp(width, height, 0x0);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
  for (let i = 0; i < classes.length; i++) {
    textImage.print(font, 10, 10 + i * 20, `${classes[i].split("_").join(" ")}: ${Math.round(probabilities[i]*10000)/100}%`);
  }
  textImage.color([{ apply: 'xor', params: ['#063970'] }])
  image.blit(textImage, 0, 0)
  
  return image
}

async function getPredictions(imageUrl: string): Promise<any> {
  /* 
    Gets predictions from model endpoint; The models API accepts {"url": <imageUrl>} in the request body and returns 

    {
     "url": <same url>, 
     "top5": <top5 predictions>, "
     "prob5": <probabilities of top5 predictions>
    }

  */
  logger.info(`Sending image from URL ${imageUrl} to model endpoint`)
  const result = await Axios.post(modelEndpoint, {
    "url": imageUrl
  })
  logger.info("Predictions obtained from model endpoint")
  logger.info("Top 5 Predictions: ", result.data.top5)
  logger.info("Probabilities: ", result.data.prob5)

  return result.data
}

// Update the table with the processed image URL
// We do this with a PUT operation instead of an UPDATE operation (i.e. we REPLACE instead of UPDATE)
// This is because the table is organized by groupId as the partition key and the timestamp as the sort key
// If we update the item then we would have to provide these two keys to uniquely identify the item - this is possible but not really elegant
// If we replace the item (where we leave all values intact and just update the processedImageUrl) then we can simply provide the item itself// We need to store the processed image Url in dynamodb so that the client can access it. There are multiple ways to do this.
async function updateTable(imageId: string, processedImageUrl: string, newTitle: string) {

  // First get item from DynamoDB
  const result = await docClient.query({
    TableName: imagesTable,
    IndexName: imageIdIndex,
    KeyConditionExpression: 'imageId = :imageId',
    ExpressionAttributeValues: {
        ':imageId': imageId
    }
  }).promise()

  const item = result.Items[0]
  logger.info("Obtained item corresponding to imageId from DynamoDB: ", item)
  logger.info("Replacing table item by adding the processedImageUrl: ", processedImageUrl)
  
  // Now also updating the title so that it can be displayed in the frontend
  const newItem = {
    groupId: item.groupId,
    timestamp: item.timestamp,
    imageId: item.imageId,
    imageUrl: item.imageUrl,
    // Updating these two things
    processedImageUrl: processedImageUrl,
    title: newTitle
  }

  await docClient
      .put({
        TableName: imagesTable,
        Item: newItem
  }).promise()

}




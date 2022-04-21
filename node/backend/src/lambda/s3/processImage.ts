import { SNSEvent, S3EventRecord } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS from 'aws-sdk'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'
import { createLogger } from '../../utils/logger'
import { getPredictions } from '../../utils/modelprediction'
import { resizeAndApplyTextOverlay } from '../../utils/imageprocessing'

const s3 = new AWS.S3()
const docClient = new AWS.DynamoDB.DocumentClient()
const imagesTable = process.env.IMAGES_TABLE
const imageIdIndex = process.env.IMAGE_ID_INDEX
const imagesBucketName = process.env.IMAGES_S3_BUCKET
const imagesProcessedBucketName = process.env.IMAGES_PROCESSED_S3_BUCKET

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

  
  // Get predictions from model endpoint which serves as the text to be overlayed
  logger.info("Getting predictions from model endpoint")
  const predictionResults = await getPredictions(imageUrl)
  const breeds = predictionResults.top5
  const probabilities = predictionResults.prob5
  logger.info(`Top 5 predictions: ${breeds} and their probabilities: ${probabilities} `)

  logger.info("Resizing and applying text overlay to image")
  const convertedBuffer = await resizeAndApplyTextOverlay(imageUrl, breeds, probabilities)

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




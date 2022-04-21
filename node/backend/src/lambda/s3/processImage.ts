import { SNSEvent, SNSHandler, S3EventRecord } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS from 'aws-sdk'
import Jimp from 'jimp/es'
import Axios from 'axios'

const s3 = new AWS.S3()
const docClient = new AWS.DynamoDB.DocumentClient()

const imagesTable = process.env.IMAGES_TABLE
const imageIdIndex = process.env.IMAGE_ID_INDEX
const imagesBucketName = process.env.IMAGES_S3_BUCKET
const imagesProcessedBucketName = process.env.IMAGES_PROCESSED_S3_BUCKET
const modelEndpoint = process.env.MODEL_ENDPOINT

export const handler: SNSHandler = async (event: SNSEvent) => {
    console.log('Processing SNS event ', JSON.stringify(event))
    for (const snsRecord of event.Records) {
      const s3EventStr = snsRecord.Sns.Message
      console.log('Processing S3 event', s3EventStr)
      const s3Event = JSON.parse(s3EventStr)
  
      for (const record of s3Event.Records) {
        // "record" is an instance of S3EventRecord
        await processImage(record) // processes the image and stores the processed image in a separate S3 bucket
      }
    }
  }

async function processImage(record: S3EventRecord) {
  const key = record.s3.object.key  // Check cloudwatch logs to see how record looks like
  const imageUrl = `https://${imagesBucketName}.s3.amazonaws.com/${key}`  // construct imageUrl from the key name
  console.log('Processing S3 item with key: ', key)
  console.log("The image URL is ", imageUrl)

  // We're getting the image from the URL instead of from S3 like in the lecture
  // This is because we also need the URL to obtain the prediction results from the model endpoint

  // Resize and apply text overlay to image where the text is obtained from the model prediction
  const image = await resizeAndApplyTextOverlay(imageUrl)
  
  // Write image to processed image S3 bucket
  const convertedBuffer = await image.getBufferAsync(Jimp.AUTO)
  console.log(`Saving processed images in S3 Bucket ${imagesProcessedBucketName}`)
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
  await updateTable(key)
}

async function resizeAndApplyTextOverlay(imageUrl) {
  /* 
  
    What this does: Reads image from an URL, resizes it, applies a text overlay and returns the image as a buffer
    The text is obtained from the model prediction endpoint
    The size of the new image is fixed
  */

  // Reading image
  const image = await Jimp.read(imageUrl);
  console.log("Read image. Image has size: ", image.bitmap.width, image.bitmap.height)
  // Resize image
  image.resize(1000, Jimp.AUTO);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  console.log("Resized image. Image has size: ", width, height)
  
  // Get predictions from model endpoint which serves as the text to be overlayed
  console.log("Getting predictions from model endpoint")
  const predictionResults = await getPredictions(imageUrl)
  const breeds = predictionResults.top5
  const probabilities = predictionResults.prob5

  // Defining the text font and create the overlay with a custom color
  // The text is going to be 5 lines of "<breed> - <probability>"
  var textImage = new Jimp(width, height, 0x0);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
  for (let i = 0; i < breeds.length; i++) {
    textImage.print(font, 10, 10 + i * 20, `${breeds[i].split("_").join(" ")}: ${Math.round(probabilities[i]*10000)/100}%`);
  }
  textImage.color([{ apply: 'xor', params: ['#063970'] }])
  image.blit(textImage, 0, 0)
  
  return image
}

async function getPredictions(imageUrl: string): Promise<any> {
  console.log(`Sending image from URL ${imageUrl} to model endpoint`)
  const result = await Axios.post(modelEndpoint, {
    "url": imageUrl
  })
  console.log("Predictions obtained from model endpoint")
  console.log("Top 5 Predictions: ", result.data.top5)
  console.log("Probabilities: ", result.data.prob5)

  return result.data
}

// Update the table with the processed image URL
// We do this with a PUT operation instead of an UPDATE operation (i.e. we REPLACE instead of UPDATE)
// This is because the table is organized by groupId as the partition key and the timestamp as the sort key
// If we update the item then we would have to provide these two keys to uniquely identify the item - this is possible but not really elegant
// If we replace the item (where we leave all values intact and just update the processedImageUrl) then we can simply provide the item itself// We need to store the processed image Url in dynamodb so that the client can access it. There are multiple ways to do this.
async function updateTable(imageId: string) {

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
  console.log("Obtained item corresponding to imageId from DynamoDB: ", item)

  const processedImageUrl = `https://${imagesProcessedBucketName}.s3.amazonaws.com/${imageId}`
  console.log("Replacing table item by adding the processedImageUrl: ", processedImageUrl)
  
  const newItem = {
    ...item,
    processedImageUrl
  }

  await docClient
      .put({
        TableName: imagesTable,
        Item: newItem
  }).promise()

}

// OPTION1 (seems hacky, requires additional resource): we can create a new dynamodb table that mirrors the image table, with the difference being that the image Url is that of the processed image bucket.
// To do this we can obtain the imageId (=key) from the S3 event and use it to construct the processed image Url. Then add code here in this function to create a new record in the dynamodb table.
// (similar to createImage.ts)

// OPTION2 (probably most elegant but still requires additional resource): add a S3 Event Listener lambda handler to monitor to the processed image bucket and populate the processed image table with the URL once a new item is being added to the bucket

// OPTION3 (probably easiest): we use the existing image table, add a API Gateway lambda handler for replacing the imageURL/adding a new key for the processed image url.
// Then call this API Gateway from the frontend (or here via axios)

// Trying option 3 for now



import { SNSEvent, SNSHandler, S3EventRecord } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS from 'aws-sdk'
import Jimp from 'jimp/es'
import Axios from 'axios'

const s3 = new AWS.S3()
// const docClient = new AWS.DynamoDB.DocumentClient()
// const Axios = require('axios')

const imagesBucketName = process.env.IMAGES_S3_BUCKET
// const imagesProcessedTable = process.env.IMAGES_PROCESSED_TABLE
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
        await processImage(record) // A function that should resize each image
      }
    }
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

async function processImage(record: S3EventRecord) {
  const key = record.s3.object.key  // Check cloudwatch logs to see how record looks like
  const imageUrl = `https://${imagesBucketName}.s3.amazonaws.com/${key}`  // construct imageUrl from the key name
  console.log('Processing S3 item with key: ', key)
  console.log("The image URL is ", imageUrl)

  // We're getting the image from the URL instead of from S3 like in the lecture
  // This is because we also need the URL to obtain the prediction results from the model endpoint
  const image = await resizeAndApplyTextOverlay(imageUrl)
  
  const convertedBuffer = await image.getBufferAsync(Jimp.AUTO)
  
  console.log(`Saving processed images in S3 Bucket ${imagesProcessedBucketName}`)
  await s3.putObject({
        Bucket: imagesProcessedBucketName,
        // Key: `${key}.jpg`,
        Key: key,  // gets same key as the original image
        Body: convertedBuffer
  }).promise()
}

async function resizeAndApplyTextOverlay(imageUrl) {
  // Reads image from an URL, resizes it, applies a text overlay and returns the image as a buffer
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
  var textImage = new Jimp(width, height, 0x0);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
  for (let i = 0; i < breeds.length; i++) {
    textImage.print(font, 10, 10 + i * 20, `${breeds[i].split("_").join(" ")}: ${Math.round(probabilities[i]*10000)/100}%`);
  }
  textImage.color([{ apply: 'xor', params: ['#004595'] }])
  image.blit(textImage, 0, 0)
  
  return image
}

// We need to store the processed image Url in dynamodb so that the client can access it. There are multiple ways to do this.

// OPTION1: we can create a new dynamodb table that mirrors the image table, with the difference being that the image Url is that of the processed image bucket.
// To do this we can obtain the imageId (=key) from the S3 event and use it to construct the processed image Url. Then add code here in this function to create a new record in the dynamodb table.
// (similar to createImage.ts)

// OPTION2: add a S3 Event Listener lambda handler to monitor to the processed image bucket and update the image table with the new processed image URL once a new item is being added to the bucket

// OPTION3: we use the existing image table, add a API Gateway lambda handler for replacing the imageURL/adding a new key for the processed image url.
// Then call this API Gateway from the frontend (or here via axios)

// Trying option 3 for now



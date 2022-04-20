import { SNSEvent, SNSHandler, S3EventRecord } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS from 'aws-sdk'
import Jimp from 'jimp/es'

const s3 = new AWS.S3()
const axios = require('axios')

const imagesBucketName = process.env.IMAGES_S3_BUCKET
const processedImagesBucketName = process.env.IMAGES_PROCESSED_S3_BUCKET
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
  const result = await axios.post(modelEndpoint, {
    "url": imageUrl
  })
  console.log("Predictions obtained from model endpoint")
  console.log("Top 5 Predictions: ", result.data.top5)
  console.log("Probabilities: ", result.data.prob5)

  return result.data
}

async function resizeAndApplyTextOverlay(imageUrl) {
  // Reads image from an URL, resizes it, applies a text overlay and returns the image as a buffer
  // Reading image
  const image = await Jimp.read(imageUrl);
  console.log("Read image. Image has size: ", image.bitmap.width, image.bitmap.height)
  image.resize(600, Jimp.AUTO);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  console.log("Resized image. Image has size: ", width, height)
  var textImage = new Jimp(width, height, 0x0);

  // Get predictions from model endpoint which serves as the text to be overlayed
  console.log("Getting predictions from model endpoint")
  const predictionResults = await getPredictions(imageUrl)
  const breeds = predictionResults.top5
  const probabilities = predictionResults.prob5

  // Defining the text font and create the overlay with a custom color
  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
  for (let i = 0; i < breeds.length; i++) {
    textImage.print(font, 10, 10 + i * 20, `${breeds[i].split("_").join(" ")}: ${Math.round(probabilities[i]*10000)/100}%`);
  }
  textImage.color([{ apply: 'xor', params: ['#004595'] }])
  image.blit(textImage, 0, 0)
  
  return image
}

async function processImage(record: S3EventRecord) {
    const key = record.s3.object.key  // Check cloudwatch logs to see how record looks like
    const imageUrl = `https://${imagesBucketName}.s3.amazonaws.com/${key}`  // construct imageUrl from the key name
    console.log('Processing S3 item with key: ', key)
    console.log("The image URL is ", imageUrl)

    // get image from S3 (could also get it via a GET request from the imageUrl using axios?)
    // const response = await s3.getObject({
    //       Bucket: imagesBucketName,
    //       Key: key
    // }).promise()
    
  
    // process image

    // const body = response.Body
    // console.log('Resizing image now')
    
    // const image = await Jimp.read(body)
    // image.resize(512, Jimp.AUTO)
    // textOverlay(image, top5, prob5)

    // We're getting the image from the URL instead since we also need the URL to obtain the prediction results from the model endpoint
    const image = await resizeAndApplyTextOverlay(imageUrl)
    
    const convertedBuffer = await image.getBufferAsync(Jimp.AUTO)
    
    console.log(`Saving processed images in S3 Bucket ${processedImagesBucketName}`)
    await s3.putObject({
          Bucket: processedImagesBucketName,
          Key: `${key}.jpg`,
          Body: convertedBuffer
    }).promise()
}


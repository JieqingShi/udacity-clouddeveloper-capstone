import { SNSEvent} from 'aws-lambda'
import 'source-map-support/register'
import * as middy from 'middy'
import { cors, httpErrorHandler } from 'middy/middlewares'
import { createLogger } from '../../utils/logger'
import { createProcessedImage } from '../../businessLogic/images'

const imagesBucketName = process.env.IMAGES_S3_BUCKET
const logger = createLogger('processImageLogger')

export const handler = middy(async (event: SNSEvent) => {
    logger.info('Processing SNS event ', JSON.stringify(event))
    for (const snsRecord of event.Records) {
      const s3EventStr = snsRecord.Sns.Message
      logger.info('Processing S3 event', s3EventStr)
      const s3Event = JSON.parse(s3EventStr)
  
      for (const record of s3Event.Records) {
        const imageId = record.s3.object.key
        const imageUrl = `https://${imagesBucketName}.s3.amazonaws.com/${imageId}`
        logger.info(`Creating processed image for imageId: ${imageId} and imageUrl: ${imageUrl} - resizing the image, applying text overlay, uploading the image and updating the table`)
        await createProcessedImage(imageId, imageUrl)
      }
    }
})

handler
.use(httpErrorHandler())
.use(
  cors({
    credentials: true
  })
)

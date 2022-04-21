import { SNSEvent} from 'aws-lambda'
import 'source-map-support/register'
import * as middy from 'middy'
import { cors, httpErrorHandler } from 'middy/middlewares'
import { createLogger } from '../../utils/logger'
import { AttachmentUtils } from '../../dataLayer/attachmentUtils'
import { createProcessedImage } from '../../businessLogic/images'

const imagesBucketName = process.env.IMAGES_BUCKET
const attachmentUtils = new AttachmentUtils()
const logger = createLogger('processImageLogger')

export const handler = middy(async (event: SNSEvent) => {
    logger.info('Processing SNS event ', JSON.stringify(event))
    for (const snsRecord of event.Records) {
      const s3EventStr = snsRecord.Sns.Message
      logger.info('Processing S3 event', s3EventStr)
      const s3Event = JSON.parse(s3EventStr)
  
      for (const record of s3Event.Records) {
        // "record" is an instance of S3EventRecord
        const imageId = record.s3.object.key
        const imageUrl = attachmentUtils.getImagePublicReadUrl(imagesBucketName, imageId)
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

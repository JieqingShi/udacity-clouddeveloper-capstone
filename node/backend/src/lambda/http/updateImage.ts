import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from 'aws-lambda'
import 'source-map-support/register'
// import * as middy from 'middy'
// import { cors } from 'middy/middlewares'
import { createLogger } from '../../utils/logger'
// import { AttachmentUtils } from '../../dataLayer/attachmentUtils'
import { createProcessedImage } from '../../businessLogic/images'

const imagesBucketName = process.env.IMAGES_S3_BUCKET
const logger = createLogger('processImageLogger')


export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const imageId = event.pathParameters.imageId
    logger.info(`Processing image with id ${imageId}`)
    const imageUrl = `https://${imagesBucketName}.s3.amazonaws.com/${imageId}`
    await createProcessedImage(imageId, imageUrl) // processes the image and stores the processed image in a separate S3 bucket

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: `Processed image with id ${imageId}`
        })
    }
}

// handler
// .use(
//   cors({
//     credentials: true
//   })
// )


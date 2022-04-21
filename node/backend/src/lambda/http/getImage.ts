import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as middy from 'middy'
import { cors, httpErrorHandler } from 'middy/middlewares'
import { createLogger } from '../../utils/logger'
import { getImageById } from '../../businessLogic/images'

const logger = createLogger('getImagesLogger')

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Processing event', event)
  const imageId = event.pathParameters.imageId

  const result = await getImageById(imageId)
  return {
    statusCode: 200,
    body: JSON.stringify({
      result
    })
  }
})

handler
.use(httpErrorHandler())
.use(
  cors({
    credentials: true
  })
)

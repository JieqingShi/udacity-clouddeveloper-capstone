import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'
import { createLogger } from '../../utils/logger'
import { validateGroup } from '../../businessLogic/groups'
import { getAllImagesPerGroup } from '../../businessLogic/images'

const logger = createLogger('getImagesPerGroupLogger')

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Caller event', event)
  const groupId = event.pathParameters.groupId;

  const groupExists = await validateGroup(groupId)

  if (!groupExists) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        error: 'Group does not exist'
      })
    }
  }
  logger.info(`Group with Id ${groupId} exists`)
  const images = await getAllImagesPerGroup(groupId)
  logger.info(`Returning ${images.length} images`)

  return {
    statusCode: 200,
    body: JSON.stringify({
        items: images
    })
  }
})

handler.use(
  cors({
    credentials: true
  })
)
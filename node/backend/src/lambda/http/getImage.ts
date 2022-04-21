import { APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda'
import 'source-map-support/register'
import * as AWS  from 'aws-sdk'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'
import { createLogger } from '../../utils/logger'

const docClient = new AWS.DynamoDB.DocumentClient()
const imagesTable = process.env.IMAGES_TABLE
const imageIdIndex = process.env.IMAGE_ID_INDEX

const logger = createLogger('getImagesLogger')

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Caller event', event)
  const imageId = event.pathParameters.imageId

  const result = await docClient.query({
    TableName: imagesTable,
    IndexName: imageIdIndex,
    KeyConditionExpression: 'imageId = :imageId',
    ExpressionAttributeValues: {
        ':imageId': imageId
    }
  }).promise()

  if (result.Count !== 0) {  // there are entries corresponding to the imageId in the table (Count > 0)
      return {
          statusCode: 200,
            body: JSON.stringify(result.Items[0])
      }
  }

  // there is no image with this id
  return {
    statusCode: 404,
    body: ''
  }
})

handler.use(
  cors({
    credentials: true
  })
)

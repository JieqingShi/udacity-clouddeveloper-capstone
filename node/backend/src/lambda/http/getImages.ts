import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS  from 'aws-sdk'

const docClient = new AWS.DynamoDB.DocumentClient()

const groupsTable = process.env.GROUPS_TABLE
const imagesTable = process.env.IMAGES_TABLE

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Caller event', event)
  const groupId = event.pathParameters.groupId;

  const validGroupId = await groupExists(groupId)

  // if groupId is not valid, return 404 
  if (!validGroupId) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Group does not exist'
      })
    }
  }

  // else fetch images for this group
  const images = await getImagesPerGroup(groupId)

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    // body: ''
    body: JSON.stringify({
        items: images
    })
  }
}


async function groupExists(groupId: string) {
    const result = await docClient
      .get({
        TableName: groupsTable,
        Key: {
          id: groupId
        }
      })
      .promise()
  
    console.log('Get group: ', result)
    return !!result.Item  // !! converts to boolean; if result.Item is not null, return true (the first ! converts it to true, the second ! to false)
}


async function getImagesPerGroup(groupId: string) {
    const result = await docClient
      .query({
        TableName: imagesTable,
        KeyConditionExpression: 'groupId = :groupId',
        ExpressionAttributeValues: {
          ':groupId': groupId
        },
        ScanIndexForward: false  // reverts order of images in partition -> return latest image first
      })
      .promise()
  
    console.log('Query images: ', result)
    return result.Items
}
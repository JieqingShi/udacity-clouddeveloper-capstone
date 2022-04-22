import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { Image } from '../models/Image'

const XAWS = AWSXRay.captureAWS(AWS)

export class ImageAccess {

  constructor(
    private readonly docClient: DocumentClient = createDynamoDBClient(),
    private readonly imagesTable = process.env.IMAGES_TABLE,
    private readonly imageIdIndex = process.env.IMAGE_ID_INDEX
  ) {}

  async getAllImagesPerGroup(groupId: string): Promise<Image[]> {
    // needs authentication with userId in business logic
    console.log(`Getting all images from group ${groupId}`)
    const result = await this.docClient
      .query({
        TableName: this.imagesTable,
        KeyConditionExpression: 'groupId = :groupId',
        ExpressionAttributeValues: {
          ':groupId': groupId
        },
        ScanIndexForward: false  // reverts order of images in partition -> return latest image first; sort key is timestamp
      })
      .promise()
  
    return result.Items as Image[]
  }

  async getImageById(imageId: string): Promise<Image> {
    const result = await this.docClient
      .query({
        TableName: this.imagesTable,
        IndexName: this.imageIdIndex,
        KeyConditionExpression: 'imageId = :imageId',
        ExpressionAttributeValues: {
          ':imageId': imageId
        }
      })
      .promise()
  
    return result.Items[0] as Image
  }

  async createImageInGroup(imageItem: Image): Promise<Image> {
    await this.docClient.put({
        TableName: this.imagesTable,
        Item: imageItem
    }).promise()

    return imageItem
  }
  
}


function createDynamoDBClient() {
  return new XAWS.DynamoDB.DocumentClient()
}

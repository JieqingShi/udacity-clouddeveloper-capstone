import * as AWS  from 'aws-sdk'
// import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

// const XAWS = AWSXRay.captureAWS(AWS)

import { Group } from '../models/Group'

export class GroupAccess {

  constructor(
    private readonly docClient: DocumentClient = createDynamoDBClient(),
    private readonly groupsTable = process.env.GROUPS_TABLE) {
  }

  async getAllGroups(): Promise<Group[]> {
    const result = await this.docClient.scan({
      TableName: this.groupsTable
    }).promise()

    const items = result.Items
    return items as Group[]
  }

  async createGroup(group: Group): Promise<Group> {
    await this.docClient.put({
      TableName: this.groupsTable,
      Item: group
    }).promise()

    return group
  }

  async groupExists(groupId: string): Promise<boolean> {
    const result = await this.docClient
    .get({
      TableName: this.groupsTable,
      Key: {
        id: groupId
      }
    })
    .promise()
    return !!result.Item
  }

}



function createDynamoDBClient() {
  return new AWS.DynamoDB.DocumentClient()
}

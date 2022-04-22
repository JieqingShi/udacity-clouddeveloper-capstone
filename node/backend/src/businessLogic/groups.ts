import * as uuid from 'uuid'
import { Group } from '../models/Group'
import { GroupAccess } from '../dataLayer/groupsAccess'
import { CreateGroupRequest } from '../requests/CreateGroupRequest'
import { createLogger } from '../utils/logger'

const groupAccess = new GroupAccess()
const logger = createLogger('groupsBusinessLogicLogger')

export async function getAllGroups(): Promise<Group[]> {
  logger.info("Getting all groups")
  return groupAccess.getAllGroups()
}

export async function createGroup(
  createGroupRequest: CreateGroupRequest,
  userId: string
): Promise<Group> {
  const itemId = uuid.v4()
  const groupItem = {
    id: itemId,
    userId: userId,
    name: createGroupRequest.name,
    description: createGroupRequest.description,
    timestamp: new Date().toISOString()
  }
  logger.info(`Creating a group with the following information: ${groupItem}`)
  return await groupAccess.createGroup(groupItem)
}

export async function validateGroup(groupId: string): Promise<boolean> {
  return await groupAccess.groupExists(groupId)
}

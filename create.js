import uuid from 'uuid';
import AWS from 'aws-sdk';
import * as dynamoDbLib from './libs/dynamodb-lib';
import { success, failure } from './libs/response-lib';

/* This code now handled by `dynamoDbLib`
AWS.config.update({ region: "us-east-1" });
const dynamoDb = new AWS.DynamoDB.DocumentClient();
*/

export const main = async (event, context, callback) => {
  console.log("event: ", event);
  // Request body is passed in as a JSON encoded string in 'event.body'
  const data = JSON.parse(event.body);
  console.log("data: ", data);

  const params = {
    TableName: "notes",
    // 'Item' contains the attributes of the item to be created
    // - 'userId': user identities are federated through the
    //             Cognito Identity Pool, we will use the identity id
    //             as the user id of the authenticated user
    // - 'noteId': a unique uuid
    // - 'content': parsed from request body
    // - 'attachment': parsed from request body
    // - 'createdAt': current Unix timestamp
    Item: {
      userId: event.requestContext.identity.cognitoIdentityId,
      noteId: uuid.v1(),
      content: data.content,
      attachment: data.attachment,
      createdAt: new Date().getTime()
    }
  };

  try {
    await dynamoDbLib.call('put', params);
    callback(null, success(params.Item));
  } catch (err) {
    console.log("err: ", err);
    callback(null, failure({ status: false }));
  }

  /* this is now handled by `response-lib`
  dynamoDb.put(params, (error, data) => {
    // Set response headers to enable CORS (Cross-Origin Resource Sharing)
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true
    };

    // Return status code 500 on error
    if (error) {
      const response = {
        statusCode: 500,
        headers: headers,
        body: JSON.stringify({ status: false })
      };
      callback(null, response);
      return;
    }

    // Return status code 200 and the newly created item
    const response = {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(params.Item)
    };
    callback(null, response);
  });
  */
}
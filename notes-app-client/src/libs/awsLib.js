import { CognitoUserPool } from "amazon-cognito-identity-js";
import AWS from "aws-sdk";

import config from "../config";
import sigV4Client from "./sigV4Client";

export async function authUser() {
  /* Check if credentials already exist */
  if (
    AWS.config.credentials &&
    Date.now() < AWS.config.credentials.expireTime - 60000
  ) {
    return true;
  }

  /* If no credentials, then get Current User */
  const currentUser = getCurrentUser();

  if (currentUser === null) {
    return false;
  }

  const userToken = await getUserToken(currentUser);

  // Now we are actually check for AWS credentials
  await getAwsCredentials(userToken);

  return true;
}

function getUserToken(currentUser) {
  return new Promise((resolve, reject) => {
    currentUser.getSession(function(err, session) {
      if (err) {
        reject(err);
        return;
      }
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

function getCurrentUser() {
  const userPool = new CognitoUserPool({
    UserPoolId: config.cognito.USER_POOL_ID,
    ClientId: config.cognito.APP_CLIENT_ID
  });
  return userPool.getCurrentUser();
}

function getAwsCredentials(userToken) {
  const authenticator = `cognito-idp.${config.cognito.REGION}.amazonaws.com/${config.cognito.USER_POOL_ID}`;

  AWS.config.update({ region: config.cognito.REGION });

  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: config.cognito.IDENTITY_POOL_ID,
    Logins: {
      [authenticator]: userToken
    }
  });

  return AWS.config.credentials.getPromise();
}

export function signOutUser() {
  const currentUser = getCurrentUser();

  if (currentUser !== null) {
    currentUser.signOut();
  }

  if (AWS.config.credentials) {
    AWS.config.credentials.clearCachedId();
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({});
  }
}

/* Helper function to create signed request to AWS API Gateway 
** 1. Ensure user is authenticated; generate temporary credentials.
** 2. Use sigV4Client to sign the request.
** 3. Use signed headers to make an HTTP fetch request.
*/
export async function invokeApig({
  path,
  method = "GET",
  headers = {},
  queryParams = {},
  body
}) {
  if (!await authUser()) {
    throw new Error("User is not logged in");
  }

  const signedRequest = sigV4Client
    .newClient({
      accessKey: AWS.config.credentials.accessKeyId,
      secretKey: AWS.config.credentials.secretAccessKey,
      sessionToken: AWS.config.credentials.sessionToken,
      region: config.apiGateway.REGION,
      endpoint: config.apiGateway.URL
    })
    .signRequest({
      method,
      path,
      headers,
      queryParams,
      body
    });

  body = body ? JSON.stringify(body) : body;
  headers = signedRequest.headers;

  const results = await fetch(signedRequest.url, {
    method,
    headers,
    body
  });

  if (results.status !== 200) {
    throw new Error(await results.text());
  }

  return results.json();
}

/*
** 1. It takes a file object as a parameter.
** 2. Generates a unique file name prefixed with the identityId. This is necessary to secure the files on a per-user basis.
** 3. Upload the file to S3 and set its permissions to public-read to ensure that we can download it later.
** 4. Return a Promise object.
*/
export async function s3Upload(file) {
  if (!await authUser()) {
    console.log("User not authenticated.")
    throw new Error("User is not logged in");
  }

  const s3 = new AWS.S3({
    params: {
      Bucket: config.s3.BUCKET
    }
  });

  const filename = `${AWS.config.credentials.identityId}-${Date.now()}-${file.name}`;
  console.log(`filename: ${filename}`);

  return s3
    .upload({
      Key: filename,
      Body: file,
      ContentType: file.type,
      ACL: "public-read"
    })
    .promise();
}

export default {
	MAX_ATTACHMENT_SIZE: 5000000,
  s3: {
  	BUCKET: "notes-app-api-prod-serverlessdeploymentbucket-vs69cit0q0v2"
  },
  apiGateway: {
	  URL: "https://mf7w52e5v2.execute-api.us-east-1.amazonaws.com/prod",
	  REGION: "us-east-1"
	},
	cognito: {
    REGION: "us-east-1",
		IDENTITY_POOL_ID: "us-east-1:8ed8a40b-6381-4f6c-9d2b-88228c3b21df",
		USER_POOL_ID: "us-east-1_Qve95Exyi",
    APP_CLIENT_ID: "34bqmiqcsc8lv2vcmjb9dg9f88"
  }
};
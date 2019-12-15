# Rocket Chat Multi Server Skill

Rocket.Chat Alexa skill that works as client for multiple servers

## Hosting Proxy Server

1. Until we have UI ready on Rocket chat, You can test this skill by hosting [server](https://github.com/RocketChat/vui-multiservers-proxy) on Heroku or any hosting service of your choice.

2. After server is up and running you can use Postman or CURL as per your choice to send Servername, ServerURL, UserID and Token and get a pincode. To generate UserID and Token go to Rocket Chat => My Account => Personal Access Token. Header Syntax can be found [here](https://github.com/RocketChat/vui-multiservers-proxy#to-register-user)

## Deploying Skill

1. Clone the repository

    `git clone https://github.com/RocketChat/alexa-rc-multiserver-client`
 
2. Go To Root Directory,

    `cd alexa-rc-multiserver-client`

3. Deploy Skill,

    `ask deploy`
    
## Creating Database

1. After deploying skill, goto [DynamoDB](https://console.aws.amazon.com/dynamodb/home?region=us-east-1) and click on Create Table

2. Give A Table name. For Primary Key use 'userID' as key name.

3. Click on Add sort key, and give 'server' as key name.

4. Click on Create

## Giving Lambda Environment Variables

1. Once the table is ready, go to your lambda function and give the following values:

    **DDB_NAME** : Your DynamoDB Table Name
    **MULTISERVERPROXY_URL** : Your Proxy Server URL

* Example Config:

![screen](https://user-images.githubusercontent.com/41849970/61810502-04f70580-ae5d-11e9-95b0-362b942f2965.png)

## Grant Lambda Function Permission to access DynamoDB Table

1. Open your lambda function and go to **Execution role** Section.

2. Open the  `View the ask-lambda-Rocket-Chat role`  link as shown below, this will open your IAM console.

![dynamodb-iam](https://user-images.githubusercontent.com/21988675/70864586-7143e400-1f79-11ea-8b22-b644fb49086d.png)

3. Go to **Permissions policies** and click on **Attach policies**.

4. Click on the search box and search **dynamodb** and select the **AmazonDynamoDBFullAccess** Policy and click on **Attach policy**.

5. The permission policies tab should now look like the following :-

![permissions](https://user-images.githubusercontent.com/21988675/70864754-3347bf80-1f7b-11ea-9d3e-57049e6d0a2f.png)

## Testing Skill

1. To Add a server say : **Alexa, Add Server** followed by pincode generated in the proxy server request.

2. To Switch a Server : **Alexa, Switch Server** followed by servername you provided.

3. Currently this skill supports only PostMessageIntent and GetLastMessageIntent. Also don't use keyword *Alexa* as a channelname or in utterances as it will not work.

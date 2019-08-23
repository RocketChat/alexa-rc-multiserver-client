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

## Testing Skill

1. To Add a server say : **Alexa, Add Server** followed by pincode generated in the proxy server request.

2. To Switch a Server : **Alexa, Switch Server** followed by servername you provided.

3. Currently this skill supports only PostMessageIntent and GetLastMessageIntent. Also don't use keyword *Alexa* as a channelname or in utterances as it will not work.


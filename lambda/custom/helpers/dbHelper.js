const AWS = require('aws-sdk');
AWS.config.update({
	region: 'us-east-1',
});
const envVariables = require('../config');
const tableName = envVariables.dynamoDBTableName;
const Jargon = require('@jargon/alexa-skill-sdk');
const {
	ri,
} = Jargon;

const docClient = new AWS.DynamoDB.DocumentClient();

module.exports = {

	async postData(servername, userID, udata) {

		const params = {
			TableName: tableName,
			Item: {
				server: servername,
				userID,
				data: udata,
			},
		};

		const result = await docClient.put(params).promise();

		console.log(result);

		return ri('SERVER.SUCCESS');

	},

	async isValid(userID, servername) {

		const params = {
			TableName: tableName,
			Key: {
				userID,
				server: servername,
			},
		};

		let exists = false;

		const result = await docClient.get(params).promise();
		console.log(result);

		if (result.Item !== undefined && result.Item !== null) {
			exists = true;
		}

		return (exists);

	},

	async readData(userID, servername) {

		const params = {
			TableName: tableName,
			Key: {
				userID,
				server: servername,
			},
		};

		const result = await docClient.get(params).promise();
		console.log('READ DATA', result);

		return {
			headers: result.Item.data.headers,
			serverurl: result.Item.data.serverurl,
		};

	},

	async getAllServerData(userID, servername) {

		const params = {
			TableName: tableName,
			Key: {
				userID,
				server: servername,
			},
		};

		const result = await docClient.get(params).promise();
		console.log('ALL SERVER DATA', result);

		return result;

	},



};

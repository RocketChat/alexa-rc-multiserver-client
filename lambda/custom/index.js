/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const JSON = require('circular-json');
const helperFunctions = require('./helperFunctions');
const dbHelper = require('./helpers/dbHelper');
const envVariables = require('./config');
const layouts = require('./APL/layouts');

// Jargon for Localization
const Jargon = require('@jargon/alexa-skill-sdk');
const {
	ri,
} = Jargon;

// APL Compaitability Checker Function

function supportsAPL(handlerInput) {
	const {
		supportedInterfaces,
	} = handlerInput.requestEnvelope.context.System.device;
	const aplInterface = supportedInterfaces['Alexa.Presentation.APL'];
	return aplInterface != null && aplInterface !== undefined;
}

function supportsDisplay(handlerInput) {
	const hasDisplay =
		handlerInput.requestEnvelope.context &&
		handlerInput.requestEnvelope.context.System &&
		handlerInput.requestEnvelope.context.System.device &&
		handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
		handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display;
	return hasDisplay;
}

// Intents For DynamoDB

const AddServerIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'AddServerIntent';
	},
	async handle(handlerInput) {

		const userID = handlerInput.requestEnvelope.context.System.user.userId;
		const code = handlerInput.requestEnvelope.request.intent.slots.pincode.value;
		const data = await helperFunctions.getData(code);

		const {
			status,
		} = data;

		if (status === true) {

			const {
				servername,
			} = data;
			const udata = data.userdata;

			const checkdata = await dbHelper.isValid(userID, 'current_server');

			if (checkdata === true) {

				// CURRENT_SERVER EXISTS IN DYNAMODB

				const speechText = await dbHelper.postData(servername, userID, udata);

				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.getResponse();

			} else {

				// CURRENT_SERVER DOES NOT EXISTS IN DYNAMODB


				await dbHelper.postData('current_server', userID, udata);
				const speechText = await dbHelper.postData(servername, userID, udata);

				const serverData = await dbHelper.readData(userID, 'current_server');
				const {
					headers,
					serverurl,
				} = serverData;

				const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
				sessionAttributes.headers = headers;
				sessionAttributes.serverurl = serverurl;
				handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.getResponse();

			}


		} else {

			const speechText = ri('SERVER.ERROR');

			return handlerInput.jrb
				.speak(speechText)
				.reprompt(speechText)
				.getResponse();


		}

	},
};

const SwitchServerIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'SwitchServerIntent';
	},
	async handle(handlerInput) {

		const userID = handlerInput.requestEnvelope.context.System.user.userId;
		const servername = handlerInput.requestEnvelope.request.intent.slots.servername.value;

		const checkserver = await dbHelper.isValid(userID, servername);

		if (checkserver === false) {

			const speechText = ri('SERVER.SWAP_ERROR', {
				servername,
			});

			return handlerInput.jrb
				.speak(speechText)
				.reprompt(speechText)
				.getResponse();

		} else {

			const serverdata = await dbHelper.getAllServerData(userID, servername);
			const udata = serverdata.Item.data;
			await dbHelper.postData('current_server', userID, udata);

			const serverData = await dbHelper.readData(userID, 'current_server');
			const {
				headers,
				serverurl,
			} = serverData;

			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
			sessionAttributes.headers = headers;
			sessionAttributes.serverurl = serverurl;
			handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

			const speechText = ri('SERVER.SWAP_SUCCESS');

			return handlerInput.jrb
				.speak(speechText)
				.reprompt(speechText)
				.getResponse();

		}
	},
};

// Main Intents

const LaunchRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
	},
	async handle(handlerInput) {

		const userID = handlerInput.requestEnvelope.context.System.user.userId;
		const checkdata = await dbHelper.isValid(userID, 'current_server');

		if (checkdata === true) {

			const serverData = await dbHelper.readData(userID, 'current_server');
			const {
				headers,
				serverurl,
			} = serverData;

			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
			sessionAttributes.headers = headers;
			sessionAttributes.serverurl = serverurl;
			handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

			const speechText = ri('WELCOME.SUCCESS');

			if (supportsAPL(handlerInput)) {

				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.addDirective({
						type: 'Alexa.Presentation.APL.RenderDocument',
						version: '1.0',
						document: layouts.homePageLayout,
						datasources: {
							RCHomePageData: {
								type: 'object',
								objectId: 'rcHomePage',
								backgroundImage: {
									contentDescription: null,
									smallSourceUrl: null,
									largeSourceUrl: null,
									sources: [{
										url: 'https://user-images.githubusercontent.com/41849970/60758741-64b97800-a038-11e9-9798-45b3b8a89b31.png',
										size: 'small',
										widthPixels: 0,
										heightPixels: 0,
									},
									{
										url: 'https://user-images.githubusercontent.com/41849970/60758741-64b97800-a038-11e9-9798-45b3b8a89b31.png',
										size: 'large',
										widthPixels: 0,
										heightPixels: 0,
									},
									],
								},
								textContent: {
									primaryText: {
										type: 'PlainText',
										text: 'Welcome to Rocket.Chat',
									},
								},
								logoUrl: 'https://github.com/RocketChat/Rocket.Chat.Artwork/raw/master/Logos/icon-circle-1024.png',
								hintText: 'Try, "Alexa, send a message"',
							},
						},
					})
					.getResponse();
			} else {
				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.withSimpleCard(ri('WELCOME.SUCCESS'), speechText)
					.getResponse();
			}

		} else {
			const speechText = ri('WELCOME.NO_SERVER_FOUND');

			if (supportsAPL(handlerInput)) {

				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.addDirective({
						type: 'Alexa.Presentation.APL.RenderDocument',
						version: '1.0',
						document: layouts.authorisationErrorLayout,
						datasources: {
							AuthorisationErrorPageData: {
								type: 'object',
								objectId: 'rcAuthorisation',
								backgroundImage: {
									contentDescription: null,
									smallSourceUrl: null,
									largeSourceUrl: null,
									sources: [{
										url: 'https://user-images.githubusercontent.com/41849970/60644955-126c3180-9e55-11e9-9147-7820655f3c0b.png',
										size: 'small',
										widthPixels: 0,
										heightPixels: 0,
									},
									{
										url: 'https://user-images.githubusercontent.com/41849970/60644955-126c3180-9e55-11e9-9147-7820655f3c0b.png',
										size: 'large',
										widthPixels: 0,
										heightPixels: 0,
									},
									],
								},
								textContent: {
									primaryText: {
										type: 'PlainText',
										text: 'MOTHERBASE NOT FOUND',
									},
									secondaryText: {
										type: 'PlainText',
										text: 'To start using this skill, please add a server by saying, "Alexa, Add A Server" or say , "Alexa, Help" for help',
									},
								},
								logoUrl: 'https://github.com/RocketChat/Rocket.Chat.Artwork/raw/master/Logos/icon-circle-1024.png',
							},
						},
					})
					.getResponse();
			} else {
				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.withSimpleCard(ri('WELCOME.NO_SERVER_FOUND'), speechText)
					.getResponse();
			}
		}

	},
};

const StartedCreateChannelIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'CreateChannelIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'STARTED';
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent;
		return handlerInput.responseBuilder
			.addDelegateDirective(currentIntent)
			.getResponse();
	},
};

const InProgressCreateChannelIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'CreateChannelIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'IN_PROGRESS' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus !== 'DENIED';
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent;
		return handlerInput.responseBuilder
			.addDelegateDirective(currentIntent)
			.getResponse();
	},
};

const DeniedCreateChannelIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'CreateChannelIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'IN_PROGRESS' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED';
	},
	handle(handlerInput) {
		const speechText = ri('CREATE_CHANNEL.DENIED');

		return handlerInput.jrb
			.speak(speechText)
			.addDelegateDirective({
				name: 'CreateChannelIntent',
				confirmationStatus: 'NONE',
				slots: {
					channelname: {
						name: 'channelname',
						confirmationStatus: 'NONE',
					},
				},
			})
			.getResponse();
	},
};

const CreateChannelIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'CreateChannelIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'COMPLETED' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus === 'CONFIRMED';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.channelname.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const speechText = await helperFunctions.createChannel(channelName, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			if (supportsAPL(handlerInput)) {

				return handlerInput.jrb
					.speak(speechText)
					.speak(repromptText)
					.reprompt(repromptText)
					.addDirective({
						type: 'Alexa.Presentation.APL.RenderDocument',
						version: '1.0',
						document: layouts.createChannelLayout,
						datasources: {

							CreateChannelPageData: {
								type: 'object',
								objectId: 'rcCreateChannel',
								backgroundImage: {
									contentDescription: null,
									smallSourceUrl: null,
									largeSourceUrl: null,
									sources: [{
										url: 'https://user-images.githubusercontent.com/41849970/60651516-fcb23880-9e63-11e9-8efb-1e590a41489e.png',
										size: 'small',
										widthPixels: 0,
										heightPixels: 0,
									},
									{
										url: 'https://user-images.githubusercontent.com/41849970/60651516-fcb23880-9e63-11e9-8efb-1e590a41489e.png',
										size: 'large',
										widthPixels: 0,
										heightPixels: 0,
									},
									],
								},
								textContent: {
									placeholder: {
										type: 'PlainText',
										text: 'Channel',
									},
									channelname: {
										type: 'PlainText',
										text: `#${ speechText.params.channelName }`,
									},
									successful: {
										type: 'PlainText',
										text: 'created successfully.',
									},
								},
								logoUrl: 'https://github.com/RocketChat/Rocket.Chat.Artwork/raw/master/Logos/icon-circle-1024.png',
							},

						},
					})
					.getResponse();

			} else {

				return handlerInput.jrb
					.speak(speechText)
					.speak(repromptText)
					.reprompt(repromptText)
					.withSimpleCard(ri('CREATE_CHANNEL.CARD_TITLE'), speechText)
					.getResponse();

			}

		} catch (error) {
			console.error(error);
		}
	},
};

const StartedDeleteChannelIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'DeleteChannelIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'STARTED';
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent;
		return handlerInput.responseBuilder
			.addDelegateDirective(currentIntent)
			.getResponse();
	},
};

const InProgressDeleteChannelIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'DeleteChannelIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'IN_PROGRESS' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus !== 'DENIED';
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent;
		return handlerInput.responseBuilder
			.addDelegateDirective(currentIntent)
			.getResponse();
	},
};

const DeniedDeleteChannelIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'DeleteChannelIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'IN_PROGRESS' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED';
	},
	handle(handlerInput) {
		const speechText = ri('DELETE_CHANNEL.DENIED');

		return handlerInput.jrb
			.speak(speechText)
			.addDelegateDirective({
				name: 'DeleteChannelIntent',
				confirmationStatus: 'NONE',
				slots: {
					channeldelete: {
						name: 'channeldelete',
						confirmationStatus: 'NONE',
					},
				},
			})
			.getResponse();
	},
};

const DeleteChannelIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'DeleteChannelIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'COMPLETED' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus === 'CONFIRMED';
	},
	async handle(handlerInput) {
		try {

			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.channeldelete.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const speechText = await helperFunctions.deleteChannel(channelName, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			if (supportsAPL(handlerInput)) {

				return handlerInput.jrb
					.speak(speechText)
					.speak(repromptText)
					.reprompt(repromptText)
					.addDirective({
						type: 'Alexa.Presentation.APL.RenderDocument',
						version: '1.0',
						document: layouts.deleteChannelLayout,
						datasources: {

							DeleteChannelPageData: {
								type: 'object',
								objectId: 'rcDeleteChannel',
								backgroundImage: {
									contentDescription: null,
									smallSourceUrl: null,
									largeSourceUrl: null,
									sources: [{
										url: 'https://user-images.githubusercontent.com/41849970/60651516-fcb23880-9e63-11e9-8efb-1e590a41489e.png',
										size: 'small',
										widthPixels: 0,
										heightPixels: 0,
									},
									{
										url: 'https://user-images.githubusercontent.com/41849970/60651516-fcb23880-9e63-11e9-8efb-1e590a41489e.png',
										size: 'large',
										widthPixels: 0,
										heightPixels: 0,
									},
									],
								},
								textContent: {
									placeholder: {
										type: 'PlainText',
										text: 'Channel',
									},
									channelname: {
										type: 'PlainText',
										text: `#${ speechText.params.channelName }`,
									},
									successful: {
										type: 'PlainText',
										text: 'deleted successfully.',
									},
								},
								logoUrl: 'https://github.com/RocketChat/Rocket.Chat.Artwork/raw/master/Logos/icon-circle-1024.png',
							},

						},
					})
					.getResponse();

			} else {

				return handlerInput.jrb
					.speak(speechText)
					.speak(repromptText)
					.reprompt(repromptText)
					.withSimpleCard(ri('DELETE_CHANNEL.CARD_TITLE'), speechText)
					.getResponse();

			}

		} catch (error) {
			console.error(error);
		}
	},
};



const StartedPostMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostMessageIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'STARTED';
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent;
		return handlerInput.responseBuilder
			.addDelegateDirective(currentIntent)
			.getResponse();
	},
};

const InProgressPostMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostMessageIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'IN_PROGRESS' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus !== 'DENIED';
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent;
		return handlerInput.responseBuilder
			.addDelegateDirective(currentIntent)
			.getResponse();
	},
};

const DeniedPostMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostMessageIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'IN_PROGRESS' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED';
	},
	handle(handlerInput) {
		const speechText = ri('POST_MESSAGE.DENIED');

		return handlerInput.jrb
			.speak(speechText)
			.addDelegateDirective({
				name: 'PostMessageIntent',
				confirmationStatus: 'NONE',
				slots: {
					messagechannel: {
						name: 'messagechannel',
						confirmationStatus: 'NONE',
					},
					messagepost: {
						name: 'messagepost',
						confirmationStatus: 'NONE',
					},
				},
			})
			.getResponse();
	},
};

const PostMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostMessageIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'COMPLETED' &&
			handlerInput.requestEnvelope.request.intent.confirmationStatus === 'CONFIRMED';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const message = handlerInput.requestEnvelope.request.intent.slots.messagepost.value;
			const channelNameData = helperFunctions.getStaticAndDynamicSlotValuesFromSlot(handlerInput.requestEnvelope.request.intent.slots.messagechannel);
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const speechText = await helperFunctions.postMessage(channelName, message, headers, serverurl);

			if (supportsAPL(handlerInput)) {

				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.addDirective({
						type: 'Alexa.Presentation.APL.RenderDocument',
						version: '1.0',
						document: layouts.postMessageLayout,
						datasources: {

							PostMessageData: {
								type: 'object',
								objectId: 'rcPostMessage',
								backgroundImage: {
									contentDescription: null,
									smallSourceUrl: null,
									largeSourceUrl: null,
									sources: [{
										url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
										size: 'small',
										widthPixels: 0,
										heightPixels: 0,
									},
									{
										url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
										size: 'large',
										widthPixels: 0,
										heightPixels: 0,
									},
									],
								},
								textContent: {
									channelname: {
										type: 'PlainText',
										text: `#${ channelName }`,
									},
									message: {
										type: 'PlainText',
										text: message,
									},
								},
								logoUrl: 'https://github.com/RocketChat/Rocket.Chat.Artwork/raw/master/Logos/icon-circle-1024.png',
							},

						},
					})
					.getResponse();

			} else {

				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.withSimpleCard(ri('POST_MESSAGE.CARD_TITLE'), speechText)
					.getResponse();

			}

		} catch (error) {
			console.error(error);
		}
	},
};

const StartedPostLongMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostLongMessageIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'STARTED';
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent;
		return handlerInput.responseBuilder
			.addDelegateDirective(currentIntent)
			.getResponse();
	},
};

const InProgressPostLongMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostLongMessageIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'IN_PROGRESS';
	},
	handle(handlerInput) {
		const currentIntent = handlerInput.requestEnvelope.request.intent;
		return handlerInput.responseBuilder
			.addDelegateDirective(currentIntent)
			.getResponse();
	},
};

const PostLongMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostLongMessageIntent' &&
			handlerInput.requestEnvelope.request.dialogState === 'COMPLETED';
	},
	async handle(handlerInput) {
		const {
			attributesManager,
		} = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes() || {};

		try {

			const message = handlerInput.requestEnvelope.request.intent.slots.longmessage.value;
			if (sessionAttributes.hasOwnProperty('message')) {
				sessionAttributes.message += `, ${ message }`;
			} else {
				sessionAttributes.message = message;
			}

			if (!sessionAttributes.hasOwnProperty('channelName')) {
				const channelNameData = helperFunctions.getStaticAndDynamicSlotValuesFromSlot(handlerInput.requestEnvelope.request.intent.slots.channelname);
				const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);
				sessionAttributes.channelName = channelName;
			}

			return handlerInput.jrb
				.speak(ri('POST_MESSAGE.ASK_MORE'))
				.reprompt(ri('POST_MESSAGE.ASK_MORE'))
				.withSimpleCard(ri('POST_MESSAGE.CARD_TITLE'), ri('POST_MESSAGE.ASK_MORE'))
				.getResponse();

		} catch (error) {
			console.error(error);
		}
	},
};


const YesIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';
	},
	handle(handlerInput) {

		const {
			attributesManager,
		} = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes() || {};

		return handlerInput.jrb
			.speak(ri('POST_MESSAGE.CONFIRM_MORE'))
			.reprompt(ri('POST_MESSAGE.CONFIRM_MORE_REPROMPT'))
			.addElicitSlotDirective('longmessage', {
				name: 'PostLongMessageIntent',
				confirmationStatus: 'NONE',
				slots: {
					channelname: {
						name: 'channelname',
						value: sessionAttributes.channelName,
						confirmationStatus: 'NONE',
					},
					longmessage: {
						name: 'longmessage',
						confirmationStatus: 'NONE',
					},
				},
			})
			.getResponse();
	},
};


const NoIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
	},
	async handle(handlerInput) {

		try {

			const {
				attributesManager,
			} = handlerInput;
			const sessionAttributes = attributesManager.getSessionAttributes() || {};

			const {
				headers,
				serverurl,
				channelName,
				message,
			} = sessionAttributes;

			delete sessionAttributes.channelName;
			delete sessionAttributes.message;

			const speechText = await helperFunctions.postMessage(channelName, message, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');


			if (supportsAPL(handlerInput)) {

				return handlerInput.jrb
					.speak(speechText)
					.speak(repromptText)
					.reprompt(repromptText)
					.addDirective({
						type: 'Alexa.Presentation.APL.RenderDocument',
						version: '1.0',
						document: layouts.postMessageLayout,
						datasources: {

							PostMessageData: {
								type: 'object',
								objectId: 'rcPostMessage',
								backgroundImage: {
									contentDescription: null,
									smallSourceUrl: null,
									largeSourceUrl: null,
									sources: [{
										url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
										size: 'small',
										widthPixels: 0,
										heightPixels: 0,
									},
									{
										url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
										size: 'large',
										widthPixels: 0,
										heightPixels: 0,
									},
									],
								},
								textContent: {
									channelname: {
										type: 'PlainText',
										text: `#${ channelName }`,
									},
									message: {
										type: 'PlainText',
										text: message,
									},
								},
								logoUrl: 'https://github.com/RocketChat/Rocket.Chat.Artwork/raw/master/Logos/icon-circle-1024.png',
							},

						},
					})
					.getResponse();

			} else {
				return handlerInput.jrb
					.speak(speechText)
					.speak(repromptText)
					.reprompt(repromptText)
					.withSimpleCard(ri('POST_MESSAGE.CARD_TITLE'), speechText)
					.getResponse();
			}

		} catch (error) {
			console.error(error);
		}
	},
};

const PostEmojiMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostEmojiMessageIntent';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.messagechannel.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);
			const emojiData = handlerInput.requestEnvelope.request.intent.slots.emoji.value;
			const emoji = helperFunctions.emojiTranslateFunc(emojiData);
			const messageData = handlerInput.requestEnvelope.request.intent.slots.messagepost.value;
			const message = messageData + emoji;

			const speechText = await helperFunctions.postMessage(channelName, message, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('POST_MESSAGE.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};


const GetLastMessageFromChannelIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'GetLastMessageFromChannelIntent';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.getmessagechannelname.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const messageType = await helperFunctions.getLastMessageType(channelName, headers, serverurl);

			if (supportsAPL(handlerInput)) {

				if (messageType === 'textmessage') {

					const speechText = await helperFunctions.channelLastMessage(channelName, headers, serverurl);

					return handlerInput.jrb
						.speak(speechText)
						.reprompt(speechText)
						.addDirective({
							type: 'Alexa.Presentation.APL.RenderDocument',
							version: '1.0',
							document: layouts.lastMessageLayout,
							datasources: {

								lastMessageData: {
									type: 'object',
									objectId: 'rcPostMessage',
									backgroundImage: {
										contentDescription: null,
										smallSourceUrl: null,
										largeSourceUrl: null,
										sources: [{
											url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
											size: 'small',
											widthPixels: 0,
											heightPixels: 0,
										},
										{
											url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
											size: 'large',
											widthPixels: 0,
											heightPixels: 0,
										},
										],
									},
									textContent: {
										username: {
											type: 'PlainText',
											text: speechText.params.name,
										},
										message: {
											type: 'PlainText',
											text: speechText.params.message,
										},
									},
									logoUrl: 'https://github.com/RocketChat/Rocket.Chat.Artwork/raw/master/Logos/icon-circle-1024.png',
								},
							},
						})
						.getResponse();

				} else if (messageType.includes('image')) {

					const fileurl = await helperFunctions.getLastMessageFileURL(channelName, headers, serverurl);
					const download = await helperFunctions.getLastMessageFileDowloadURL(fileurl, headers);
					const messageData = await helperFunctions.channelLastMessage(channelName, headers, serverurl);
					const speechText = `${ messageData.params.name } sent you an image message.`;


					return handlerInput.responseBuilder
						.speak(speechText)
						.reprompt(speechText)
						.addDirective({
							type: 'Alexa.Presentation.APL.RenderDocument',
							version: '1.0',
							document: layouts.lastMessageImageLayout,
							datasources: {

								lastMessageData: {
									type: 'object',
									objectId: 'rcLastImageMessage',
									backgroundImage: {
										sources: [{
											url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
											size: 'small',
											widthPixels: 0,
											heightPixels: 0,
										},
										{
											url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
											size: 'large',
											widthPixels: 0,
											heightPixels: 0,
										},
										],
									},
									messageContent: {
										image: {
											url: download,
										},
										username: {
											type: 'PlainText',
											text: messageData.params.name,
										},
									},
									logoUrl: 'https://github.com/RocketChat/Rocket.Chat.Artwork/raw/master/Logos/icon-circle-1024.png',
								},
							},
						})
						.getResponse();

				} else if (messageType.includes('video')) {

					const fileurl = await helperFunctions.getLastMessageFileURL(channelName, headers, serverurl);
					const download = await helperFunctions.getLastMessageFileDowloadURL(fileurl, headers);
					const speechText = await helperFunctions.channelLastMessage(channelName, headers, serverurl);


					return handlerInput.jrb
						.speak(speechText)
						.reprompt(speechText)
						.addDirective({
							type: 'Alexa.Presentation.APL.RenderDocument',
							version: '1.0',
							document: layouts.lastMessageVideoLayout,
							datasources: {

								lastMessageData: {
									type: 'object',
									objectId: 'rcLastVideoMessage',
									backgroundImage: {
										sources: [{
											url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
											size: 'small',
											widthPixels: 0,
											heightPixels: 0,
										},
										{
											url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
											size: 'large',
											widthPixels: 0,
											heightPixels: 0,
										},
										],
									},
									messageContent: {
										video: {
											url: download,
										},
										username: {
											type: 'PlainText',
											text: speechText.params.name,
										},
									},
									logoUrl: 'https://github.com/RocketChat/Rocket.Chat.Artwork/raw/master/Logos/icon-circle-1024.png',
								},
							},
						})
						.getResponse();

				} else {

					const speechText = 'Sorry. This message contains file types, which cannot be accessed on this device.';

					return handlerInput.responseBuilder
						.speak(speechText)
						.reprompt(speechText)
						.addDirective({
							type: 'Alexa.Presentation.APL.RenderDocument',
							version: '1.0',
							document: layouts.lastMessageNotSupported,
							datasources: {

								LastMessageNotSupportedData: {
									type: 'object',
									objectId: 'rcnotsupported',
									backgroundImage: {
										sources: [{
											url: 'https://user-images.githubusercontent.com/41849970/60644955-126c3180-9e55-11e9-9147-7820655f3c0b.png',
											size: 'small',
											widthPixels: 0,
											heightPixels: 0,
										},
										{
											url: 'https://user-images.githubusercontent.com/41849970/60644955-126c3180-9e55-11e9-9147-7820655f3c0b.png',
											size: 'large',
											widthPixels: 0,
											heightPixels: 0,
										},
										],
									},
									textContent: {
										primaryText: {
											type: 'PlainText',
											text: 'It’s a trap!',
										},
										secondaryText: {
											type: 'PlainText',
											text: 'Message contains file types which cannot be accessed on this device.',
										},
									},
									logoUrl: 'https://github.com/RocketChat/Rocket.Chat.Artwork/raw/master/Logos/icon-circle-1024.png',
								},
							},
						})
						.getResponse();
				}

			} else if (messageType === 'textmessage') {

				const speechText = await helperFunctions.channelLastMessage(channelName, headers, serverurl);

				return handlerInput.jrb
					.speak(speechText)
					.reprompt(speechText)
					.withSimpleCard(ri('GET_LAST_MESSAGE_FROM_CHANNEL.CARD_TITLE'), speechText)
					.getResponse();

			} else {

				const speechText = 'Sorry. This message contains file types, which cannot be accessed on this device.';

				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(speechText)
					.withSimpleCard('Its a Trap!', speechText)
					.getResponse();

			}

		} catch (error) {
			console.error(error);
		}
	},
};

const AddAllToChannelIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'AddAllToChannelIntent';
	},
	async handle(handlerInput) {
		try {

			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.addallchannelname.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const roomid = await helperFunctions.getRoomId(channelName, headers, serverurl);
			const speechText = await helperFunctions.addAll(channelName, roomid, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('ADD_ALL_TO_CHANNEL.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const GetUnreadMessagesIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'ReadUnreadsIntent';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.readunreadschannel.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const unreadCount = await helperFunctions.getUnreadCounter(channelName, headers, serverurl);
			const speechText = await helperFunctions.channelUnreadMessages(channelName, unreadCount, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			return handlerInput.jrb
				.speak(speechText)
				.reprompt(repromptText)
				.withSimpleCard(ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const MakeModeratorIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'MakeModeratorIntent';
	},
	async handle(handlerInput) {
		try {

			const userNameData = handlerInput.requestEnvelope.request.intent.slots.moderatorusername.value;
			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.moderatorchannelname.value;
			const userName = helperFunctions.replaceWhitespacesDots(userNameData);
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const userid = await helperFunctions.getUserId(userName, headers, serverurl);
			const roomid = await helperFunctions.getRoomId(channelName, headers, serverurl);
			const speechText = await helperFunctions.makeModerator(userName, channelName, userid, roomid, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('MAKE_MODERATOR.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const AddOwnerIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'AddOwnerIntent';
	},
	async handle(handlerInput) {
		try {

			const userNameData = handlerInput.requestEnvelope.request.intent.slots.ownerusername.value;
			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.ownerchannelname.value;
			const userName = helperFunctions.replaceWhitespacesDots(userNameData);
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const userid = await helperFunctions.getUserId(userName, headers, serverurl);
			const roomid = await helperFunctions.getRoomId(channelName, headers, serverurl);
			const speechText = await helperFunctions.addOwner(userName, channelName, userid, roomid, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('ADD_OWNER.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const ArchiveChannelIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'ArchiveChannelIntent';
	},
	async handle(handlerInput) {
		try {

			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.archivechannelname.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const roomid = await helperFunctions.getRoomId(channelName, headers, serverurl);
			const speechText = await helperFunctions.archiveChannel(channelName, roomid, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('ARCHIVE_CHANNEL.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const CreateGrouplIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'CreateGroupIntent';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.groupname.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const speechText = await helperFunctions.createGroup(channelName, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('CREATE_CHANNEL.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const DeleteGroupIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'DeleteGroupIntent';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.deletegroupname.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const speechText = await helperFunctions.deleteGroup(channelName, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('DELETE_CHANNEL.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const MakeGroupModeratorIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'MakeGroupModeratorIntent';
	},
	async handle(handlerInput) {
		try {

			const userNameData = handlerInput.requestEnvelope.request.intent.slots.groupmoderatorusername.value;
			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.groupmoderatorchannelname.value;
			const userName = helperFunctions.replaceWhitespacesDots(userNameData);
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;
			const userid = await helperFunctions.getUserId(userName, headers, serverurl);
			const roomid = await helperFunctions.getGroupId(channelName, headers, serverurl);
			const speechText = await helperFunctions.addGroupModerator(userName, channelName, userid, roomid, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('MAKE_MODERATOR.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const MakeGroupOwnerIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'MakeGroupOwnerIntent';
	},
	async handle(handlerInput) {
		try {

			const userNameData = handlerInput.requestEnvelope.request.intent.slots.groupownerusername.value;
			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.groupownerchannelname.value;
			const userName = helperFunctions.replaceWhitespacesDots(userNameData);
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;
			const userid = await helperFunctions.getUserId(userName, headers, serverurl);
			const roomid = await helperFunctions.getGroupId(channelName, headers, serverurl);
			const speechText = await helperFunctions.addGroupOwner(userName, channelName, userid, roomid, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('ADD_OWNER.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const PostGroupMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostGroupMessageIntent';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const message = handlerInput.requestEnvelope.request.intent.slots.groupmessage.value;
			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.groupmessagechannelname.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const roomid = await helperFunctions.getGroupId(channelName, headers, serverurl);
			const speechText = await helperFunctions.postGroupMessage(roomid, message, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');

			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('POST_MESSAGE.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const PostGroupEmojiMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostGroupEmojiMessageIntent';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const messageData = handlerInput.requestEnvelope.request.intent.slots.groupemojimessage.value;
			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.groupmessageemojichannelname.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);
			const emojiData = handlerInput.requestEnvelope.request.intent.slots.groupmessageemojiname.value;
			const emoji = helperFunctions.emojiTranslateFunc(emojiData);
			const message = messageData + emoji;

			const roomid = await helperFunctions.getGroupId(channelName, headers, serverurl);
			const speechText = await helperFunctions.postGroupMessage(roomid, message, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');


			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('POST_MESSAGE.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const GroupLastMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'GroupLastMessageIntent';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.grouplastmessagechannelname.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);
			const roomid = await helperFunctions.getGroupId(channelName, headers, serverurl);
			const speechText = await helperFunctions.groupLastMessage(channelName, roomid, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');


			return handlerInput.jrb
				.speak(speechText)
				.reprompt(repromptText)
				.withSimpleCard(ri('GET_LAST_MESSAGE_FROM_CHANNEL.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const GetGroupUnreadMessagesIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'ReadGroupUnreadsIntent';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const channelNameData = handlerInput.requestEnvelope.request.intent.slots.groupunreadschannelname.value;
			const channelName = helperFunctions.replaceWhitespacesFunc(channelNameData);

			const roomid = await helperFunctions.getGroupId(channelName, headers, serverurl);
			const unreadCount = await helperFunctions.getGroupUnreadCounter(roomid, headers, serverurl);
			const speechText = await helperFunctions.groupUnreadMessages(channelName, roomid, unreadCount, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');


			return handlerInput.jrb
				.speak(speechText)
				.reprompt(repromptText)
				.withSimpleCard(ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const PostDirectMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostDirectMessageIntent';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const message = handlerInput.requestEnvelope.request.intent.slots.directmessage.value;
			const userNameData = handlerInput.requestEnvelope.request.intent.slots.directmessageusername.value;
			const userName = helperFunctions.replaceWhitespacesDots(userNameData);

			const roomid = await helperFunctions.createDMSession(userName, headers, serverurl);
			const speechText = await helperFunctions.postDirectMessage(message, roomid, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');


			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('POST_MESSAGE.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const PostEmojiDirectMessageIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'PostEmojiDirectMessageIntent';
	},
	async handle(handlerInput) {
		try {
			const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

			const {
				headers,
				serverurl,
			} = sessionAttributes;

			const messageData = handlerInput.requestEnvelope.request.intent.slots.directmessage.value;
			const userNameData = handlerInput.requestEnvelope.request.intent.slots.directmessageusername.value;
			const userName = helperFunctions.replaceWhitespacesDots(userNameData);
			const emojiData = handlerInput.requestEnvelope.request.intent.slots.directmessageemojiname.value;
			const emoji = helperFunctions.emojiTranslateFunc(emojiData);
			const message = messageData + emoji;

			const roomid = await helperFunctions.createDMSession(userName, headers, serverurl);
			const speechText = await helperFunctions.postDirectMessage(message, roomid, headers, serverurl);
			const repromptText = ri('GENERIC_REPROMPT');


			return handlerInput.jrb
				.speak(speechText)
				.speak(repromptText)
				.reprompt(repromptText)
				.withSimpleCard(ri('POST_MESSAGE.CARD_TITLE'), speechText)
				.getResponse();
		} catch (error) {
			console.error(error);
		}
	},
};

const HelpIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
	},
	handle(handlerInput) {
		const speechText = ri('HELP.MESSAGE');

		return handlerInput.jrb
			.speak(speechText)
			.reprompt(speechText)
			.withSimpleCard(ri('HELP.CARD_TITLE'), speechText)
			.getResponse();
	},
};

const CancelAndStopIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			(handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
				handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
	},
	handle(handlerInput) {
		const speechText = ri('GOODBYE.MESSAGE');

		return handlerInput.jrb
			.speak(speechText)
			.withSimpleCard(ri('GOODBYE.CARD_TITLE'), speechText)
			.addDirective({
				type: 'Dialog.UpdateDynamicEntities',
				updateBehavior: 'CLEAR',
			})
			.getResponse();
	},
};

const StartPlaybackHandler = {
	async canHandle(handlerInput) {

		const { attributesManager } = handlerInput;
		const attributes = await attributesManager.getPersistentAttributes() || {};

		if (attributes.hasOwnProperty('inPlaybackSession') && attributes.inPlaybackSession === true) {
			const { request } = handlerInput.requestEnvelope;
			if (request.type === 'PlaybackController.PlayCommandIssued') {
				return true;
			}
			if (request.type === 'IntentRequest') {
				return request.intent.name === 'AMAZON.ResumeIntent';
			}
		}
		return false;

	},
	handle(handlerInput) {

		const { attributesManager } = handlerInput;
		const attributes = /* await */ attributesManager.getPersistentAttributes() || {};

		const playBehavior = 'REPLACE_ALL';
		// eslint-disable-next-line no-undef
		const token = fileurl.split('/').slice(-2)[0];
		const offsetInMilliseconds = 0;

		if (supportsDisplay(handlerInput)) {

			const metadata = {
				title: 'Rocket.Chat',
				subtitle: 'You have received an audio message!',
				art: {
					sources: [{
						url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
					}],
				},
				backgroundImage: {
					sources: [{
						url: 'https://user-images.githubusercontent.com/41849970/60673516-82021100-9e95-11e9-8a9c-cc68cfe5acf1.png',
					}],
				},
			};

			return handlerInput.jrb
				.speak('You have received an audio message!')
				.addAudioPlayerPlayDirective(playBehavior, attributes.playBackURL, token, offsetInMilliseconds, null, metadata)
				.getResponse();

		} else {

			return handlerInput.jrb
				.speak('You have received an audio message!')
				.addAudioPlayerPlayDirective(playBehavior, attributes.playBackURL, token, offsetInMilliseconds, null, null)
				.getResponse();
		}
	},
};

const AudioControlPlaybackHandler = {
	async canHandle(handlerInput) {
		const { request } = handlerInput.requestEnvelope;

		return request.type === 'PlaybackController.NextCommandIssued' || request.type === 'PlaybackController.PreviousCommandIssued' ||
			(request.type === 'IntentRequest' && (request.intent.name === 'AMAZON.NextIntent' || request.intent.name === 'AMAZON.PreviousIntent' || request.intent.name === 'AMAZON.LoopOnIntent' || request.intent.name === 'AMAZON.LoopOffIntent' || request.intent.name === 'AMAZON.ShuffleOnIntent' || request.intent.name === 'AMAZON.ShuffleOffIntent' || request.intent.name === 'AMAZON.StartOverIntent' || request.intent.name === 'AMAZON.ResumeIntent'));
	},
	handle(handlerInput) {
		const speechText = ri('AUDIO_NO_SUPPORT');
		return handlerInput.jrb
			.speak(speechText)
			.getResponse();
	},
};

const PausePlaybackHandler = {
	async canHandle(handlerInput) {
		const { attributesManager } = handlerInput;
		const attributes = await attributesManager.getPersistentAttributes() || {};

		if (attributes.hasOwnProperty('inPlaybackSession') && attributes.inPlaybackSession === true) {
			const { request } = handlerInput.requestEnvelope;

			return request.type === 'IntentRequest' &&
				(request.intent.name === 'AMAZON.StopIntent' ||
					request.intent.name === 'AMAZON.CancelIntent' ||
					request.intent.name === 'AMAZON.PauseIntent');
		}
		return false;
	},
	handle(handlerInput) {

		const { attributesManager } = handlerInput;
		const attributes = /* await */ attributesManager.getPersistentAttributes() || {};

		delete attributes.inPlaybackSession;
		delete attributes.playBackURL;
		/* await */ handlerInput.attributesManager.savePersistentAttributes();

		const speechText = ri('GOODBYE.MESSAGE');

		return handlerInput.jrb
			.speak(speechText)
			.withSimpleCard(ri('GOODBYE.CARD_TITLE'), speechText)
			.addDirective({
				type: 'Dialog.UpdateDynamicEntities',
				updateBehavior: 'CLEAR',
			})
			.addAudioPlayerStopDirective()
			.getResponse();
	},
};

const AudioPlayerEventHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type.startsWith('AudioPlayer.');
	},
	async handle(handlerInput) {

		const { attributesManager } = handlerInput;
		const attributes = await attributesManager.getPersistentAttributes() || {};
		attributes.inPlaybackSession = true;

		// eslint-disable-next-line no-undef
		const audioPlayerEventName = requestEnvelope.request.type.split('.')[1];

		switch (audioPlayerEventName) {
			case 'PlaybackStarted':
				attributes.inPlaybackSession = true;
				break;
			case 'PlaybackFinished':
				attributes.inPlaybackSession = false;
				break;
			case 'PlaybackStopped':
				attributes.inPlaybackSession = true;
				break;
			case 'PlaybackNearlyFinished':
				attributes.inPlaybackSession = true;
				break;
			case 'PlaybackFailed':
				attributes.inPlaybackSession = false;
				console.log('Playback Failed : %j', handlerInput.requestEnvelope.request.error);
				return;
			default:
				throw new Error('Should never reach here!');
		}

		await handlerInput.attributesManager.savePersistentAttributes();

		return handlerInput.responseBuilder.getResponse();
	},
};

const SessionEndedRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
	},
	handle(handlerInput) {
		console.log(`Session ended with reason: ${ handlerInput.requestEnvelope.request.reason }`);

		return handlerInput.responseBuilder
			.addDirective({
				type: 'Dialog.UpdateDynamicEntities',
				updateBehavior: 'CLEAR',
			})
			.getResponse();
	},
};

const ErrorHandler = {
	canHandle() {
		return true;
	},
	handle(handlerInput, error) {
		console.log(`Error handled: ${ error.message }`);
		const speechText = ri('ERRORS');

		return handlerInput.jrb
			.speak(speechText)
			.reprompt(speechText)
			.getResponse();
	},
};

const RequestLog = {
	process(handlerInput) {
		console.log(`REQUEST ENVELOPE = ${ JSON.stringify(handlerInput.requestEnvelope) }`);
	},
};

const ResponseLog = {
	process(handlerInput) {
		console.log(`RESPONSE BUILDER = ${ JSON.stringify(handlerInput) }`);
	},
};

const skillBuilder = new Jargon.JargonSkillBuilder().installOnto(Alexa.SkillBuilders.standard());

exports.handler = skillBuilder
	.addRequestHandlers(
		AddServerIntentHandler,
		SwitchServerIntentHandler,
		LaunchRequestHandler,
		StartedCreateChannelIntentHandler,
		InProgressCreateChannelIntentHandler,
		DeniedCreateChannelIntentHandler,
		CreateChannelIntentHandler,
		StartedDeleteChannelIntentHandler,
		InProgressDeleteChannelIntentHandler,
		DeniedDeleteChannelIntentHandler,
		DeleteChannelIntentHandler,
		StartedPostMessageIntentHandler,
		InProgressPostMessageIntentHandler,
		DeniedPostMessageIntentHandler,
		PostMessageIntentHandler,
		StartedPostLongMessageIntentHandler,
		InProgressPostLongMessageIntentHandler,
		YesIntentHandler,
		NoIntentHandler,
		PostLongMessageIntentHandler,
		PostEmojiMessageIntentHandler,
		GetLastMessageFromChannelIntentHandler,
		AddAllToChannelIntentHandler,
		GetUnreadMessagesIntentHandler,
		MakeModeratorIntentHandler,
		AddOwnerIntentHandler,
		ArchiveChannelIntentHandler,
		CreateGrouplIntentHandler,
		DeleteGroupIntentHandler,
		MakeGroupModeratorIntentHandler,
		MakeGroupOwnerIntentHandler,
		PostGroupMessageIntentHandler,
		PostGroupEmojiMessageIntentHandler,
		GroupLastMessageIntentHandler,
		GetGroupUnreadMessagesIntentHandler,
		PostDirectMessageIntentHandler,
		PostEmojiDirectMessageIntentHandler,
		HelpIntentHandler,
		CancelAndStopIntentHandler,
		SessionEndedRequestHandler,
		StartPlaybackHandler,
		PausePlaybackHandler,
		AudioControlPlaybackHandler,
		AudioPlayerEventHandler
	)
	.addErrorHandlers(ErrorHandler)
	.addRequestInterceptors(RequestLog)
	.addResponseInterceptors(ResponseLog)
	.withTableName(envVariables.dynamoDBTableName)
	.withAutoCreateTable(true)
	.lambda();

const axios = require('axios');
const apiEndpoints = require('./apiEndpoints');
const envVariables = require('./config');
const removeWhitespace = require('remove-whitespace');
const emojiTranslate = require('moji-translate');

const Jargon = require('@jargon/alexa-skill-sdk');
const {
	ri,
} = Jargon;

// Server Credentials. Follow readme to set them up.
const {
	proxyurl,
} = envVariables;

// Axios Functions

const getData = async (code) =>
	await axios
		.get(`${ proxyurl }/user/data?qcode=${ code }`)
		.then((res) => res.data)
		.then((res) => {
			console.log(res);

			return {
				status: res.status,
				userdata: {
					serverurl: res.data.serverinfo.serverurl,
					headers: res.data.headers,
				},
				servername: res.data.serverinfo.servername,
				speech: ri('SERVER.SUCCESS'),
			};

		})
		.catch((err) => {
			console.log(err);

			return {
				status: err.response.data.status,
				speech: ri('SERVER.ERROR'),
			};

		});

const postMessage = async (channelName, message, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.postmessageurl }`, {
				channel: `#${ channelName }`,
				text: message,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('POST_MESSAGE.SUCCESS');
			} else {
				return ri('POST_MESSAGE.ERROR');
			}
		})
		.catch((err) => {
			console.log('ERROR', err.message);
			if (err.response.status === 401) {
				return ri('POST_MESSAGE.AUTH_ERROR');
			} else {
				return ri('POST_MESSAGE.ERROR');
			}
		});

function slotValue(slot) {
	let { value } = slot;
	const resolution = (slot.resolutions && slot.resolutions.resolutionsPerAuthority && slot.resolutions.resolutionsPerAuthority.length > 0) ? slot.resolutions.resolutionsPerAuthority[0] : null;
	if (resolution && resolution.status.code === 'ER_SUCCESS_MATCH') {
		const resolutionValue = resolution.values[0].value;
		value = resolutionValue.name;
	}
	return value;
}


function getStaticAndDynamicSlotValuesFromSlot(slot) {

	const result = {
		name: slot.name,
		value: slot.value,
	};

	if (((slot.resolutions || {}).resolutionsPerAuthority || [])[0] || {}) {
		slot.resolutions.resolutionsPerAuthority.forEach((authority) => {
			const slotValue = {
				authority: authority.authority,
				statusCode: authority.status.code,
				synonym: slot.value || undefined,
				resolvedValues: slot.value,
			};
			if (authority.values && authority.values.length > 0) {
				slotValue.resolvedValues = [];

				authority.values.forEach((value) => {
					slotValue.resolvedValues.push(value);
				});

			}

			if (authority.authority.includes('amzn1.er-authority.echo-sdk.dynamic')) {
				result.dynamic = slotValue;
			} else {
				result.static = slotValue;
			}
		});
	}

	if (result.hasOwnProperty('dynamic') && result.dynamic.statusCode === 'ER_SUCCESS_MATCH') {
		return result.dynamic.resolvedValues[0].value.name;
	} else if (result.hasOwnProperty('static') && result.static.statusCode === 'ER_SUCCESS_MATCH') {
		return result.static.resolvedValues[0].value.name;
	} else {
		return result.value;
	}
}

function replaceWhitespacesFunc(str) {
	return removeWhitespace(str);
}

function emojiTranslateFunc(str) {
	const onlyEmoji = true;
	return emojiTranslate.translate(str, onlyEmoji);
}


const getLastMessageType = async (channelName, headers, serverurl) =>
	await axios
		.get(`${ serverurl }${ apiEndpoints.channelmessageurl }${ channelName }`, {
			headers,
		})
		.then((res) => res.data)
		.then((res) => {
			if (!res.messages[0].file) {
				return 'textmessage';
			} else {
				return res.messages[0].file.type;
			}
		})
		.catch((err) => {
			console.log(err.message);
		});

const channelLastMessage = async (channelName, headers, serverurl) =>
	await axios
		.get(`${ serverurl }${ apiEndpoints.channelmessageurl }${ channelName }`, {
			headers,
		})
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('GET_LAST_MESSAGE_FROM_CHANNEL.SUCCESS', {
					name: res.messages[0].u.username,
					message: res.messages[0].msg,
				});
			} else {
				return ri('GET_LAST_MESSAGE_FROM_CHANNEL.ERROR', {
					channelName,
				});
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.data.errorType === 'error-room-not-found') {
				return ri('GET_LAST_MESSAGE_FROM_CHANNEL.ERROR_NOT_FOUND', {
					channelName,
				});
			} else if (err.response.status === 401) {
				return ri('GET_LAST_MESSAGE_FROM_CHANNEL.AUTH_ERROR');
			} else {
				return ri('GET_LAST_MESSAGE_FROM_CHANNEL.ERROR', {
					channelName,
				});
			}
		});

const getLastMessageFileURL = async (channelName, headers, serverurl) =>
	await axios
		.get(`${ serverurl }${ apiEndpoints.channelmessageurl }${ channelName }`, {
			headers,
		})
		.then((res) => res.data)
		.then((res) => `https://bots.rocket.chat/file-upload/${ res.messages[0].file._id }/${ res.messages[0].file.name }`)
		.catch((err) => {
			console.log(err.message);
		});

const getLastMessageFileDowloadURL = async (fileurl, headers) =>
	await axios
		.get(fileurl, {
			headers,
		})
		.then((response) => `${ response.request.res.responseUrl }`)
		.catch((err) => {
			console.log(err.message);
		});

const createChannel = async (channelName, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.createchannelurl }`, {
				name: channelName,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('CREATE_CHANNEL.SUCCESS', {
					channelName,
				});
			} else {
				return ri('CREATE_CHANNEL.ERROR', {
					channelName,
				});
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (
				err.response.data.errorType === 'error-duplicate-channel-name'
			) {
				return ri('CREATE_CHANNEL.ERROR_DUPLICATE_NAME', {
					channelName,
				});
			} else if (
				err.response.data.errorType === 'error-invalid-room-name'
			) {
				return ri('CREATE_CHANNEL.ERROR_INVALID_NAME', {
					channelName,
				});
			} else if (err.response.status === 401) {
				return ri('CREATE_CHANNEL.AUTH_ERROR');
			} else {
				return ri('CREATE_CHANNEL.ERROR', {
					channelName,
				});
			}
		});

const deleteChannel = async (channelName, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.deletechannelurl }`, {
				roomName: channelName,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('DELETE_CHANNEL.SUCCESS', {
					channelName,
				});
			} else {
				return ri('DELETE_CHANNEL.ERROR', {
					channelName,
				});
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.data.errorType === 'error-room-not-found') {
				return ri('DELETE_CHANNEL.ERROR_NOT_FOUND', {
					channelName,
				});
			} else if (err.response.status === 401) {
				return ri('DELETE_CHANNEL.AUTH_ERROR');
			} else {
				return ri('DELETE_CHANNEL.ERROR', {
					channelName,
				});
			}
		});

const getRoomId = async (channelName, headers, serverurl) =>
	await axios
		.get(`${ serverurl }${ apiEndpoints.channelinfourl }${ channelName }`, {
			headers,
		})
		.then((res) => res.data)
		.then((res) => `${ res.channel._id }`)
		.catch((err) => {
			console.log(err.message);
		});

const addAll = async (channelName, roomid, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.addallurl }`, {
				roomId: roomid,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('ADD_ALL_TO_CHANNEL.SUCCESS', {
					channelName,
				});
			} else {
				return ri('ADD_ALL_TO_CHANNEL.ERROR');
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.status === 401) {
				return ri('ADD_ALL_TO_CHANNEL.AUTH_ERROR');
			} else {
				return ri('ADD_ALL_TO_CHANNEL.ERROR_NOT_FOUND', {
					channelName,
				});
			}
		});

const getUnreadCounter = async (channelName, headers, serverurl) =>
	await axios
		.get(`${ serverurl }${ apiEndpoints.counterurl }${ channelName }`, {
			headers,
		})
		.then((res) => res.data)
		.then((res) => `${ res.unreads }`)
		.catch((err) => {
			console.log(err.message);
		});


const channelUnreadMessages = async (channelName, unreadCount, headers, serverurl) =>
	await axios
		.get(`${ serverurl }${ apiEndpoints.channelmessageurl }${ channelName }`, {
			headers,
		})
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				if (unreadCount === 0) {
					return ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.NO_MESSAGE');
				} else {
					const msgs = [];

					for (let i = 0; i <= unreadCount - 1; i++) {
						msgs.push(`${ res.messages[i].u.username } says, ${ res.messages[i].msg } <break time="0.7s"/> `);
					}

					const responseString = msgs.join(', ');

					const finalMsg = ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.MESSAGE', {
						respString: responseString,
						unread: unreadCount,
					});

					console.log(finalMsg);

					return finalMsg;
				}
			} else {
				return ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.ERROR', {
					channelName,
				});
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.data.errorType === 'error-room-not-found') {
				return ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.ERROR_NOT_FOUND', {
					channelName,
				});
			} else if (err.response.status === 401) {
				return ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.AUTH_ERROR');
			} else {
				return ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.ERROR', {
					channelName,
				});
			}
		});

function replaceWhitespacesDots(str) {
	return str.replace(/\s/ig, '.');
}

const getUserId = async (userName, headers, serverurl) =>
	await axios
		.get(`${ serverurl }${ apiEndpoints.userinfourl }${ userName }`, {
			headers,
		})
		.then((res) => res.data)
		.then((res) => `${ res.user._id }`)
		.catch((err) => {
			console.log(err.message);
		});

const makeModerator = async (userName, channelName, userid, roomid, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.makemoderatorurl }`, {
				userId: userid,
				roomId: roomid,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('MAKE_MODERATOR.SUCCESS', {
					userName,
					channelName,
				});
			} else {
				return ri('MAKE_MODERATOR.ERROR');
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.status === 401) {
				return ri('MAKE_MODERATOR.AUTH_ERROR');
			} else {
				return ri('MAKE_MODERATOR.ERROR_NOT_FOUND', {
					channelName,
				});
			}
		});

const addOwner = async (userName, channelName, userid, roomid, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.addownerurl }`, {
				userId: userid,
				roomId: roomid,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('ADD_OWNER.SUCCESS', {
					userName,
					channelName,
				});
			} else {
				return ri('ADD_OWNER.ERROR');
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.status === 401) {
				return ri('ADD_OWNER.AUTH_ERROR');
			} else {
				return ri('ADD_OWNER.ERROR_NOT_FOUND', {
					channelName,
				});
			}
		});

const archiveChannel = async (channelName, roomid, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.archivechannelurl }`, {
				roomId: roomid,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('ARCHIVE_CHANNEL.SUCCESS', {
					channelName,
				});
			} else {
				return ri('ARCHIVE_CHANNEL.ERROR');
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.status === 401) {
				return ri('ARCHIVE_CHANNEL.AUTH_ERROR');
			} else {
				return ri('ARCHIVE_CHANNEL.ERROR_NOT_FOUND', {
					channelName,
				});
			}
		});

const createGroup = async (channelName, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.creategroupurl }`, {
				name: channelName,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('CREATE_CHANNEL.SUCCESS', {
					channelName,
				});
			} else {
				return ri('CREATE_CHANNEL.ERROR', {
					channelName,
				});
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.data.errorType === 'error-duplicate-channel-name') {
				return ri('CREATE_CHANNEL.ERROR_DUPLICATE_NAME', {
					channelName,
				});
			} else if (err.response.status === 401) {
				return ri('CREATE_CHANNEL.AUTH_ERROR');
			} else if (err.response.data.errorType === 'error-invalid-room-name') {
				return ri('CREATE_CHANNEL.ERROR_INVALID_NAME', {
					channelName,
				});
			} else {
				return ri('CREATE_CHANNEL.ERROR', {
					channelName,
				});
			}
		});

const deleteGroup = async (channelName, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.deletegroupurl }`, {
				roomName: channelName,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('DELETE_CHANNEL.SUCCESS', {
					channelName,
				});
			} else {
				return ri('DELETE_CHANNEL.ERROR', {
					channelName,
				});
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.data.errorType === 'error-room-not-found') {
				return ri('DELETE_CHANNEL.ERROR_NOT_FOUND', {
					channelName,
				});
			} else if (err.response.status === 401) {
				return ri('DELETE_CHANNEL.AUTH_ERROR');
			} else {
				return ri('DELETE_CHANNEL.ERROR', {
					channelName,
				});
			}
		});

const getGroupId = async (channelName, headers, serverurl) =>
	await axios
		.get(`${ serverurl }${ apiEndpoints.groupinfourl }${ channelName }`, {
			headers,
		})
		.then((res) => res.data)
		.then((res) => `${ res.group._id }`)
		.catch((err) => {
			console.log(err.message);
		});

const addGroupModerator = async (userName, channelName, userid, roomid, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.addgroupmoderatorurl }`, {
				userId: userid,
				roomId: roomid,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('MAKE_MODERATOR.SUCCESS', {
					userName,
					channelName,
				});
			} else {
				return ri('MAKE_MODERATOR.ERROR');
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.status === 401) {
				return ri('MAKE_MODERATOR.AUTH_ERROR');
			} else {
				return ri('MAKE_MODERATOR.ERROR_NOT_FOUND', {
					channelName,
				});
			}
		});

const addGroupOwner = async (userName, channelName, userid, roomid, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.addgroupownerurl }`, {
				userId: userid,
				roomId: roomid,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('ADD_OWNER.SUCCESS', {
					userName,
					channelName,
				});
			} else {
				return ri('ADD_OWNER.ERROR');
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.status === 401) {
				return ri('ADD_OWNER.AUTH_ERROR');
			} else {
				return ri('ADD_OWNER.ERROR_NOT_FOUND', {
					channelName,
				});
			}
		});

const postGroupMessage = async (roomid, message, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.postmessageurl }`, {
				roomId: roomid,
				text: message,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('POST_MESSAGE.SUCCESS');
			} else {
				return ri('POST_MESSAGE.ERROR');
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.status === 401) {
				return ri('POST_MESSAGE.AUTH_ERROR');
			} else {
				return ri('POST_MESSAGE.ERROR');
			}
		});

const groupLastMessage = async (channelName, roomid, headers, serverurl) =>
	await axios
		.get(`${ serverurl }${ apiEndpoints.groupmessageurl }${ roomid }`, {
			headers,
		})
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('GET_LAST_MESSAGE_FROM_CHANNEL.SUCCESS', {
					name: res.messages[0].u.username,
					message: res.messages[0].msg,
				});
			} else {
				return ri('GET_LAST_MESSAGE_FROM_CHANNEL.ERROR', {
					channelName,
				});
			}
		})
		.catch((err) => {
			console.log(err.message);
			if (err.response.data.errorType === 'error-room-not-found') {
				return ri('GET_LAST_MESSAGE_FROM_CHANNEL.ERROR_NOT_FOUND', {
					channelName,
				});
			} else if (err.response.status === 401) {
				return ri('GET_LAST_MESSAGE_FROM_CHANNEL.AUTH_ERROR');
			} else {
				return ri('GET_LAST_MESSAGE_FROM_CHANNEL.ERROR', {
					channelName,
				});
			}
		});

const getGroupUnreadCounter = async (roomid, headers, serverurl) =>
	await axios
		.get(`${ serverurl } ${ apiEndpoints.groupcounterurl }${ roomid }`, {
			headers,
		})
		.then((res) => res.data)
		.then((res) => `${ res.unreads }`)
		.catch((err) => {
			console.log(err.message);
		});

const groupUnreadMessages = async (channelName, roomid, unreadCount, headers, serverurl) =>
	await axios
		.get(`${ serverurl }${ apiEndpoints.groupmessageurl }${ roomid }`, {
			headers,
		})
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {

				if (unreadCount === 0) {
					return ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.NO_MESSAGE');
				} else {
					const msgs = [];

					for (let i = 0; i <= unreadCount - 1; i++) {
						msgs.push(`${ res.messages[i].u.username } says, ${ res.messages[i].msg } <break time="0.7s"/> `);
					}

					const responseString = msgs.join('  ');

					const finalMsg = ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.MESSAGE', {
						respString: responseString,
						unread: unreadCount,
					});

					return finalMsg;
				}
			} else {
				return ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.ERROR');
			}
		})
		.catch((err) => {
			console.log(err.message);
			console.log(err.message);
			if (err.response.data.errorType === 'error-room-not-found') {
				return ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.ERROR_NOT_FOUND', {
					channelName,
				});
			} else if (err.response.status === 401) {
				return ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.AUTH_ERROR');
			} else {
				return ri('GET_UNREAD_MESSAGES_FROM_CHANNEL.ERROR');
			}
		});

const createDMSession = async (userName, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.createimurl }`, {
				username: userName,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => `${ res.room._id }`)
		.catch((err) => {
			console.log(err.message);
		});

const postDirectMessage = async (message, roomid, headers, serverurl) =>
	await axios
		.post(
			`${ serverurl }${ apiEndpoints.postmessageurl }`, {
				roomId: roomid,
				text: message,
			}, {
				headers,
			}
		)
		.then((res) => res.data)
		.then((res) => {
			if (res.success === true) {
				return ri('POST_MESSAGE.SUCCESS');
			} else {
				return ri('POST_MESSAGE.ERROR');
			}
		})
		.catch((err) => {
			console.log(err.message);
			return ri('POST_MESSAGE.ERROR');
		});


// Module Export of Functions

module.exports.postMessage = postMessage;
module.exports.getData = getData;
module.exports.slotValue = slotValue;
module.exports.getStaticAndDynamicSlotValuesFromSlot = getStaticAndDynamicSlotValuesFromSlot;
module.exports.replaceWhitespacesFunc = replaceWhitespacesFunc;
module.exports.emojiTranslateFunc = emojiTranslateFunc;
module.exports.getLastMessageType = getLastMessageType;
module.exports.channelLastMessage = channelLastMessage;
module.exports.getLastMessageFileURL = getLastMessageFileURL;
module.exports.getLastMessageFileDowloadURL = getLastMessageFileDowloadURL;
module.exports.createChannel = createChannel;
module.exports.deleteChannel = deleteChannel;
module.exports.getRoomId = getRoomId;
module.exports.addAll = addAll;
module.exports.getUnreadCounter = getUnreadCounter;
module.exports.channelUnreadMessages = channelUnreadMessages;
module.exports.replaceWhitespacesDots = replaceWhitespacesDots;
module.exports.getUserId = getUserId;
module.exports.makeModerator = makeModerator;
module.exports.addOwner = addOwner;
module.exports.archiveChannel = archiveChannel;
module.exports.createGroup = createGroup;
module.exports.deleteGroup = deleteGroup;
module.exports.getGroupId = getGroupId;
module.exports.addGroupModerator = addGroupModerator;
module.exports.addGroupOwner = addGroupOwner;
module.exports.postGroupMessage = postGroupMessage;
module.exports.groupLastMessage = groupLastMessage;
module.exports.getGroupUnreadCounter = getGroupUnreadCounter;
module.exports.groupUnreadMessages = groupUnreadMessages;
module.exports.createDMSession = createDMSession;
module.exports.postDirectMessage = postDirectMessage;

/* eslint-disable no-dupe-keys */
// const envVariables = require('./config');

// REST API Endpoints

module.exports = {
	postmessageurl: '/api/v1/chat.postMessage',
	channelmessageurl: '/api/v1/channels.messages?roomName=',
	loginUrl: '/api/v1/login',
	meUrl: '/api/v1/me',
	channellisturl: '/api/v1/channels.list.joined',
	createchannelurl: '/api/v1/channels.create',
	deletechannelurl: '/api/v1/channels.delete',
	channelinfourl: '/api/v1/channels.info?roomName=',
	userinfourl: '/api/v1/users.info?username=',
	addallurl: '/api/v1/channels.addAll',
	makemoderatorurl: '/api/v1/channels.addModerator',
	addownerurl: '/api/v1/channels.addOwner',
	archivechannelurl: '/api/v1/channels.archive',
	counterurl: '/api/v1/channels.counters?roomName=',
	markasreadurl: '/api/v1/subscriptions.read',
	generatetokenurl: '/api/v1/users.generatePersonalAccessToken',
	removetokenurl: '/api/v1/users.removePersonalAccessToken',
	anonymousReadUrl: '/api/v1/channels.anonymousread?roomName=',
	creategroupurl: '/api/v1/groups.create',
	deletegroupurl: '/api/v1/groups.delete',
	groupinfourl: '/api/v1/groups.info?roomName=',
	addgroupmoderatorurl: '/api/v1/groups.addModerator',
	addgroupownerurl: '/api/v1/groups.addOwner',
	groupmessageurl: '/api/v1/groups.messages?roomId=',
	groupcounterurl: '/api/v1/groups.counters?roomId=',
	createimurl: '/api/v1/im.create',
};

//module imports
const MongoClient = require('mongodb').MongoClient
const f = require('util').format
const Eris = require('eris')
const Queue = require('better-queue')
const util = require('util')
const express = require('express')
const bodyParser = require('body-parser')
const TwitchHelix = require('twitch-helix')
const pc = require('swearjar')
const request = require('superagent')

//project module imports
const config = require('./config.json')
const reply = require('./proto_messages.json')
const amgmt = require('./accountmgmt.js')
const act = require('./actions.js')
const prof = require('./profile.js')
const tools = require('./tools.js')
//const twitch = require('./twitch-handler.js')
const spotify = require('./spotify-handler.js')
const weather = require('./weather-handler.js')
const notes = require('./notes-rem.js')

// mongodb login
const user = encodeURIComponent(config.user)
const password = encodeURIComponent(config.pass)
const authMechanism = 'DEFAULT'
const url = f('mongodb://%s:%s@127.0.0.1:36505/admin?authMechanism=%s', user, password, authMechanism)

//express app
const app = express()

//twitch API
/*
const twitchApi = new TwitchHelix({
	clientId: config.twitchID,
	clientSecret: config.twitchSecret
})
*/
const nonPrintingChars = new RegExp(/[\x00-\x09\x0B\x0C\x0E-\x1F\u200B]/g)

//Cooldown function
const delAfterCD = (message) => {
	setTimeout(async (message) => {
		let messages = await bot.getMessages(message.channel.id,5,undefined,message.id)
		for (var msg in messages) {
			if (messages[msg].content === f(reply.generic.cooldownMessage, message.command.cooldown/1000))
				bot.deleteMessage(messages[msg].channel.id, messages[msg].id, 'timeout expired')
		}
	}, 2000, message)
	return f(reply.generic.cooldownMessage, message.command.cooldown/1000)
}

//Check if user exists and is not banned
const hasUnbannedAccount = async (msg) => {
	let client = await MongoClient.connect(url)
	let col = client.db(config.db).collection('Users')

	let found = await col.findOne({user: msg.author.id})
	if (found === null) {
		bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, msg.author.username))
		return false
	}

	if (found.status === 'banned') {
		return false
	}

	//if user exists and is not banned they may use the command
	return true
}

/////////////////////////////////////////////////////////////////////
//COMMAND CLIENT                                                  //
///////////////////////////////////////////////////////////////////

const bot = new Eris.CommandClient(config.BOT_TOKEN, {
	defaultImageSize:256,
	getAllUsers:true
}, {
	defaultHelpCommand: false,
	description:'Discord bot providing social media functions',
	name:'Broadcast Tower',
	owner:'PlayerVMachine#6223',
	prefix: ['m.'],
	defaultCommandOptions: {
		cooldownMessage: delAfterCD
	}
})

/////////////////////////////////////////////////////////////////////
//MESSAGE QUEUER                                                  //
///////////////////////////////////////////////////////////////////

// let packet = {
//     content: embed,
//     destination: recipient.sendTo,
//     source: msg.author.id,
//     type: 'reply',
//     participants: replyNames
// }

var longQ

//Define Message queue
const q = new Queue(async function (data, cb) {
	try {
		//db connection
		let client = await MongoClient.connect(url)
		const col = client.db(config.db).collection('Users')
		//get user profile
		let user = await col.findOne({sendTo: data.destination})

		//check data type
		if (data.type === 'system') {
			//ignore DND and send message
			bot.createMessage(data.destination, data.content)
			user = null
			cb(null)
		} else if (data.type === 'post' || data.type === 'reply') {
			//respect DND and put in long queue to try again 30mins later if in DND
			if (user.dnd) {
				longQ.push(data)
				user = null
				cb(null)
			} else {
				//Censor profanity if user has their mature preferences set to false
				if (!user.mature) {
					data.content.embed.description = pc.censor(data.content.embed.description)
				}
				bot.createMessage(data.destination, data.content)
				user = null
				cb(null)
			}
		} else if (data.type === 'subscription') {
			if (user.dnd) {
				longQ.push(data)
				user = null
				cb(null)
			} else {
				bot.createMessage(data.destination, data.content)
				user = null
				cb(null)
			}
		}

	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
	}
}, {
	afterProcessDelay:1000
})

//put messages that hit dnd here to wait a long time
longQ = new Queue(function (data, cb) {
	q.push(data)
	cb(null)
}, {
	afterProcessDelay:1800000 //30 minutes
})

//ready
bot.on("ready", () => { // When the bot is ready
    console.log("The Tower of Power is online!") // Log "Ready!"
});

/////////////////////////////////////////////////////////////////////
//ADMIN COMMANDS                                                  //
///////////////////////////////////////////////////////////////////

const ban = bot.registerCommand('ban', async (msg, args) => {
	try{
		let client = await MongoClient.connect(url)
		amgmt.heckingBan(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['heck'],
	requirements: {userIDs: [config.creator]},
	hidden: true
})

const unban = bot.registerCommand('unban', async (msg, args) => {
	try{
		let client = await MongoClient.connect(url)
		amgmt.unBan(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['unheck'],
	requirements: {userIDs: [config.creator]},
	hidden: true
})

const premium = bot.registerCommand('setPrem', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.setPremium(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['sp'],
	requirements: {userIDs: [config.creator]},
	hidden: true
})

/////////////////////////////////////////////////////////////////////
//COMMANDS                                                        //
///////////////////////////////////////////////////////////////////

const ping = bot.registerCommand('ping', 'Pong!', {
	caseInsensitive: true,
	cooldown: 5000,
	description: reply.ping.description,
	fullDescription: reply.ping.fullDescription,
	usage: reply.ping.usage
})

const glitch = bot.registerCommand('glitch', `congrats you'm'st done broken the tower, test it on monday.`, {
	cooldown: 5000,
	hidden: true
})

const raven = bot.registerCommand('Night', (msg, args) => {
	return f('Raven, %s', args.join(' '))
}, {
	cooldown: 5000,
	hidden: true
})

const hello = bot.registerCommand('hello', async(msg, args) => {
	let dmChannel = await msg.author.getDMChannel()

	bot.createMessage(dmChannel.id, {embed: {
		color: parseInt(config.color, 16),
		description:f(reply.generic.hello, msg.author.username)
	}})
}, {
	aliases: ['hi', 'hey', 'bonjour'],
	cooldown: 10000,
	description: reply.hello.description,
	fullDescription: reply.hello.fullDescription,
	usage: reply.hello.usage
})

const invite = bot.registerCommand('invite', `Invite your friends here so they can use the Broadcast Tower too!\nhttps://discord.gg/NNFnjFA`, {
	cooldown: 5000,
	description: `Invite link to the Tower's server`,
	fullDescription: `What more can I say this is the invite like to the Tower's server.`,
	usage: '`b.invite`'
})

/////////////////////////////////////////////////////////////////////
//SOCIAL MEDIA                                                    //
///////////////////////////////////////////////////////////////////

const createAccount = bot.registerCommand('create', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		amgmt.create(msg, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['signup', 'register'],
	cooldown: 10000,
	description: reply.create.description,
	fullDescription: reply.create.fullDescription,
	usage: reply.create.usage
})

const deleteAccount = bot.registerCommand('close', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		amgmt.close(msg, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['delete', 'rm', 'del'],
	cooldown: 10000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.close.description,
	fullDescription: reply.close.fullDescription,
	usage: reply.close.usage
})

const followUser = bot.registerCommand('follow', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		act.follow(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['fol'],
	argsRequired: true,
	cooldown: 2000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.follow.description,
	fullDescription: reply.follow.fullDescription,
	usage: reply.follow.usage
})

const unfollowUser = bot.registerCommand('unfollow', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		act.unfollow(msg, args ,bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['unfol', 'uf'],
	argsRequired: true,
	cooldown: 2000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.unfollow.description,
	fullDescription: reply.unfollow.fullDescription,
	usage: reply.unfollow.usage
})

const post = bot.registerCommand('post', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		act.post(msg, args, bot, q, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['cast', 'send'],
	cooldown: 5000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.post.description,
	fullDescription: reply.post.fullDescription,
	usage: reply.post.usage
})

const postReply = bot.registerCommand('reply', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		act.reply(msg, args, bot, q, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	cooldown: 5000,
	dmOnly: true,
	requirements: {custom: hasUnbannedAccount},
	description: reply.reply.description,
	fullDescription: reply.reply.fullDescription,
	usage: reply.reply.usage
})

const postLeave = bot.registerCommand('leave', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		act.leaveThread(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	cooldown: 5000,
	dmOnly: true,
	requirements: {custom: hasUnbannedAccount},
	description: reply.leave.description,
	fullDescription: reply.leave.fullDescription,
	usage: reply.leave.usage
})

const report = bot.registerCommand('report', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		act.report(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	cooldown: 5000,
	dmOnly: true,
	requirements: {custom: hasUnbannedAccount},
	description: reply.report.description,
	fullDescription: reply.report.fullDescription,
	usage: reply.report.usage
})

const blockUser = bot.registerCommand('block', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		act.block(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['bl'],
	argsRequired: true,
	cooldown: 2000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.block.description,
	fullDescription: reply.block.fullDescription,
	usage: reply.block.usage
})

const unBlockUser = bot.registerCommand('unblock', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		act.unblock(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['unb'],
	argsRequired:true,
	cooldown: 2000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.unblock.description,
	fullDescription: reply.unblock.fullDescription,
	usage:reply.unblock.usage
})

const edit = bot.registerCommand('edit', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.edit(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	cooldown: 2000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.edit.description,
	fullDescription: reply.edit.fullDescription,
	usage: reply.edit.usage
})

const editTagline = edit.registerSubcommand('tagline', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.setTagline(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['-t'],
	cooldown: 5000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.tagline.description,
	fullDescription: reply.tagline.fullDescription,
	usage: reply.tagline.usage
})

const editBio = edit.registerSubcommand('bio', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.setBio(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['-b'],
	cooldown: 5000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.bio.description,
	fullDescription: reply.bio.fullDescription,
	usage: reply.bio.usage
})

const editMature = edit.registerSubcommand('mature', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.setMature(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['-m'],
	cooldown: 5000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.mature.description,
	fullDescription: reply.mature.fullDescription,
	usage: reply.mature.usage
})

const editDND = edit.registerSubcommand('dnd', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.setDND(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['-d'],
	cooldown: 5000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.dnd.description,
	fullDescription: reply.dnd.fullDescription,
	usage: reply.dnd.usage
})

const editColor = edit.registerSubcommand('color', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.setColor(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['-c'],
	cooldown: 2000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.color.description,
	fullDescription: reply.color.fullDescription,
	usage: reply.color.usage
})

const editTimezone = edit.registerSubcommand('-tz', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.setTimezone(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['timezone'],
	cooldown: 2000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.timezone.description,
	fullDescription: reply.timezone.fullDescription,
	usage: reply.timezone.usage
})

const editPrivate = edit.registerSubcommand('private', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.setPrivate(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['-p'],
	cooldown: 2000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.private.description,
	fullDescription: reply.private.fullDescription,
	usage: reply.private.usage
})

const editWeather = edit.registerSubcommand('weather', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.setWeather(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['-w'],
	cooldown: 2000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.defWeather.description,
	fullDescription: reply.defWeather.fullDescription,
	usage: reply.defWeather.usage
})

const view = bot.registerCommand('view', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.view(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['profile'],
	cooldown: 5000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.view.description,
	fullDescription: reply.view.fullDescription,
	usage: reply.view.usage
})

const list = bot.registerCommand('list', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		prof.list(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['ls', 'li'],
	cooldown: 2000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.list.description,
	fullDescription: reply.list.fullDescription,
	usage: reply.list.usage
})

const clearDMs = bot.registerCommand('clean', async (msg, args) => {
	//
	tools.clean(msg, args, bot)
}, {
	aliases: ['cls', 'clear'],
	cooldown: 10000,
	dmOnly: true,
	requirements: {custom: hasUnbannedAccount},
	description: reply.clearDMs.description,
	fullDescription: reply.clearDMs.fullDescription,
	usage: reply.clearDMs.usage
})

const help = bot.registerCommand('help', (msg, args) => {
	//
	tools.help(msg, args, bot)
}, {
	cooldown: 5000,
	description: reply.help.description,
	fullDescription: reply.help.fullDescription,
	usage: reply.help.usage
})

/////////////////////////////////////////////////////////////////////
//TWITCH                                                          //
///////////////////////////////////////////////////////////////////

const twitchResub = async () => {
	let client = await MongoClient.connect(url)
	const twitchCol = client.db(config.db).collection('TwitchStream') //DB in form of twitch streamid, usersSubbed

	let streams = await twitchCol.find().toArray

	for (s in streams) {
		if (streams[s].followers.length === 0) {
			let remStreamer = await twitchCol.deleteOne({StreamerID:streams[s].StreamerID})
			if (remStreamer.result.ok)
				bot.createMessage(config.logChannelID, f('Streamer %s unfollowed', streams[s].Streamer))
		} else {
			let topic = 'https://api.twitch.tv/helix/streams?user_id=' + streams[s].StreamerID

			request.post('https://api.twitch.tv/helix/webhooks/hub')
			.send({"hub.mode":"subscribe","hub.topic":topic,"hub.callback":"http://208.113.133.141/twitch","hub.lease_seconds":"864000","hub.secret":config.twitchSecret})
			.set('Client-ID', config.twitchID).set('Content-Type', 'application/json').end( (err, res) => {
				if(err !== null)
					console.log('Error following sreamer' + err)
			})
		}
	}
}
setInterval(twitchResub, 24*60*60*1000)


const twitchBase = bot.registerCommand('twitch', async (msg, args) => {
	let client = await MongoClient.connect(url)
	twitch.streamList(msg, args, bot, client)
}, {
	cooldown: 5000,
	description: reply.twitch.description,
	fullDescription: reply.twitch.fullDescription,
	usage: reply.twitch.usage
})

const twitchSub = twitchBase.registerSubcommand('sub', async (msg, args) => {
	let client = await MongoClient.connect(url)
	twitch.twitchStreamSub(msg, args, bot, client)
}, {
	aliases: ['-s'],
	cooldown: 5000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.tsub.description,
	fullDescription: reply.tsub.fullDescription,
	usage: reply.tsub.usage
})

const twitchUnSub = twitchBase.registerSubcommand('unsub', async (msg, args) => {
	let client = await MongoClient.connect(url)
	twitch.twitchStreamUnSub(msg, args, bot, client)
}, {
	aliases: ['-u'],
	cooldown: 5000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.tunsub.description,
	fullDescription: reply.tunsub.fullDescription,
	usage: reply.tunsub.usage
})

/////////////////////////////////////////////////////////////////////
//SPOTIFY                                                         //
///////////////////////////////////////////////////////////////////

//gets new releases on Friday, check every 12 hours
const spotifyRefresh = () => {
	date = new Date()
	if(date.getDay() === 5)
		spotify.getReleases()
}
setInterval(spotifyRefresh, 12*60*60*1000)

const spotifyBase = bot.registerCommand('spotify', reply.spotify.fullDescription, {
	cooldown: 5000,
	description: reply.spotify.description,
	fullDescription: reply.spotify.fullDescription,
	usage: reply.spotify.usage
})

const spotifyWeekly = spotifyBase.registerSubcommand('sub', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		spotify.weeklyNotif(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['-s'],
	cooldown: 5000,
	description: reply.sSub.description,
	fullDescription: reply.sSub.fullDescription,
	usage: reply.sSub.usage
})

const spotifyUnweekly = spotifyBase.registerSubcommand('unsub', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		spotify.unNotif(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['-u'],
	cooldown: 5000,
	description: reply.sUnsub.description,
	fullDescription: reply.sUnsub.fullDescription,
	usage: reply.sUnsub.usage
})

const spotifyTopReleases = spotifyBase.registerSubcommand('top', async (msg, args) => {
	spotify.tenList(msg, args, bot)
}, {
	aliases: ['-t'],
	cooldown: 5000,
	description: reply.top.description,
	fullDescription: reply.top.fullDescription,
	usage: reply.top.usage
})

const spotifyAlbumFromTopReleases = spotifyBase.registerSubcommand('album', async (msg, args) => {
	spotify.albumDetail(msg, args, bot)
}, {
	aliases: ['-a'],
	cooldown: 5000,
	description: reply.album.description,
	fullDescription: reply.album.fullDescription,
	usage: reply.album.usage
})

const spotifyPlaylists = spotifyBase.registerSubcommand('playlist', async (msg, args) => {
	spotify.getPlaylists(msg, args, bot)
}, {
	aliases: ['-p'],
	cooldown: 5000,
	description: reply.playlist.description,
	fullDescription: reply.playlist.fullDescription,
	usage: reply.playlist.usage
})

/////////////////////////////////////////////////////////////////////
//WEATHER                                                         //
///////////////////////////////////////////////////////////////////

const weatherCmd = bot.registerCommand('weather', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		weather.getWeather(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['w'],
	cooldown: 5000,
	description: reply.weather.description,
	fullDescription: reply.weather.fullDescription,
	usage: reply.weather.usage
})

const dailySub = bot.registerCommand('fsub', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		weather.dailySub(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['fs'],
	cooldown: 5000,
	description: reply.fsub.description,
	fullDescription: reply.fsub.fullDescription,
	usage: reply.fsub.usage
})

const dailyUnsub = bot.registerCommand('funsub', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		weather.dailyUnsub(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['fus'],
	cooldown: 5000,
	description: reply.funsub.description,
	fullDescription: reply.funsub.fullDescription,
	usage: reply.funsub.usage
})

const forecastCmd = bot.registerCommand('forecast', async (msg, args) => {
	try {
		let client = await MongoClient.connect(url)
		weather.getForecast(msg, args, bot, client)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}, {
	aliases: ['f'],
	cooldown: 5000,
	description: reply.weather.description,
	fullDescription: reply.weather.fullDescription,
	usage: reply.weather.usage
})

/////////////////////////////////////////////////////////////////////
//NOTES                                                           //
///////////////////////////////////////////////////////////////////

const noteToSelf = bot.registerCommand('nts', (msg, args) => {
	notes.noteToSelf(msg, args, bot)
}, {
	aliases: ['note'],
	cooldown: 5000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.note.description,
	fullDescription: reply.note.fullDescription,
	usage: reply.note.usage
})

const getNotes = bot.registerCommand('notes', (msg, args) => {
	notes.getNotes(msg, args, bot)
}, {
	aliases: ['getNotes'],
	cooldown: 5000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.notes.description,
	fullDescription: reply.notes.fullDescription,
	usage: reply.notes.usage
})

const unNote = bot.registerCommand('unnote', (msg, args) => {
	notes.unNote(msg, args, bot)
}, {
	aliases: ['rem'],
	cooldown: 5000,
	requirements: {custom: hasUnbannedAccount},
	description: reply.unnote.description,
	fullDescription: reply.unnote.fullDescription,
	usage: reply.unnote.usage
})

/////////////////////////////////////////////////////////////////////
//REMINDERS                                                       //
///////////////////////////////////////////////////////////////////

const remindMe = bot.registerCommand('remindme', async (msg, args) => {
	notes.remindMe(msg, args, bot)
}, {
	aliases: ['remind'],
	requirements: {custom: hasUnbannedAccount},
	description: reply.remindMe.description,
	fullDescription: reply.remindMe.fullDescription,
	usage: reply.remindMe.usage
})

/////////////////////////////////////////////////////////////////////
//REMINDER + SUBSCRIPTION SCHEDULER                               //
///////////////////////////////////////////////////////////////////

//check for reminders inside a minute of expiry
const checkReminders = async () => {
	try {
		let client = await MongoClient.connect(url)
		const remCol = client.db(config.db).collection('Reminders')

		now = new Date()
		oneMinuteLater = new Date(now.getTime() + (60*1000))

		remCol.find({due: {$lte: oneMinuteLater}}).toArray(async (err, reminders) => {
			for (r in reminders) {
				due = new Date(reminders[r].due)
				timeout = due.getTime() - Date.now()
				setTimeout(async () => {

					if (reminders[r].type === 'reminder') {
						let packet = {
							content: reminders[r].content,
							destination: reminders[r].sendTo,
							type: 'system',
						}
						q.push(packet)

						let delRem = await remCol.deleteOne({_id: reminders[r]._id})
						if (delRem.deletedCount !== 1)
							console.log(f('An error occurred removing reminder: %s', reminders[r]._id))

					} else if (reminders[r].type === 'forecast') {

						weather.dailyForecast(reminders[r].sendTo, client, q, bot)

						date = new Date(Date.parse(reminders[r].due) + 24*60*60*1000)
						let updateDue = await remCol.findOneAndUpdate({_id: reminders[r]._id}, {$set: {due:date}})
						if (updateDue.ok !== 1)
							console.log((f('An error occurred updating subscription: %s', reminders[r]._id)))
					} else if (reminders[r].type === 'spotify') {
						let packet = {
							content: 'Check out Spotify\'s new releases using `b.spotify top`',
							destination: reminders[r].sendTo,
							type: 'subscription',
						}
						q.push(packet)

						date = new Date(Date.parse(reminders[r].due) + 7*24*60*60*1000)
						let updateDue = await remCol.findOneAndUpdate({_id: reminders[r]._id}, {$set: {due:date}})
						if (updateDue.ok !== 1)
							console.log((f('An error occurred updating subscription: %s', reminders[r]._id)))
					}
				}, timeout)
			}
		})
	} catch (err) {
		console.log(err)
	}
}

setInterval(checkReminders, 60*1000)

////////////////////////////////////////////////////////////////////
//R6 COMMANDS                                                    //
//////////////////////////////////////////////////////////////////
const r6 = require('./game-integrations/rainbowsix.js')

const r6Get = bot.registerCommand('r6', (msg, args) => {
	r6.getOverallStats(msg, args, bot)
})

r6Get.registerSubcommand('cas', (msg, args) => {
	r6.getCasualStats(msg, args, bot)
})

r6Get.registerSubcommand('rnk', (msg, args) => {
	r6.getRankedStats(msg, args, bot)
})

r6Get.registerSubcommand('top', (msg, args) => {
	r6.getTopOp(msg, args, bot)
})

////////////////////////////////////////////////////////////////////
//EXPRESS WEBHOOK HANDLER                                        //
//////////////////////////////////////////////////////////////////

// parse application/json
var jsonParser = bodyParser.json()

///////TWITCH/////////////////////

//list of stream ids to prevent duplicates
let streamIDs = []

//reply with the challenge to confirm subscription
app.get('/twitch', jsonParser, (req, res) => {
	if(req.query['hub.challenge'] != null)
		res.status(200).send(req.query['hub.challenge'])
})

//dm users that are following
app.post('/twitch', jsonParser, async (req, res) => {
	try {
		let client = await MongoClient.connect(url)
		const twitchCol = client.db(config.db).collection('TwitchStream') //DB in form of twitch streamid, usersSubbed
		const usersCol = client.db(config.db).collection('Users') //Tower's users

		//get the stream data
		if (req.body.data.length !== 0) {
			let streamData = req.body.data[0]

			if (streamIDs.includes(streamData.id))
				return

			streamIDs.push(streamData.id)
			let streamer = await twitchApi.getTwitchUserById(streamData.user_id)
			let streamSubList = await twitchCol.findOne({StreamerID: streamer.id})
			let gameData = await twitchApi.sendHelixRequest('games?id=' + streamData.game_id)
			let thumbnailURL = ''
			try {
				thumbnailURL = gameData.data.box_art_url.replace('{width}', '256').replace('{height}', '256')
			} catch (e) {
				thumbnailURL = 'https://www.twitch.tv/p/assets/uploads/glitch_474x356.png'
			}

			let embed = {
				embed: {
					title: '**' + streamer.display_name + '** is now streaming! ' + streamData.title,
					description: f('[Check out the stream!](https://www.twitch.tv/%s)', streamer.display_name),
					color: parseInt('0x6441A4', 16),
					author: {name: 'Twitch Stream Notification', icon_url: 'https://www.twitch.tv/p/assets/uploads/glitch_474x356.png'},
					thumbnail: {url:thumbnailURL, height:256, width:256},
					footer: {text:'Part of the Broadcast Tower Integration Network'}
				}
			}

			for (var usr in streamSubList.followers) {
				let user = await usersCol.findOne({_id:streamSubList.followers[usr]})

				let packet = {
					content: embed,
					destination: user.sendTo,
					type: 'subscription',
				}

				q.push(packet)
			}
		}
	} catch (e) {
		console.log(e)
	}
})

////////////////////////////////////////////////////////////////////
//GARBAGE COLLECTORS                                             //
//////////////////////////////////////////////////////////////////


const collector = async () => {
	try {
		let client = await MongoClient.connect(url)
		const twitchCol = client.db(config.db).collection('TwitchStream')
		const userCol = client.db(config.db).collection('Users')
		const remCol = client.db(config.db).collection('Reminders')
		const postCol = client.db(config.db).collection('Posts')

		let closedAccounts = await userCol.find({status: 'closed'}).toArray()

		for (i in closedAccounts) {
			let remFF = await userCol.updateMany({$or: [{following: closedAccounts[i].user}, {followers: closedAccounts[i].user}]}, {$pull: {following: closedAccounts[i].user, followers: closedAccounts[i].user}})
			let remT = await twitchCol.updateMany({usersSubbed: closedAccounts[i]._id}, {$pull: {usersSubbed: closedAccounts[i]._id}})
			let remR = await remCol.deleteMany({destination: closedAccounts[i].sendTo})
			let remP = await postCol.deleteMany({source: closedAccounts[i].sendTo})

			if (remFF.result.ok === 1 && remT.result.ok === 1 && remR.result.ok === 1 && remP.result.ok === 1) {
				//bot.createMessage(logChannelID, '')
				let delUser = await userCol.deleteOne({user: closedAccounts[i].user})
			}
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
	}
}
setInterval(collector, 60*60*1000)

const oldPostRemover = async () => {
	try {
		let threeDaysOld = new Date(Date.now() - 3*24*60*60*1000)
		let postCol = await postCol.deleteMany({lastUpdated: {$lte : threeDaysOld}})
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
	}
}
setInterval(oldPostRemover, 24*60*60*1000)

//listen for requests
app.listen(3001, () => console.log('Webhook handler listening on :3000!'))

//actually connect
bot.connect()

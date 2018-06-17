// npm requires
const f = require('util').format
const TwitchHelix = require('twitch-helix')
const request = require('superagent')

// project files required
const config = require('./config.json')
const reply = require('./proto_messages.json')

//twitch API
const twitchApi = new TwitchHelix({
    clientId: config.twitchID,
    clientSecret: config.twitchSecret
})


exports.twitchStreamSub = async (msg, args, bot, client) => {
	try {
		const twitchCol = client.db(config.db).collection('TwitchStream') //DB in form of twitch streamid, usersSubbed
		const usersCol = client.db(config.db).collection('Users') //Tower's users

		let usee = await usersCol.findOne({user: msg.author.id})

		let streamer = await twitchApi.getTwitchUserByName(args[0])

		//if the streamer hasn't been followed by a user yet add them to the collection
		let streamSubList = await twitchCol.findOne({StreamerID: streamer.id})
		if (streamSubList === null){
			let addStreamer = await twitchCol.insertOne({StreamerID: streamer.id, Streamer: args[0], followers: []})
			if (addStreamer.insertedCount === 1){
				bot.createMessage(config.logChannelID, f('Streamer %s followed', streamer.display_name))
				let topic = 'https://api.twitch.tv/helix/streams?user_id=' + streamer.id

				request.post('https://api.twitch.tv/helix/webhooks/hub')
				.send({"hub.mode":"subscribe","hub.topic":topic,"hub.callback":"http://208.113.133.141/twitch","hub.lease_seconds":"864000","hub.secret":config.twitchSecret})
				.set('Client-ID', config.twitchID).set('Content-Type', 'application/json').end( (err, res) => {
					if(err !== null)
						console.log('Error following sreamer' + err)
				})

			} else {
				bot.createMessage(config.logChannelID, f('Streamer %s could not be followed', streamer.display_name))
			}
		}

		//add the user to the streamer's follower list
		let addFollower = await twitchCol.findOneAndUpdate({StreamerID: streamer.id}, {$addToSet: {followers:usee._id}})
		if(addFollower.ok !== 1) {
			bot.createMessage(msg.channel.id, 'There was an error subscribing to twitch stream notifications O///O')
			return
		}

		bot.createMessage(msg.channel.id, f(`%s, you just subbed to %s's stream notifications!`, msg.author.username, streamer.display_name))

	}catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.twitchStreamUnSub = async (msg, args, bot, client) => {
	try {
		const usersCol = client.db(config.db).collection('Users')
		const twitchCol = client.db(config.db).collection('TwitchStream')

		let usee = await usersCol.findOne({user: msg.author.id})
		if (usee === null) {
			bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, msg.author.username))
			return
		}

		let streamer = await twitchApi.getTwitchUserByName(args[0])

		let pullFollower = await twitchCol.findOneAndUpdate({StreamerID: streamer.id}, {$pull: {followers:usee._id}})

		if(pullFollower.ok !== 1) {
			bot.createMessage(msg.channel.id, 'There was an error unsubscribing from twitch stream notifications O///O')
			return
		}

		bot.createMessage(msg.channel.id, f(`%s, you just unsubbed from %s's stream notifications.`, msg.author.username, streamer.display_name))
	}catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.streamList = async (msg, args, bot, client) => {
	try {
		const usersCol = client.db(config.db).collection('Users')
		const twitchCol = client.db(config.db).collection('TwitchStream')

		let usee = await usersCol.findOne({user: msg.author.id})

		let streamers = await twitchCol.find({followers:usee._id}).toArray()

		let list = []
		if (streamers.length === 0) {
			list.push(reply.list.empty)
		} else {
			for (s in streamers)
				list.push(streamers[s].Streamer)
		}

		let embed = {
			embed: {
				author: {name: f(reply.list['twitch'], msg.author.username), icon_url: msg.author.avatarURL},
				description: list.join('\n'),
				color: parseInt(usee.eColor, 16)
			}
		}
		
		bot.createMessage(msg.channel.id, embed)
	}catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}
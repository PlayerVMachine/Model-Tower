// npm requires
const f = require('util').format

// project files required
const config = require('./config.json')
const reply = require('./proto_messages.json')

exports.create = async (msg, bot, client) => {
	const col = client.db(config.db).collection('Users')

	let found = await col.findOne({user: msg.author.id})
	if (found === null) {

		let dmChannel = await msg.author.getDMChannel()

		const userdata = {
			user: msg.author.id,
			status: 'active',
			tagline: '',
			bio: '',
			following: [],
			followers: [],
			blocked: [],
			streams: [],
			weather: {location: '', deg: ''},
			sendTo: dmChannel.id,
			private: false,
			mature: false,
			dnd: false,
			tz: undefined,
			joined: new Date(),
			eColor: config.color,
			premium: 0
		}

		let created = await col.insertOne(userdata)
		if (created.insertedCount === 1) { 
			bot.createMessage(msg.channel.id, f(reply.create.success, msg.author.username))
			bot.createMessage(config.logChannelID, msg.author.mention + ' has created an account')
		} else { 
			bot.createMessage(msg.channel.id, f(reply.create.error, msg.author.username))
		}
	} else if (found.status === 'closed'){
		let unClose = await col.updateOne({user: msg.author.id}, {$set: {status: 'active'}})

		if (unClose.result.ok === 1) {
			bot.createMessage(msg.channel.id, f('%s, your account has been reopened with all your settings where they last were.', msg.author.username))
		} else {
			bot.createMessage(msg.channel.id, f('%s, sorry an error ocurred reopening your account.', msg.author.username))
		}
	} else {
		bot.createMessage(msg.channel.id, f(reply.create.alreadyHasAccount, msg.author.username))
	}
}

exports.close = async (msg, bot, client) => {
	const col = client.db(config.db).collection('Users')

	let min = Math.ceil(1000)
	let max = Math.floor(9999)
	let confirm = Math.floor(Math.random() * (max - min)) + min

	var medit

	const confirmation = async (response) => {
		res = response.content.split(' ')[0];
		if (response.author.id === msg.author.id && res === confirm.toString()) {
        	//confirmation code entered correctly
        	let marked = await col.findOneAndUpdate({user: msg.author.id}, {$set: {status:'closed'}})
        	if (marked.ok === 1) {
        		bot.createMessage(msg.channel.id, f(reply.close.success, msg.author.username))
        		bot.createMessage(config.logChannelID, msg.author.mention + ' has marked their account for closure')
			} else {
				bot.createMessage(msg.channel.id, f(reply.close.error, msg.author.username))
			}
        	bot.removeListener('messageCreate', confirmation)
        	clearTimeout(medit)
        } else if (response.author.id === msg.author.id && response.content === 'cancel') {
			//user cancelled closing
        	bot.createMessage(msg.channel.id, f(reply.close.cancelled, msg.author.username))
        	bot.removeListener('messageCreate', confirmation)
        	clearTimeout(medit)
        } else if (response.author.id === msg.author.id && res !== confirm.toString()) {
        	//confirmation code entered incorrectly
        	bot.createMessage(msg.channel.id, f(reply.close.wrongCode, msg.author.username))
        	bot.removeListener('messageCreate', confirmation)
        	clearTimeout(medit)
        }
    }

	let delMessage = await bot.createMessage(msg.channel.id, f(reply.close.confirmation, msg.author.username, confirm))

	//edit message if no reply in 10s and close listener
	medit = setTimeout((msgid) => {
		bot.editMessage(msg.channel.id, msgid, f(reply.close.timeout, msg.author.username))
		bot.removeListener('messageCreate', confirmation)
	}, 10000, delMessage.id)

	//register event listener for close confirmation/cancel
	bot.on('messageCreate', confirmation)
}

exports.heckingBan = async (msg, args, bot, client) => {
	const col = client.db(config.db).collection('Users')

	let usee = await col.findOne({user: args[0]})
	if (usee === null) {
		bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, args[0]))
		return
	}
	
	let ban = await col.updateOne({user: usee.user}, {$set: {status: 'banned'}})
	let clearFF = await col.updateMany({following: usee.user}, {$pull: {following: usee.user, followers: usee.user}})

	if (ban.result.ok === 1 && clearFF.result.ok === 1) {
		bot.createMessage(msg.channel.id, f(reply.ban.success, usee.user))
	} else {
		bot.createMessage(msg.channel.id, f(reply.ban.error, usee.user))
	}
}

exports.unBan = async (msg, args, bot, client) => {
	const col = client.db(config.db).collection('Users')

	let usee = await col.findOne({$and: [ {user: args[0]}, {status: 'banned'} ] })
	if (usee === null) {
		bot.createMessage(msg.channel.id, f('Could not find a banned user with id: %s', args[0]))
		return
	}
	
	let unban = await col.updateOne({user: usee.user}, {$set: {status: 'active'}})

	if (unban.result.ok === 1) {
		bot.createMessage(msg.channel.id, f(reply.unban.success, usee.user))
	} else {
		bot.createMessage(msg.channel.id, f(reply.unban.error, usee.user))
	}
}
//Module imports
const MongoClient = require('mongodb').MongoClient
const f = require('util').format

const bot = require('../core.js')
const config = require('../config.json')

// mongodb login
const url = 'mongodb://127.0.0.1:36505'

exports.commandHandler = (msg, args) => {
	let restOfArgs = args.slice(1)

	if (['ping'].includes(args[0])) {
		ping(msg, restOfArgs)
	} else if (['clean', 'deldm'].includes(args[0])) {
		clean(msg, restOfArgs)
	} else if (['prefix'].includes(args[0])) {
		setPrefix(msg, restOfArgs)
	}
}

//Ping, used to reassure people that the bot is up and to check latency
const ping = async (msg, args) => {
    let start = Date.now()

    bot.bot.createMessage(msg.channel.id, 'Pong!').then(msg => {
        let diff = Date.now() - start
        return msg.edit(f('Pong! `%dms`', diff))
    })
}

//Clean DMs with the bot
const clean = async (msg, args) => {
	let dmchannel = await msg.author.getDMChannel();
	if (parseInt(args[0]) > 50 || parseInt(args[0]) === NaN) {
		bot.bot.createMessage(msg.channel.id, 'Sorry the maximum number of messages I can look through is 50')
		return
	}

	let messages = await dmchannel.getMessages(50);

	let count = parseInt(args[0])
	for (i = 0; i < 50; i++) {
		if(messages[i].author.id !== msg.author.id) {
			dmchannel.deleteMessage(messages[i].id)
			count --
		}
		if (count === 0)
			break
	}
}

const setPrefix = async (msg, args) => {
	try {
		if (args.length > 1 || args[0].length > 10) {
			bot.bot.createMessage(msg.channel.id, f(`Sorry %s, the prefix cannot contain spaces or be more than 10 characters long`))
			return
		}

		let client = await MongoClient.connect(url)
	    let col = client.db('model_tower').collection('guild_configs')

	    let guildConfig = await col.updateOne({_id:guild.id}, {$set: {prefix:args[0]}})
	    if(guildConfig.result.ok == 1) {
	    	bot.bot.createMessage(msg.channel.id, f(`The guild prefix is now: %s`, args[0]))
	    } else {
	    	bot.bot.createMessage(msg.channel.id, f(`Sorry %s, an error occured trying to set the guild prefix`, msg.author.username))
	    }
	} catch (err) {
		bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: setPrefix`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
	}
}
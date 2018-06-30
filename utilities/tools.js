const f = require('util').format
const bot = require('../core.js')

exports.commandHandler = (msg, args) => {
	let restOfArgs = args.slice(1)

	if (['ping'].includes(args[0])) {
		ping(msg, restOfArgs)
	} else if (['clean', 'deldm'].includes(args[0])) {
		clean(msg, restOfArgs)
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

	let messages = await dmchannel.channel.getMessages(50);

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
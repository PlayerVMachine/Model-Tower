//Module imports
const MongoClient = require('mongodb').MongoClient
const f = require('util').format

const bot = require('../core.js')
const config = require('../config.json')
const helpDoc = require('../help.json')

// mongodb login
const url = 'mongodb://127.0.0.1:36505'

exports.commandHandler = (msg, args) => {
	let restOfArgs = args.slice(1)

	if ('ping' == args[0]) {
		ping(msg, restOfArgs)
	} else if ('clean' == args[0]) {
		clean(msg, restOfArgs)
	} else if ('prefix' == args[0]) {
		setPrefix(msg, restOfArgs)
	} else if (args[0] == 'help') {
		help(msg, restOfArgs)
	} else if (args[0] == 'about') {
		about(msg, restOfArgs)
	} else if (args[0] == 'invite') {
		invite(msg, restOfArgs)
	} else if (args[0] == 'server') {
		server(msg, restOfArgs)
	} else if (args[0] == 'eval') {
        discEval(msg, restOfArgs)
    } else if (args[0] == 'special') {
        getUsersFromReact(msg, restOfArgs)
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
		if (!msg.member.permission.has('manageGuild')) {
			return
		}

		if (args.length > 1 || args[0].length > 10) {
			bot.bot.createMessage(msg.channel.id, f(`Sorry %s, the prefix cannot contain spaces or be more than 10 characters long`, msg.author.username))
			return
		}

		let client = await MongoClient.connect(url)
	    let col = client.db('model_tower').collection('guild_configs')

	    let guildConfig = await col.updateOne({_id:msg.channel.guild.id}, {$set: {prefix:args[0]}}, {upsert: true})
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

const help = (msg, args) => {
	let description = args.length == 0 ? helpDoc['help'].replace(/pfx/g, prefix) : helpDoc[args[0]].replace(/pfx/g, prefix)
    let embed = {
        embed : {
            title: 'Media Central Command Help',
            color: 0x497fbc,
            description: description,
            footer: module.exports.footer
        }
    }
    bot.bot.createMessage(msg.channel.id, embed)
}

const about = (msg, args) => {
    let embed = {
        embed : {
            title: 'Media Central Bot',
            author: {name: bot.bot.user.username, icon_url: bot.bot.user.avatarURL},
            color: 0x497fbc,
            description: `Discord bot providing game statistics, posting/mailbox features, Spotify tools, and more community features on the way!\n\nIf you like the bot consider [buying me a coffee](https://buymeacoff.ee/playervm)`,
            fields: [
            {name: 'Version', value:`0.2`, inline:true},
            {name: 'Library', value:`Eris`, inline: true},
            {name: 'Developer', value:`<@273999507174195203>`, inline: true}
            ]
        }
    }
    bot.bot.createMessage(msg.channel.id, embed)
}

const invite = (msg, args) => {
	bot.bot.createMessage(msg.channel.id, `Invite me with this link: <https://discordapp.com/api/oauth2/authorize?client_id=464529935315370004&permissions=537143360&scope=bot>`)
}

const server = (msg, args) => {
	bot.bot.createMessage(msg.channel.id, `Join my support and information server: https://discord.gg/NNFnjFA`)
}

const sanitize = (text) => {
  if (typeof(text) === "string") {
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203))
  } else {
      return text
  }
}

const discEval = async (msg, args) => {
  if(msg.author.id != 273999507174195203) {
    return
  }

  try {
    const code = args.join(" ")
    let evaled = await eval(code)

    if (typeof evaled !== "string") {
      evaled = require("util").inspect(evaled, {depth:1})
    }

    bot.bot.createMessage(msg.channel.id, "```js\n" + sanitize(evaled) + "```")
  } catch (err) {
    bot.bot.createMessage(msg.channel.id, `\`ERROR\` \`\`\`xl\n${sanitize(err)}\n\`\`\``)
  }
}

const getUsersFromReact = async (msg, args) => {
    let channelid = args[0]
    let messageid = args[1]
    let emojiid = args[2]

    let Channel = msg.channel.guild.channels.get(channelid)
    let Message = await Channel.getMessage(messageid)
    let reactors = await Message.getReaction(args[2])

    let makeOneTimeRole = await msg.guild.createRole({
        name: `Mentionable`,
        mentionable: true
    }, `One time role to mention users who reacted to a message`)

    reactors.forEach(async (u) => {
        let addUser = await msg.guild.addMemberRole(u.id, makeOneTimeRole.id, `Needs to be mentioned`)
    })

    bot.bot.createMessage(msg.channel.id, `One time role ready to go!`)
    //EVENTUALLY One time mention use so creates a role with all the reactors and once the role id is mentioned once in a message the role is deleted

}
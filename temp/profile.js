// npm requires
const f = require('util').format
const pc = require('swearjar')

// project files required
const config = require('./config.json')
const reply = require('./proto_messages.json')

//regex
const isHex = new RegExp(/^#[0-9A-F]{6}$/, 'i')
const matchUserMention = new RegExp('<@[0-9]{18}>')
const matchUserString = new RegExp('^[0-9]{18}')

const isID = (arg, msg) => {
	if (matchUserString.test(arg)) { 
		return arg 
	} else if (matchUserMention.test(arg)) { 
		return arg.substr(2, 18)
	} else if (msg.channel.guild.members.find(m => m.username == arg)) {
        let member = msg.channel.guild.members.find(m => m.username == arg);
        return member.id
    } else if (msg.channel.guild.members.find(m => m.nick == arg)) {
        let member = msg.channel.guild.members.find(m => m.nick == arg);
        return member.id 
    } else if (msg.channel.guild.members.find(m => m.username.startsWith(arg))) {
        let member = msg.channel.guild.members.find(m => m.username.startsWith(arg));
        return member.id
    } else { 
		return -1 
	}
}

const editView = (btUser, discUser) => {
	let tagline = 'Not set'
	let bio = 'Not set'
	let mature = 'Profanity **not** allowed'
	let private = 'Privacy set to **public**'
	let dnd = 'Do not disturb set to **off**'
	let color = 'Embed color: #' + btUser.eColor.slice(2)
	let weather = f('%s in degrees %s', btUser.weather.location, btUser.weather.deg)
	let tzone = 'not set'

	if (btUser.tagline.length !== 0)
		tagline = btUser.tagline
	if (btUser.bio.length !== 0)
		bio = btUser.bio
	if (btUser.mature)
		mature = 'Profanity **is** allowed'
	if (btUser.dnd)
		dnd = 'Do Not disturb set to **on**'
	if (btUser.tz !== null)
		tzone = btUser.tz

	var embed = {
		embed: {
			color: parseInt(btUser.eColor, 16),
			thumbnail: {url: discUser.avatarURL, width: 256, height:256},
			author: {name: discUser.username + `'s current settings.`, icon_url: discUser.avatarURL},
			fields: [
			{name: 'Tagline: ', value: tagline, inline: false},
			{name: 'Bio: ', value: bio, inline: false},
			{name: 'Mature: ', value: mature, inline: true},
			{name: 'Private: ', value: private, inline: true},
			{name: 'Do Not Disturb: ', value:dnd, inline: true},
			{name: 'Color', value: color, inline: true},
			{name: 'Weather:', value: weather, inline: true},
			{name: 'Timezone:', value: tzone, inline: true},
			{name: 'Following: ', value:btUser.following.length, inline: true},
			{name: 'Followers: ', value:btUser.followers.length, inline: true},
			{name: 'Blocked: ', value:btUser.blocked.length, inline: true}
			],
			footer: {text: 'broadcast Tower Station: '+ discUser.username}
		}
	}

	return embed
}

const viewView = (btUser, discUser) => {
	let tagline = 'Not set'
	let bio = 'Not set'
	let mature = 'No'
	let private = 'Public'
	let dnd = 'Off'
	let color = '#' + btUser.eColor.slice(2)

	if (btUser.tagline.length !== 0)
		tagline = btUser.tagline
	if (btUser.bio.length !== 0)
		bio = btUser.bio
	if (btUser.mature)
		mature = 'Yes'
	if (btUser.dnd)
		dnd = 'On'
	if (btUser.private)
		private = 'Private'

	var embed = {
		embed: {
			color: parseInt(btUser.eColor, 16),
			thumbnail: {url: discUser.avatarURL, width: 256, height:256},
			author: {name: discUser.username + `'s Broadcast Station.`, icon_url: discUser.avatarURL},
			fields: [
			{name: 'Tagline: ', value: tagline, inline: false},
			{name: 'Bio: ', value: bio, inline: false},
			{name: 'Profanity: ', value: mature, inline: true},
			{name: 'Private: ', value: private, inline: true},
			{name: 'Do Not Disturb: ', value:dnd, inline: true},
			{name: 'Color', value: color, inline: true},
			{name: 'Following: ', value:btUser.following.length, inline: true},
			{name: 'Followers: ', value:btUser.followers.length, inline: true},
			],
			footer: {text: 'broadcast Tower Station: '+ discUser.username}
		}
	}

	return embed
}

//base edit command
exports.edit = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		//get data
		let usee = await col.findOne({user: msg.author.id})
		let discUser = await bot.users.get(msg.author.id)

		//make profile embed
		let embed = editView(usee, discUser)

		bot.createMessage(msg.channel.id, embed)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

//base view command
exports.view = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		if (args.length === 0) {
			let usee = await col.findOne({user: msg.author.id})
			let discUser = await bot.users.get(msg.author.id)
			let embed = viewView(usee, discUser)
			bot.createMessage(msg.channel.id, embed)
			return
		}

		let secondID = isID(args.join(' '), msg)
		if (secondID === -1) {
			bot.createMessage(msg.channel.id, f(reply.view.unexpected, msg.author.id, args[0]))
			return
		}

		let discUser = await bot.users.get(secondID)
		let user = await col.findOne({user: secondID})
		if (user === null) {
			bot.createMessage(msg.channel.id, f(reply.generic.userNoAccount, msg.author.username, discUser.username))
			return
		}

		let embed = viewView(user, discUser)
		bot.createMessage(msg.channel.id, embed)
		return
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

//edit tagline
exports.setTagline = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		let usee = await col.findOne({user: msg.author.id})
		if (args.length === 0) {
			bot.createMessage(msg.channel.id, f(reply.tagline.current, msg.author.username, usee.tagline))
			return
		}

		let newTagline = args.join(' ')
		if (newTagline.length > 140) {
			bot.createMessage(msg.channel.id, f(reply.tagline.isTooLong, msg.author.username))
			return
		}

		if (pc.profane(newTagline)) {
			bot.createMessage(msg.channel.id, f(reply.tagline.isProfane, msg.author.username))
			return
		}

		//findone and update their tagline
		let update = await col.findOneAndUpdate({user:msg.author.id}, {$set: {tagline:newTagline}})
		if (update.ok === 1) {
			bot.createMessage(msg.channel.id, f(reply.tagline.success, msg.author.username, newTagline))
		} else {
			bot.createMessage(msg.channel.id, f(reply.tagline.error, msg.author.username, newTagline))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

//edit weather preference
exports.setWeather = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		let usee = await col.findOne({user: msg.author.id})
		if (args.length === 0) {
			bot.createMessage(msg.channel.id, f(reply.defWeather.current, msg.author.username, usee.weather.location, usee.weather.deg))
			return
		}

		let command = args.join(' ')
	    let location = command.split('-')[0].trim()

	    let degree = 'F'
	    if (command.split('-')[1] !== undefined) {
	      if (command.split('-')[1].trim().toUpperCase() === 'C' || command.split('-')[1].trim().toUpperCase() === 'F') {
	        degree = command.split('-')[1].trim().toUpperCase()
	      } else {
	        degree ='F'
	      }
	    }

		//findone and update their tagline
		let update = await col.findOneAndUpdate({user:msg.author.id}, {$set: {weather:{location:location, deg:degree}}})
		if (update.ok === 1) {
			bot.createMessage(msg.channel.id, f(reply.defWeather.success, msg.author.username, location, degree))
		} else {
			bot.createMessage(msg.channel.id, f(reply.defWeather.error, msg.author.username, location, degree))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}
//edit bio
exports.setBio = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		let usee = await col.findOne({user: msg.author.id})
		if (args.length === 0) {
			bot.createMessage(msg.channel.id, f(reply.bio.current, msg.author.username, usee.bio))
			return
		}

		let newBio = args.join(' ')
		if (newBio.length > 400) {
			bot.createMessage(msg.channel.id, f(reply.bio.isTooLong, msg.author.username))
			return
		}

		if (pc.profane(newBio)) {
			bot.createMessage(msg.channel.id, f(reply.bio.isProfane, msg.author.username))
			return
		}

		//findone and update their tagline
		let update = await col.findOneAndUpdate({user:msg.author.id}, {$set: {bio:newBio}})
		if (update.ok === 1) {
			bot.createMessage(msg.channel.id, f(reply.bio.success, msg.author.username, newBio))
		} else {
			bot.createMessage(msg.channel.id, f(reply.bio.error, msg.author.username, newBio))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

//set Mature
exports.setMature = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		let usee = await col.findOne({user: msg.author.id})
		if (usee.mature)
			var profanity = 'yes'
		else
			var profanity = 'no'

		if (args.length === 0) {
			bot.createMessage(msg.channel.id, f(reply.mature.current, msg.author.username, profanity))
			return
		}

		if (args[0].toLowerCase().startsWith('y')) {
			var setProfane = true
		} else if (args[0].toLowerCase().startsWith('n')) {
			var setProfane = false
		} else {
			bot.createMessage(msg.channel.id, f(reply.mature.unexpected, msg.author.username, args[0]))
			return
		}

		let update = await col.findOneAndUpdate({user:msg.author.id}, {$set: {mature:setProfane}})
		if (update.ok === 1) {
			bot.createMessage(msg.channel.id, f(reply.mature.success, msg.author.username, args[0]))
		} else {
			bot.createMessage(msg.channel.id, f(reply.mature.error, msg.author.username, args[0]))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

//set dnd
exports.setDND = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		let usee = await col.findOne({user: msg.author.id})
		if (usee.dnd)
			var dndSetTo = 'yes'
		else
			var dndSetTo = 'no'

		if (args.length === 0) {
			bot.createMessage(msg.channel.id, f(reply.dnd.current, msg.author.username, dndSetTo))
			return
		}

		if (args[0].toLowerCase().startsWith('y')) {
			var setdnd = true
		} else if (args[0].toLowerCase().startsWith('n')) {
			var setdnd = false
		} else {
			bot.createMessage(msg.channel.id, f(reply.dnd.unexpected, msg.author.username, args[0]))
			return
		}

		//findone and update their tagline
		let update = await col.findOneAndUpdate({user:msg.author.id}, {$set: {dnd:setdnd}})
		if (update.ok === 1) {
			bot.createMessage(msg.channel.id, f(reply.dnd.success, msg.author.username, args[0]))
		} else {
			bot.createMessage(msg.channel.id, f(reply.dnd.error, msg.author.username, args[0]))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

//set Private
exports.setPrivate = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		let usee = await col.findOne({user: msg.author.id})
		if (usee.private)
			var priv = 'yes'
		else
			var priv = 'no'

		if (args.length === 0) {
			bot.createMessage(msg.channel.id, f(reply.private.current, msg.author.username, priv))
			return
		}

		if (args[0].toLowerCase().startsWith('y')) {
			var setPriv = true
		} else if (args[0].toLowerCase().startsWith('n')) {
			var setPriv = false
		} else {
			bot.createMessage(msg.channel.id, f(reply.private.unexpected, msg.author.username, args[0]))
			return
		}

		let update = await col.findOneAndUpdate({user:msg.author.id}, {$set: {private:setPriv}})
		if (update.ok === 1) {
			bot.createMessage(msg.channel.id, f(reply.private.success, msg.author.username, args[0]))
		} else {
			bot.createMessage(msg.channel.id, f(reply.private.error, msg.author.username, args[0]))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

//edit embed colour
exports.setColor = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')
		let usee = await col.findOne({user: msg.author.id})

		if (args.length === 0) {
			bot.createMessage(msg.channel.id, f(reply.color.current, msg.author.username, usee.eColor))
			return
		}

		//check is usee is premium
		if (usee.premium < 1) {
			bot.createMessage(msg.channel.id, f(reply.color.premium, msg.author.username))
			return
		}

		if (isHex.test(args[0])) {
			var color = '0x' + args[0].slice(1)
		} else {
			bot.createMessage(msg.channel.id, f(reply.color.unexpected, msg.author.username, args[0]))
			return
		}

		let update = await col.findOneAndUpdate({user:msg.author.id}, {$set: {eColor:color}})
		if (update.ok === 1) {
			bot.createMessage(msg.channel.id, f(reply.color.success, msg.author.username, args[0]))
		} else {
			bot.createMessage(msg.channel.id, f(reply.color.error, msg.author.username, args[0]))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.list = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		if (args.length === 0) {
			bot.createMessage(msg.channel.id, f(reply.list.isOneOf, msg.author.username))
			return
		}	else if (!['following', 'followers', 'blocked'].includes(args[0])) {
			bot.createMessage(msg.channel.id, f(reply.list.notAlist, msg.author.username))
			return
		}

		let usee = await col.findOne({user: msg.author.id})
		let list = []
		if(usee[args[0]].length === 0) {
			list.push(reply.list.empty) 
		} else {
			for (var usr in usee[args[0]]) {
				let user = bot.users.get(usee[args[0]][usr])
				if(user !== undefined)
					list.push(user.username)
			}
		}

		let embed = {
			embed: {
				author: {name: f(reply.list[args[0]], msg.author.username), icon_url: msg.author.avatarURL},
				description: list.join('\n'),
				color: parseInt(usee.eColor, 16)
			}
		}

		bot.createMessage(msg.channel.id, embed)
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.setTimezone = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')
		const timezones = client.db(config.db).collection('Timezones')

		let usee = await col.findOne({user: msg.author.id})
		if (args.length === 0) {
			bot.createMessage(msg.channel.id, f(reply.timezone.current, msg.author.username, usee.timezone))
			return
		}

		let timezone = args.join('_')
		let found = await timezones.findOne({zone_name:timezone})
		if (found === null) {
			bot.createMessage(msg.channel.id, f(reply.timezone.notATZ, msg.author.username))
			return
		}

		let update = await col.findOneAndUpdate({user:msg.author.id}, {$set: {tz:timezone}})
		if (update.ok === 1) {
			bot.createMessage(msg.channel.id, f(reply.timezone.success, msg.author.username, args.join(' ')))
		} else {
			bot.createMessage(msg.channel.id, f(reply.timezone.error, msg.author.username, args.join(' ')))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.setPremium = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		let secondID = isID(args[0], msg)
		if (secondID === -1) {
			bot.createMessage(msg.channel.id, f(reply.view.unexpected, msg.author.id, args[0]))
			return
		}

		let user = await col.findOne({user: args[0]})
		if (user === -1) {
			bot.createMessage(msg.channel.id, f(reply.generic.userNoAccount, msg.author.id, args[0]))
			return
		}

		if(parseInt(args[1]) === NaN) {
			bot.createMessage(msg.channel.id, f('%s enter a number not %s', msg.author.id, args[1]))
			return
		}

		let update = await col.findOneAndUpdate({user:msg.author.id}, {$set: {premium:args[1]}})
		if (update.ok === 1) {
			bot.createMessage(msg.channel.id, f('%s premium set to %s for %s', msg.author.username, args[1], args[0]))
		} else {
			bot.createMessage(msg.channel.id, f('%s premium could not be set to %s for %s', msg.author.username, args[1], args[0]))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}
const bot = require('./core.js')
const f = require('util').format

//Sets for each module
const weatherSet = new Set()
const spotifySet = new Set()
const remindSet = new Set()
const ntsSet = new Set()
const r6Set = new Set()
const pubgSet = new Set()
const lolSet = new Set()
const owSet = new Set()
const pmSet = new Set()

let shortCD = {
	weather: weatherSet,
	spotify: spotifySet,
	nts: ntsSet,
	r6: r6Set,
	pubg: pubgSet,
	lol: lolSet,
	ow: owSet 
}

let longCD = {
	remind: remindSet,
	pm: pmSet
}


exports.short = async (setName, msg) => {
	//if name is in list send cooldown message, if not add name to list for 5 seconds
	if (shortCD[setName].has(msg.author.id)) {
		let warning = await bot.bot.createMessage(msg.channel.id, f(`%s, slow down buddy! Wait 5 seconds please.`, msg.author.username))
		setTimeout(() => {
			warning.delete('clean up responses')
		}, 2000)
		return false
	} else {
		shortCD[setName].add(msg.author.id)
		setTimeout(() => {
			shortCD[setName].delete(msg.author.id)
		}, 5000)
		return true
	}
}

exports.long = async (setName, msg) => {
	//if name is in list send cooldown message, if not add name to list for 30 seconds
	if (longCD[setName].has(msg.author.id)) {
		let warning = await bot.bot.createMessage(msg.channel.id, f(`%s, slow down buddy! Wait 30 seconds please.`, msg.author.username))
		setTimeout(() => {
			warning.delete('clean up responses')
		}, 5000)
		return false
	} else {
		longCD[setName].add(msg.author.id)
		setTimeout(() => {
			longCD[setName].delete(msg.author.id)
		}, 30000)
		return true
	}
}


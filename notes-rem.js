//module imports
const f = require('util').format
const MongoClient = require('mongodb').MongoClient

// project files required
const config = require('./config.json')
const reply = require('./proto_messages.json')

// mongodb login
const user = encodeURIComponent(config.user)
const password = encodeURIComponent(config.pass)
const authMechanism = 'DEFAULT'
const url = f('mongodb://%s:%s@127.0.0.1:36505/broadcast_tower?authMechanism=%s', user, password, authMechanism)

exports.noteToSelf = async (msg, args, bot) => {
	try{
		let client = await MongoClient.connect(url)
		const usersCol = client.db(config.db).collection('Users')

		let usee = await usersCol.findOne({user: msg.author.id})
		if (usee === null) {
			bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, msg.author.username))
			return
		}

		let files = []
		if (msg.attachments.length !== 0) {
			for(i in msg.attachments) {
				files.push(f(`\n[%s](%s)`, msg.attachments[i].filename, msg.attachments[i].url))
			}
		}

		let toPin = await bot.createMessage(usee.sendTo, f(`**Note:** %s%s`, args.join(' '), files.join(' ')))

		let pinned = await toPin.pin()

		let msgToDel = await toPin.channel.getMessages(1,undefined, toPin.id)

		let deleted = await toPin.channel.deleteMessage(msgToDel[0].id)

		bot.createMessage(msg.channel.id, `Got it boss, note made!`)
	} catch (err) {
		console.log(err)
		bot.createMessage(msg.channel.id, `Sorry boss my pencil broke`)
	} 
}

exports.getNotes = async (msg, args, bot) => {
	try{
		let client = await MongoClient.connect(url)
		const usersCol = client.db(config.db).collection('Users')

		let usee = await usersCol.findOne({user: msg.author.id})
		if (usee === null) {
			bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, msg.author.username))
			return
		}

		let dmChannel = await bot.getDMChannel(msg.author.id)

		let noteMsgs = await dmChannel.getPins()

		let notes = []
		for (m = 0; m < noteMsgs.length; m++) {
			index = m + 1
			date = new Date(noteMsgs[m].timestamp)
			notes.push({name: 'Note ' + index, value: f(`%s | created %s`, noteMsgs[m].content, date.toDateString()), inline:false})
		}

		if (notes.length === 0)
			notes.push({name: 'Note', value:`No notes found! Create a note with b.nts!`, inline:false})

		let embed = {
			embed: {
				author: {name: f(`%s's notes:`, msg.author.username), icon_url: msg.author.avatarURL},
				fields: notes,
				color: parseInt(usee.eColor, 16),
				footer: {text: `Powered by the Broadcast Tower`}	
			}
		}

		bot.createMessage(msg.channel.id, embed)

	} catch (err) {
		bot.createMessage(msg.channel.id, `Sorry boss my pencil broke`)
	} 
}

exports.unNote = async (msg, args, bot) => {
	try{
		let client = await MongoClient.connect(url)
		const usersCol = client.db(config.db).collection('Users')

		let usee = await usersCol.findOne({user: msg.author.id})
		if (usee === null) {
			bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, msg.author.username))
			return
		}

		let dmChannel = await bot.getDMChannel(msg.author.id)

		let noteMsgs = await dmChannel.getPins()

		if (parseInt(args[0]) === NaN) {
			bot.createMessage(msg.channel.id, `Sorry boss that's not a number!`)
			return
		}

		let deleteMessage = dmChannel.deleteMessage(noteMsgs[parseInt(args[0]) - 1].id)

		bot.createMessage(msg.channel.id, `Note deleted boss!`)

	} catch (err) {
		bot.createMessage(msg.channel.id, `Sorry boss my pencil broke`)
	}

}

//reminders time!

//function to connect to the db and add a reminder, need to parse time into date
exports.remindMe = async (msg, args, bot) => {

	if (!args.includes('in')) {
		bot.createMessage(msg.channel.id, 'Missing keyword `in` cannot guess when you want to be reminded')
		return
	}

	try { 
		let client = await MongoClient.connect(url)
		const usersCol = client.db(config.db).collection('Users')
		const remCol = client.db(config.db).collection('Reminders')

		let usee = await usersCol.findOne({user: msg.author.id})
		if (usee === null) {
			bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, msg.author.username))
			return
		}

		let format = new RegExp(/[0-9]*[yMdhm]{1,5}/)
		let wrongM = new RegExp(/[0-9]*m(?=[0-9]*d)/)

		let message = args.join(' ')

		//parse message
		let eom = message.lastIndexOf('in')
		let reminder = `You wanted me to remind you: ` + message.slice(0, eom).trim()
		let rawDate = message.slice(eom+2, message.length).trim().replace(/\s/g, '')

		if (wrongM.test(rawDate)) {
			bot.createMessage(msg.channel.id, 'Detected minutes before days!')
		} else if (!format.test(rawDate)) {
			bot.createMessage(msg.channel.id, 'Sorry I don\'t understand the format is yMdm')
		} else {
			let timeTypes = rawDate.split(/[0-9]*/).filter(val => val.length > 0)
			let timeAmounts = rawDate.split(/[yMdhm]/).filter(val => val.length > 0)
			let curDate = new Date()
			let remYear = curDate.getFullYear()
			let remMonth = curDate.getMonth()
			let remDay = curDate.getDate()
			let remHours = curDate.getHours()
			let remMins = curDate.getMinutes()

			if (timeTypes.indexOf('y') > -1)
				remYear += parseInt(timeAmounts[timeTypes.indexOf('y')])

			if (timeTypes.indexOf('M') > -1)
				remMonth += parseInt(timeAmounts[timeTypes.indexOf('M')])

			if (timeTypes.indexOf('d') > -1)
				remDay += parseInt(timeAmounts[timeTypes.indexOf('d')])
			
			if (timeTypes.indexOf('h') > -1)
				remHours += parseInt(timeAmounts[timeTypes.indexOf('h')])

			if (timeTypes.indexOf('m') > -1)
				remMins += parseInt(timeAmounts[timeTypes.indexOf('m')])

			let remDate = new Date( remYear, remMonth, remDay, remHours, remMins)

			let reminderObj = {
				user: usee.user,
				sendTo: usee.sendTo,
				content: reminder,
				due: remDate,
				type: 'reminder'
			}

			let addRem = await remCol.insertOne(reminderObj)
			if (addRem.insertedCount === 1)
				bot.createMessage(msg.channel.id, f('Got it I\'ll remind you: %s in %s', message.slice(0, eom).trim(), rawDate))
			else
				bot.createMessage(msg.channel.id, 'Uh oh! I can\'t remember that for you right now!')
			
		}
	} catch (err) {
		console.log(err)
	}
}

//function to pull all reminders expiring in 1 minute or less and create timeouts for them that push messages to the q
//index.js will call this function every minute
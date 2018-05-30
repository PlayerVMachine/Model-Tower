// npm requires
const f = require('util').format
const pc = require('swearjar')
const crypto = require('crypto')

// project files required
const config = require('./config.json')
const reply = require('./proto_messages.json')

//regex
const nonPrintingChars = new RegExp(/[\x00-\x09\x0B\x0C\x0E-\x1F\u200B]/g)
const matchUserMention = new RegExp('<@[0-9]{18}>')
const matchUserString = new RegExp('^[0-9]{18}')

//check if input is a user id or mention
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

const safetyChecks = async (msg, secondID, col, bot) => {
	if (secondID === -1) {
		bot.createMessage(msg.channel.id, f(reply.generic.invalidID, msg.author.username, msg.content.split(' ')[1]))
		return false
	}

	if (secondID === msg.author.id) {
		bot.createMessage(msg.channel.id, f(reply.generic.cannotDoToSelf, msg.author.username))
		return false
	}

	let isBot = await bot.users.get(secondID)
	if (isBot === undefined) {
		bot.createMessage(msg.channel.id, f(reply.generic.userUnknown, msg.author.username, msg.content.split(' ')[1]))
		return false
	} else if (isBot.bot){
		bot.createMessage(msg.channel.id, f(reply.generic.cannotDoToBots, msg.author.username))
		return false
	}

	let followeeHasAccount = await col.findOne({user: secondID})

	if (followeeHasAccount === null) {
		let second = await bot.users.get(secondID)
		bot.createMessage(msg.channel.id, f(reply.generic.userNoAccount, msg.author.username, second.username))
		return false
	}

  //checks passed
  return true
}

exports.follow = async(msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		//get user data
		let usee = await col.findOne({user: msg.author.id})
		
		//check for undesirable conditions
		let secondID = isID(args.join(' '), msg)
		let safe = await safetyChecks(msg, secondID, col, bot)
		if (!safe)
			return	//something was wrong with the input and the user was told

		//grab the second person's username
		let second = await bot.users.get(secondID)

		//already following
		let isInList = usee.following.includes(secondID)
		if (isInList) {
			bot.createMessage(msg.channel.id, f(reply.follow.already, msg.author.username, second.username))
			let beSure = await col.findOneAndUpdate({user: secondID}, {$addToSet: {following: msg.author.id}})
			return
		}

		//you blocked them!
		let isBlocked = usee.blocked.includes(secondID)
		if (isBlocked) {
			bot.createMessage(msg.channel.id, f(reply.follow.followeeBlocked, msg.author.username, second.username))
			return
		}

		//they blocked you!
		let theyBlocked = await col.findOne({user:secondID, blocked: msg.author.id})
		if (theyBlocked !== null) {
			bot.createMessage(msg.channel.id, f(reply.follow.followeeBlocked, second, msg.author.username))
			return
		}

		//follow a user whose account is private
		let secondUsee = await col.findOne({user: secondID})
		if (secondUsee.private) {
			bot.createMessage(msg.channel.id, f(reply.follow.sent, msg.author.username, second.username))
			let folReq = await bot.createMessage(secondUsee.sendTo, f(reply.follow.request, msg.author.username))
			bot.addMessageReaction(secondUsee.sendTo, folReq.id, '❌')
			bot.addMessageReaction(secondUsee.sendTo, folReq.id, '✅')

			const folRes = async (message, emoji, userID) => {
				if (userID !== secondID)
					return

				if (emoji.name === '❌') {
					bot.editMessage(message.channel.id, folReq.id, f(reply.follow.privDeny, msg.author.username))
					bot.createMessage(usee.sendTo, f(reply.follow.denied, msg.author.username, second.username))
				} else if (emoji.name === '✅') {
					let addToFollowing = await col.findOneAndUpdate({user: msg.author.id}, {$addToSet: {following: secondID}})
					let addToFollowers = await col.findOneAndUpdate({user: secondID}, {$addToSet: {followers: msg.author.id}})
					if (addToFollowers.ok === 1 && addToFollowing.ok) {
						bot.createMessage(usee.sendTo, f(reply.follow.success, msg.author.username, second.username))
						bot.editMessage(message.channel.id, folReq.id, f(reply.follow.privAck, msg.author.username))
					}
				}
				bot.removeListener('messageReactionAdd', folRes)
			}

			bot.on('messageReactionAdd', folRes)
			return
		}

		//follow a user whose account is public
		let addToFollowing = await col.findOneAndUpdate({user: msg.author.id}, {$addToSet: {following: secondID}})
		let addToFollowers = await col.findOneAndUpdate({user: secondID}, {$addToSet: {followers: msg.author.id}})
		if (addToFollowers.ok === 1 && addToFollowing.ok) {
			bot.createMessage(msg.channel.id, f(reply.follow.success, msg.author.username, second.username))
		} else {
			bot.createMessage(msg.channel.id, f(reply.follow.error, msg.author.username, second.username))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.unfollow = async(msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		//check is usee is a user
		let usee = await col.findOne({user: msg.author.id})
		
		//check for undesirable conditions
		let secondID = isID(args[0].join(' '), msg)
		let safe = await safetyChecks(msg, secondID, col, bot)
		if (!safe)
			return	//something was wrong with the input and the user was told

		//grab their username
		let second = bot.users.get(secondID)

		//check if they've been blocked
		let isInBlocked = await col.findOne({user: secondID, blocked: msg.author.id})
		if (isInBlocked !== null) {
			bot.createMessage(msg.channel.id, f(reply.unfollow.blocked, msg.author.username, second.username))
			return
		}

		//is not in list
		let isInList = usee.following.includes(secondID)
		if (!isInList) {
			bot.createMessage(msg.channel.id, f(reply.unfollow.notFollowing, msg.author.username, second.username))
			let beSure = await col.findOneAndUpdate({user: secondID}, {$pull: {followers: msg.author.id}})
			return
		}

		//unfollow
		let remFromFollowing = await col.findOneAndUpdate({user: msg.author.id}, {$pull: {following: secondID}})
		let remFromFollowers = await col.findOneAndUpdate({user: secondID}, {$pull: {followers: msg.author.id}})
		if (remFromFollowers.ok === 1 && remFromFollowing.ok) {
			bot.createMessage(msg.channel.id, f(reply.unfollow.success, msg.author.username, second.username))
		} else {
			bot.createMessage(msg.channel.id, f(reply.unfollow.error, msg.author.username, second.username))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.block = async(msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		let usee = await col.findOne({user: msg.author.id})

		//check for undesirable conditions
		let secondID = isID(args.join(' '), msg)
		let safe = await safetyChecks(msg, secondID, col, bot)
		if (!safe)
			return	//something was wrong with the input and the user was told

		//grab their username
		let second = await bot.users.get(secondID)

		//is in list
		let isInList = usee.blocked.includes(secondID)
		if (isInList) {
			bot.createMessage(msg.channel.id, f(reply.block.already, msg.author.username, second.username))
			let beSure = await col.findOneAndUpdate({user: secondID}, {$pull: {followers: msg.author.id}})
			let beSurex2 = await col.findOneAndUpdate({user: msg.author.id}, {$pull: {following: secondID}})
			return
		}

		//block them
		let blocked = await col.findOneAndUpdate({user: msg.author.id}, {$addToSet: {blocked: secondID}})
		let remFromFollowers = await col.findOneAndUpdate({user: secondID}, {$pull: {followers: msg.author.id, following: msg.author.id}})
		let remFromFollowing = await col.findOneAndUpdate({user: msg.author.id}, {$pull: {following: secondID, followers: secondID}})
		if (blocked.ok === 1 && remFromFollowing.ok === 1 && remFromFollowers.ok === 1) {
			bot.createMessage(msg.channel.id, f(reply.block.success, msg.author.username, second.username))
		} else {
			bot.createMessage(msg.channel.id, f(reply.block.error, msg.author.username, second.username))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.unblock = async(msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')

		let usee = await col.findOne({user: msg.author.id})

		//check for undesirable conditions
		let secondID = isID(args.join(' '), msg)
		let safe = await safetyChecks(msg, secondID, col, bot)
		if (!safe)
			return	//something was wrong with the input and the user was told

		//grab their username
		let second = await bot.users.get(secondID)

		//is in list
		let isInList = usee.blocked.includes(secondID)
		if (!isInList) {
			bot.createMessage(msg.channel.id, f(reply.unblock.notBlocked, msg.author.username, second.username))
			return
		}

		//unblock them
		let remFromBlocked = await col.findOneAndUpdate({user: msg.author.id}, {$pull: {blocked: secondID}})
		if (remFromBlocked.ok === 1) {
			bot.createMessage(msg.channel.id, f(reply.unblock.success, msg.author.username, second.username))
		} else {
			bot.createMessage(msg.channel.id, f(reply.unblock.error, msg.author.username, second.uaername))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.post = async (msg, args, bot, q, client) => {
	try {
		const col = client.db(config.db).collection('Users')
		const postCol = client.db(config.db).collection('Posts')
		var medit

		let sender = await col.findOne({user: msg.author.id})

		//no blank posts
		if(args.length === 0) {
			bot.createMessage(msg.channel.id, f(reply.post.noBlankPost, msg.author.username))
			return
		}

		//no non-printing characters
		let message = args.join(' ')
		if (nonPrintingChars.test(message)) {
			bot.createMessage(msg.channel.id, f(reply.post.noNonPrinting, msg.author.username))
			return
		}

		let followers = sender.followers
		let resChannel = sender.sendTo

		let color = parseInt(config.color, 16)
		if (sender.premium > 0) {
			color = parseInt(sender.eColor, 16)
		}

		//msg id for searching
		let rndBytes = crypto.randomBytes(4)
		let msgid = rndBytes.toString('hex')

		let embed = {
    		embed: {
    			title: 'New broadcast recieved! ',
      			description: f('**%s**: %s', msg.author.username, message),
      			author: { name: msg.author.username, icon_url: msg.author.avatarURL },
      			color: color,
      			footer: { text: 'Author id: ' + msg.author.id + ' message id: ' + msgid}
    		}
    	}

		const callback = async (message, emoji, userID) => {
			if(userID === msg.author.id &&  emoji.name === '❌') {
				try {
					bot.editMessage(msg.channel.id, remMessage.id, 'transmission cancelled')
				} catch (e) {
					//no message to delete
				}
				bot.removeListener('messageReactionAdd', callback)
				clearTimeout(medit)
			}
		}

		let remMessage = await bot.createMessage(msg.channel.id, 'Your post is scheduled to broadcast in 5s, react with :x: to cancel')
		bot.addMessageReaction(msg.channel.id, remMessage.id, '❌')
		bot.on('messageReactionAdd', callback)

		medit = setTimeout(async (remID) => {
			//remove ability to cancel
			bot.removeListener('messageReactionAdd', callback)
			bot.deleteMessage(msg.channel.id, remID, 'Timeout expired')

			let recipients = sender.followers.map(x => x)
			recipients.push(msg.author.id)

			let recordPost = await postCol.insertOne({
					source: msg.author.id,
    				content: embed,
    				msgid: msgid,
    				recipients: recipients,
    				lastUpdated: new Date()
    			})

			for (i = 0; i < followers.length; i++) {
				let recipient = await col.findOne({user: followers[i]})

				let packet = {
    				content: embed,
    				destination: recipient.sendTo,
    				source: msg.author.id,
    				type: 'post',
				}

				q.push(packet)
			}
			if (followers.length > 0) {

				let packet = {
    				content: f(reply.post.sentConfirm, message),
    				destination: sender.sendTo,
    				type: 'system',
				}				

				q.push(packet)
			}
		}, 5000, remMessage.id)

	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.reply = async (msg, args, bot, q, client) => {
	try {
		const col = client.db(config.db).collection('Users')
		const postCol = client.db(config.db).collection('Posts')
		
		let usee = await col.findOne({user: msg.author.id})

		//get a message
		let postid = args.shift()
		let message = await postCol.findOne({msgid: postid})
		if(message === null){
			//wrong post id
			bot.createMessage(msg.channel.id, f('Sorry %s, I couldn\'t find a post with that ID!', msg.author.username))
			return
		} else if (!message.recipients.includes(msg.author.id)) {
			//entered a post id that they didn't recieve
			bot.createMessage(msg.channel.id, f('Sorry %s, you cannot reply to a post that was not sent to you!', msg.author.username))
			return
		} //found post and they recieved it

		//get the author of the post
		let poster = await col.findOne({user: message.source})
		if (poster === undefined) {
			//poster has since closed account
			bot.createMessage(msg.channel.id, f('Sorry %s, cannot reply to a user who no longer has an account!', msg.author.username))
			return			
		}

		//check that neither party has blocked each other since message was sent
		if (poster.blocked.includes(usee.user)) {
			bot.createMessage(msg.channel.id, f('Sorry %s, cannot reply to a user who has blocked you!', msg.author.username))
			return	
		} else if (usee.blocked.includes(poster.user)) {
			bot.createMessage(msg.channel.id, f('Sorry %s, cannot reply to a user who you have blocked!', msg.author.username))
			return	
		} //neither orignal author nor replier has blocked each other

		//update the embedded message
		message.content.embed.title = 'New reply to post!'
		message.content.embed.description = message.content.embed.description + f('\n**%s**: %s', msg.author.username, args.join(' '))
		message.lastUpdated = new Date()

		//store the updated message in the db
		let storeReply = await postCol.replaceOne({msgid: postid}, message)
		if (storeReply.modifiedCount !== 1) {
			bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
			return
		}

		//check for redactions that need to be made if any of the post recipients have blocked usee or vice versa
		for (r in message.recipients) {
			let msgCopy = JSON.parse(JSON.stringify(message))
			let descCopy = msgCopy.content.embed.description.split('\n')

			//skip this recpient as they no longer have an account			
			let recipient = await col.findOne({user:message.recipients[r]})
			if (recipient === undefined) {
				message.recipients[r]
				continue
			}

			//redact message copy
			if (usee.blocked.includes(recipient.user)) {
	
				for (l in descCopy) {
					if (descCopy[l].startsWith('**'+ msg.author.username))
						descCopy[l] = '_Reply from user who has blocked you_'
				}

			} else if (recipient.blocked.includes(usee.user)) {
				for (l in descCopy) {
					if (descCopy[l].startsWith('**'+ msg.author.username))
						descCopy[l] = '_Reply from user who you have blocked_'
				}
			}

			msgCopy.content.embed.description = descCopy.join('\n')

			//schedule post in queue
			let packet = {
    			content: msgCopy.content,
    			destination: recipient.sendTo,
    			source: msg.author.id,
    			type: 'post',
			}

			q.push(packet)
		}


	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.report = async (msg, args, bot, client) => {
	try {
		const col = client.db(config.db).collection('Users')
		let usee = await col.findOne({user: msg.author.id})

		//get a message
		let message = undefined
		let messages = await msg.channel.getMessages(50, msg.id)
		for (i in messages) {
			if (messages[i].embeds.length > 0) {
				if (messages[i].embeds[0].footer !== undefined) {
					let foot = messages[i].embeds[0].footer.text.split(' ')
					if(foot.includes(args[0])) {
						message = messages[i]
						break
					}
				}
			}
		}

		if (message === undefined) {
			bot.createMessage(msg.channel.id, reply.report.notMsg)
			return
		}

		args.shift()
		let embed = message.embeds[0]

		msg.channel.addMessageReaction(message.id, '🚓')
		bot.createMessage('447987469678280705', {embed})
		bot.createMessage('447987469678280705', args.join(' '))
		bot.createMessage(msg.channel.id, reply.report.submitted)

	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}

exports.leaveThread = async (msg, args, bot, client) => {
	try {
		const postCol = client.db(config.db).collection('Posts')

		let left = await postCol.updateOne({msgid:args[0]}, {$pull: {recipients:msg.author.id}})
		if(left.modifiedCount === 0) {
			bot.createMessage(msg.channel.id, f('%s, sorry that doesn\'t seem to be a post id or you aren\'t in that thread.', msg.author.username))
		} else {
			bot.createMessage(msg.channel.id, f('%s, you will no longer recieve updates from this thread! This action is permanent.', msg.author.username))
		}
	} catch (err) {
		console.log(err)
		bot.createMessage(config.logChannelID, err.message)
		bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
	}
}
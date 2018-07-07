//Module imports
const MongoClient = require('mongodb').MongoClient
const f = require('util').format

//project files required
const config = require('../config.json')
const bot = require('../core.js')
const resolver = require('../resolver.js')
const spotify = require('../utilities/spotify.js')

// mongodb login
const url = 'mongodb://127.0.0.1:36505'

exports.commandHandler = (msg, args) => {
    let restOfArgs = args.slice(1)

    if(['notify'].includes(args[0])) {
        subscribeToGuildAnnouncementChannel(msg, restOfArgs)
    } else if (['unnotify'].includes(args[0])) {
        unsubscribeFromGuildAnnouncementChannel(msg, restOfArgs)
    } else if (['sub', 'follow'].includes(args[0])) {
        subscribeToUser(msg, restOfArgs)
    } else if (['unsub', 'unfollow'].includes(args[0])) {
        unsubscribeFromUser(msg, restOfArgs)
    } else if (['subscriptions', 'mysubs'].includes(args[0])) {
        listSubscriptions(msg, args)
    }
}


//Register mailbox for a user if it does not exist
const registerMailbox = async (userid) => {
    try {
        let client = await MongoClient.connect(url)
        let col = client.db('model_tower').collection('mailboxes')

        let mailbox = {
            _id: userid,
            spotify: false,
            subscriptions: [],
            news: []
        }

        let findUser = await col.findOne({_id:userid})
        if(!findUser) {
            let register = await col.insertOne(mailbox)
            if (register.insertedCount == 1)
                return true
            else
                return false

        } else {
            return true
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: registerMailbox`, new Date(), err.message))
        return false
    }
}

//export for postManager
exports.registerMailbox = registerMailbox

const subscribeToGuildAnnouncementChannel = async (msg, args) => {
    try {
        let validateMailbox = await registerMailbox(msg.author.id)

        if (!validateMailbox) {
            bot.bot.createMessage(msg.channel.id, `Sorry could not register subscription.`)
        }

        let client = await MongoClient.connect(url)
        let mailboxes = client.db('model_tower').collection('mailboxes')
        let guild_announcers = client.db('model_tower').collection('guild_announcers')

        let guild_announcer = await guild_announcers.findOne({_id:msg.channel.guild.id})
        if(guild_announcer.announcements) {
            let checkSubs = await mailboxes.findOne({$and: [ {_id:msg.author.id}, {subscriptions:guild_announcer.announcements} ]})
            if (checkSubs) {
                bot.bot.createMessage(msg.channel.id, f(`Sorry %s, you're already subscribed to %s`, msg.author.username, resolver.channel(msg.channel.guild.channels, guild_announcer.announcements).mention))
                return
            }

            let subscribe = await mailboxes.updateOne({_id:msg.author.id}, {$addToSet: {subscriptions:guild_announcer.announcements}})
            if (subscribe.result.ok != 1) {
                console.log(f(`Could not subscribe to %s for %s`, guild_announcer.channel, msg.author.id))
            } else {
                bot.bot.createMessage(msg.channel.id, f(`Subscribed to %s's announcement channel!`, msg.channel.guild.name))
            }
        } else {
            bot.bot.createMessage(msg.channel.id, f(`%s does not have an announcement channel!`, msg.channel.guild.name))
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: subscribeToGuildAnnouncementChannel`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

const unsubscribeFromGuildAnnouncementChannel = async (msg, args) => {
    try {
        let validateMailbox = await registerMailbox(msg.author.id)

        if (!validateMailbox) {
            bot.bot.createMessage(msg.channel.id, `Sorry could not unsubscribe.`)
        }

        let client = await MongoClient.connect(url)
        let mailboxes = client.db('model_tower').collection('mailboxes')
        let guild_announcers = client.db('model_tower').collection('guild_announcers')

        let guild_announcer = await guild_announcers.findOne({_id:msg.channel.guild.id})
        if(guild_announcer.announcements) {
            let subscribe = await mailboxes.updateOne({_id:msg.author.id}, {$pull: {subscriptions:guild_announcer.announcements}})
            if (subscribe.result.ok != 1) {
                console.log(f(`Could not unsubscribe from %s for %s`, guild_announcer.channel, msg.author.id))
            } else {
                bot.bot.createMessage(msg.channel.id, f(`Unsubscribed from %s's announcement channel!`, msg.channel.guild.name))
            }
        } else {
            bot.bot.createMessage(msg.channel.id, f(`%s does not have an announcement channel!`, msg.channel.guild.name))
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: unsubscribeFromGuildAnnouncementChannel`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

const subscribeToUser = async (msg, args) => {
    try {
        let user = resolver.user(bot.bot.users, args[0])
        console.log(user)

        if(msg.author.id == user.id) {
            bot.bot.createMessage(msg.channel.id, `Cannot subscribe to yourself!`)
            return
        }

        let validateMailbox = await registerMailbox(msg.author.id)

        if (!validateMailbox) {
            bot.bot.createMessage(msg.channel.id, `Sorry could not register subscription.`)
            return
        }

        let client = await MongoClient.connect(url)
        let mailboxes = client.db('model_tower').collection('mailboxes')

        if (user) {
            let checkSubs = await mailboxes.findOne({$and: [ {_id:msg.author.id}, {subscriptions:user.id} ]})
            if (checkSubs) {
                bot.bot.createMessage(msg.channel.id, f(`Sorry %s, you're already subscribed to %s`, msg.author.username, user.username))
                return
            }

            let subscribe = await mailboxes.updateOne({_id:msg.author.id}, {$addToSet: {subscriptions:user.id}})
            if (subscribe.result.ok != 1) {
                console.log(f(`Could not subscribe to %s for %s`, user.id, msg.author.id))
            } else {
                bot.bot.createMessage(msg.channel.id, f(`Subscribed to %s's posts!`, user.username))
            }
        } else {
            bot.bot.createMessage(msg.channel.id, f(`Could not find user: %s`, args[0]))
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: subscribeToUser\n%s`, new Date(), err.message, err.stack.split('\n', 2).join('\n')))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

const unsubscribeFromUser = async (msg, args) => {
    try {
        let validateMailbox = await registerMailbox(msg.author.id)

        if (!validateMailbox) {
            bot.bot.createMessage(msg.channel.id, `Sorry could not unsubscribe.`)
        }

        let client = await MongoClient.connect(url)
        let mailboxes = client.db('model_tower').collection('mailboxes')

        let user = resolver.user(bot.bot.users, args[0])
        if (user) {
            let subscribe = await mailboxes.updateOne({_id:msg.author.id}, {$pull: {subscriptions:user.id}})
            if (subscribe.result.ok != 1) {
                console.log(f(`Could not unsubscribe from %s for %s`, user.id, msg.author.id))
            } else {
                bot.bot.createMessage(msg.channel.id, f(`Unsubscribed from %s's posts!`, user.username))
            }
        } else {
            bot.bot.createMessage(msg.channel.id, f(`Could not find user: %s`, args[0]))
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: unsubscribeFromUser`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

const listSubscriptions = async (msg, args) => {
    try {
        let client = await MongoClient.connect(url)
        let col = client.db('model_tower').collection('mailboxes')

        let mailbox = await col.findOne({_id:msg.author.id})
        if (mailbox) {
            bot.bot.createMessage(msg.channel.id, f(`Subscriptions: %s`, mailbox.subscriptions.join(', ')))
        } else {
            bot.bot.createMessage(msg.channel.id, f(`Sorry %s, I couldn't find your mailbox`, msg.author.username))
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: listSubscriptions`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

const blockUserFromSubscribing = async (msg, args) => {
    try {
        //block user, store in blocker or blockee mailbox object?
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: subscribeToGuildAnnouncementChannel`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}
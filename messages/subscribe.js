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
    }
}


//Register mailbox for a user if it does not exist
const registerMailbox = async (userid) => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('mailboxes')

    let mailbox = {
        _id: userid,
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
}

//export for postManager
exports.registerMailbox = registerMailbox

const = subscribeToGuildAnnouncementChannel = async (msg, args) => {
    let validateMailbox = await registerMailbox(msg.author.id)

    if (!validateMailbox) {
        bot.bot.createMessage(msg.channel.id, `Sorry could not register subscription.`)
    }

    let client = await MongoClient.connect(url)
    let mailboxes = client.db('model_tower').collection('mailboxes')
    let guild_announcers = client.db('model_tower').collection('guild_announcers')

    let guild_announcer = await guild_announcers.findOne({_id:msg.channel.guild.id})
    if(guild_announcer.announcements) {
        let subscribe = await mailboxes.updateOne({_id:msg.author.id}, {$addToSet: {subscriptions:guild_announcer.announcements}})
        if (subscribe.result.ok != 1) {
            console.log(f(`Could not subscribe to %s for %s`, guild_announcer.channel, msg.author.id))
        } else {
            bot.bot.createMessage(msg.channel.id, f(`Subscribed to %s's announcement channel!`, msg.channel.guild.name))
        }
    } else {
        bot.bot.createMessage(msg.channel.id, f(`%s does not have an announcement channel!`, msg.channel.guild.name))
    }
}

const = unsubscribeFromGuildAnnouncementChannel = async (msg, args) => {
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
}

const = subscribeToUser = async (msg, args) => {
    let user = resolver.user(bot.bot.users, args[0])

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
        let subscribe = await mailboxes.updateOne({_id:msg.author.id}, {$addToSet: {subscriptions:user.id}})
        if (subscribe.result.ok != 1) {
            console.log(f(`Could not subscribe to %s for %s`, user.id, msg.author.id))
        } else {
            bot.bot.createMessage(msg.channel.id, f(`Subscribed to %s's posts!`, user.username))
        }
    } else {
        bot.bot.createMessage(msg.channel.id, f(`Could not find user: %s`, args[0]))
    }
}

const = unsubscribeFromUser = async (msg, args) => {
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
}

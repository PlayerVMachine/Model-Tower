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
//
exports.registerMailbox = registerMailbox

exports.subscribeToGuildAnnouncementChannel = async (msg, args) => {
    let validateMailbox = await registerMailbox(msg.author.id)

    if (!validateMailbox) {
        bot.bot.createMessage(msg.channel.id, `Sorry could not register subscription.`)
    }

    let client = await MongoClient.connect(url)
    let mailboxes = client.db('model_tower').collection('mailboxes')
    let guild_announcers = client.db('model_tower').collection('guild_announcers')

    let guild_announcer = await guild_announcers.findOne({_id:msg.channel.guild.id})
    if(guild_announcer) {
        let subscribe = await mailboxes.updateOne({_id:msg.author.id}, {$addToSet: {subscriptions:guild_announcer.channel}})
        if (subscribe.result.ok != 1) {
            console.log(f(`Could not subscribe to %s for %s`, guild_announcer.channel, msg.author.id))
        } else {
            bot.bot.createMessage(msg.channel.id, f(`Subscribed to %s's announcement channel!`, msg.channel.guild.name))
        }
    } else {
        bot.bot.createMessage(msg.channel.id, f(`%s does not have an announcement channel!`, msg.channel.guild.name))
    }
}

exports.unsubscribeFromGuildAnnouncementChannel = async (msg, args) => {
    let validateMailbox = await registerMailbox(msg.author.id)

    if (!validateMailbox) {
        bot.bot.createMessage(msg.channel.id, `Sorry could not unsubscribe.`)
    }

    let client = await MongoClient.connect(url)
    let mailboxes = client.db('model_tower').collection('mailboxes')
    let guild_announcers = client.db('model_tower').collection('guild_announcers')

    let guild_announcer = await guild_announcers.findOne({_id:msg.channel.guild.id})
    if(guild_announcer) {
        let subscribe = await mailboxes.updateOne({_id:msg.author.id}, {$pull: {subscriptions:guild_announcer.channel}})
        if (subscribe.result.ok != 1) {
            console.log(f(`Could not unsubscribe from %s for %s`, guild_announcer.channel, msg.author.id))
        } else {
            bot.bot.createMessage(msg.channel.id, f(`Unsubscribed from %s's announcement channel!`, msg.channel.guild.name))
        }
    } else {
        bot.bot.createMessage(msg.channel.id, f(`%s does not have an announcement channel!`, msg.channel.guild.name))
    }
}

exports.subscribeToUser = async (msg, args) => {
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

exports.unsubscribeFromUser = async (msg, args) => {
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

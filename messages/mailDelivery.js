//Module imports
const MongoClient = require('mongodb').MongoClient
const f = require('util').format

//project files required
const config = require('../config.json')
const bot = require('../core.js')
const resolver = require('../resolver.js')

// mongodb login
const url = 'mongodb://127.0.0.1:36505'

exports.commandList = {
    setan:`registerGuildAnnouncementChannel`,
    unsetan:`unregisterGuildAnnouncementChannel`,
    updates:`subscribeToGuildAnnouncementChannel`,
    noupdates:`unsubscribeFromGuildAnnouncementChannel`,
    subscribe:`subscribeToUser`,
    unsubscribe:`unsubscribeFromUser`
}

/*
* var message = {
*   source: {type:'user' || 'channel', id: id}
*   content: string
*   sent: Date()
* }
*/

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

//TO DO: take recieved message get list of mailboxes subscribed to x message and run deliver message on every mailbox

//Send a message to a mailbox TO:DO double check  logic
const deliverMail = async (src, dest, content) => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('mailboxes')

    let message = {
        source: src,
        content:content,
        sent: Date()
    }

    let validateDest = await registerMailbox(dest)

    if (validateDest) {
        let sent = await col.updateOne({_id:dest}, {$addToSet: {news:message}})
        if (sent.result.ok != 1)
            console.log(f(`Could not deliver message from %s to %s`, src, dest))
    } else {
        console.log(f(`Could not deliver message from %s to %s`, src, dest))
    }
}

exports.registerGuildAnnouncementChannel = async (msg, args) => {
    if (!msg.member.permission.has('manageChannels')) {
        return
    }

    let guild = msg.channel.guild
    let channel = resolver.channel(guild.channels, args[0])

    if (!channel) {
        bot.bot.createMessage(msg.channel.id, `Sorry I couldn't find that channel in this server!`)
    }

    //Add the guild and channel to a collection
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('guild_announcers')

    let checkForGuild = await col.findOne({_id:guild.id})

    if(!checkForGuild) {
        let register = await col.insertOne({_id:guild.id, channel:channel.id})
        if (register.insertedCount == 1)
            bot.bot.createMessage(msg.channel.id, f(`%s is now set as this server's announcement channel.`, channel.mention))
        else
            bot.bot.createMessage(msg.channel.id, f(`There was an error setting %s as this server's announcement channel.`, channel.mention))

    } else {
        let existingChannel = await resolver.channel(guild.channels, checkForGuild.channel)
        bot.bot.createMessage(msg.channel.id, f(`%s is already configured as this server's announcement channel.`, existingChannel.mention))
    }
}

exports.unregisterGuildAnnouncementChannel = async (msg, args) => {
    if (!msg.member.permission.has('manageChannels')) {
        return
    }

    let guild = msg.channel.guild
    let channel = resolver.channel(guild.channels, args[0])

    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('guild_announcers')

    if (!channel) {
        bot.bot.createMessage(msg.channel.id, `Sorry I couldn't find that channel in this server!`)
    }

    let removeGuild = await col.deleteOne({_id:guild.id})
    if(removeGuild.result.n == 1) {
        bot.bot.createMessage(msg.channel.id, f(`%s is no longer configured as this server's announcement channel.`, channel.mention))
    } else {
        bot.bot.createMessage(msg.channel.id, f(`There was no announcement channel.`))
    }
}

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
    let validateMailbox = await registerMailbox(msg.author.id)

    if (!validateMailbox) {
        bot.bot.createMessage(msg.channel.id, `Sorry could not register subscription.`)
    }

    let client = await MongoClient.connect(url)
    let mailboxes = client.db('model_tower').collection('mailboxes')

    let user = resolver.user(bot.bot.users, args[0])
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
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
    unsubscribe:`unsubscribeFromUser`,
    pull:`getPostsFromMailbox`
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

exports.deliverPost = async (srcType, msg) => {
    //Message object that will be delivered to subscribees' mailboxes
    let message = {
        source: '',
        content: '',
        sent: new Date()
    }

    //Search key for subscriptions
    let srcID = msg.author.id

    //Pack message object with data to send
    if (srcType == `channel`) {
        message.source = msg.channel.guild.name + `'s announcements:`
        message.content = msg.content
        srcID = msg.channel.id
    } else { //type is user
        message.source = msg.author.username + `#` + msg.author.discriminator
        message.content = msg.content.slice(msg.content.indexOf(' ') + 1)
    }

    //Send message to subscribees
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('mailboxes')

    let sent = await col.updateMany({subscriptions:srcID}, {$addToSet: {news:message}})
    if (sent.result.ok == 1) {
        if(srcType == `user`) {
            bot.bot.createMessage(msg.channel.id, `Your post has been sent to your followers`)
        }
    } else {
        bot.bot.createMessage(msg.channel.id, `An error occured sending the post to followers`)
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

//blockSubscriber

exports.getPostsFromMailbox = async (msg, args) => {
    let validateMailbox = await registerMailbox(msg.author.id)

    if (!validateMailbox) {
        bot.bot.createMessage(msg.channel.id, `Sorry could not get posts.`)
    }

    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('mailboxes')
    let mailbox = await col.findOne({_id:msg.author.id})
    let clearMail = await col.updateOne({_id:msg.author.id}, {$set: {news: []}})

    let numberOfSubscriptions = mailbox.subscriptions.length
    let numberOfPosts = mailbox.news.length

    let lines = []

    if (numberOfPosts > 0) {
        mailbox.news.forEach(post => {
            //format the post as it will appear in the embed
            let item = f(`**%s**: %s`, post.source, post.content)
            lines.push(item)
        })
    }

    let description = lines.join('\n')
    let characterCount = description.length
    let start = 0, end = 1999
    while (characterCount > 0) {
        bot.bot.createMessage(msg.channel.id, {embed: {
            title: `New posts for you:`,
            description: description.slice(start,end),
            footer: {text: f(`You are subscribed to %s users & channels`, numberOfSubscriptions)}
        }})
        characterCount -= 1999
        start = end
        end += 1999
    }
}

//scheduleMailDelivery

//edit a post

//delete a post
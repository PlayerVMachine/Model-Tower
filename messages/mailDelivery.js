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
    //Posts from the bot will be ignored
    if (msg.author.id == bot.bot.user.id) {
        return
    }

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
        message.content = !msg.embeds[0].description ? msg.content : msg.embeds[0].description
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
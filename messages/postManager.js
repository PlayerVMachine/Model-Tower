//Module imports
const MongoClient = require('mongodb').MongoClient
const f = require('util').format

//project files required
const config = require('../config.json')
const bot = require('../core.js')
const resolver = require('../resolver.js')
const sub = require('./subscribe.js')

// mongodb login
const url = 'mongodb://127.0.0.1:36505'

const nonPrintingChars = new RegExp(/[\x00-\x09\x0B\x0C\x0E-\x1F\u200B]/g)

exports.commandHandler = (msg, args) => {
    let restOfArgs = args.slice(1)

    if (['post', 'send'].includes(args[0])) {
        userPost(msg, restOfArgs)
    } else if (['pull', 'get', 'posts'].includes(args[0])) {
        getPosts(msg, restOfArgs)
    }
}

//For announcement channels
exports.deliverPost = async (msg) => {
    try {
        //Posts from the bot will be ignored
        if (msg.author.id == bot.bot.user.id) {
            return
        }

        let content = msg.content
        if (msg.embeds.length > 0) {
            content = msg.embeds[0].description
        }

        //Message object that will be delivered to subscribees' mailboxes
        let message = {
            source:  msg.channel.guild.name + `'s announcements:`,
            content: content,
            sent: new Date()
        }

        //Send message to subscribees
        let client = await MongoClient.connect(url)
        let col = client.db('model_tower').collection('mailboxes')

        let sent = await col.updateMany({subscriptions:msg.channel.id}, {$addToSet: {news:message}})
        if (sent.result.ok != 1) {
            console.log(sent)
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: deliverPost`, new Date(), err.message))
    }
}

//user sends post
const userPost = async (msg, args) => {
    try {
        //No blank posts
        if (args.length == 0 || msg.content.match(nonPrintingChars)) {
            let reply = await bot.bot.createMessage(msg.channel.id, f(`Sorry %s, you cannot post blank messages or messages with non-printing characters.`, msg.author.username))
            setTimeout(() => {
                reply.delete('Cleaning up after self')
            }, 5000)
            return
        }

        //create message
        let post = {
            source: msg.author.username + `#` + msg.author.discriminator,
            content: msg.content.slice(msg.content.indexOf(' ') + 1),
            sent: new Date()
        }

        let notice = await bot.bot.createMessage(msg.channel.id, f(`%s, you have 5 minutes to edit or delete your post before it's sent!`, msg.author.username))

        //5 minute delay on sending the post
        let postSender = setTimeout(async () => {
            //connect to db
            let client = await MongoClient.connect(url)
            let col = client.db('model_tower').collection('mailboxes')

            //add message to apropriate mailboxes
            let sent = await col.updateMany({subscriptions:msg.author.id}, {$addToSet: {news:post}})
            if (sent.result.ok == 1) {
                let dmChannel = await msg.author.getDMChannel()
                bot.bot.createMessage(dmChannel.id, f(`%s, your post has been sent to your followers!\`\`\`%s\`\`\``, msg.author.username, post.content))
            } else {
                bot.bot.createMessage(msg.channel.id, f(`%s, an error occured sending the post to your followers, please try again later`, msg.author.username))
            }
        }, 5 * 60 * 1000)

        //listen for edit message or delete message for 5 minutes before continuing with post sending
        const updatePost = (message, oldMessage) => {
            if (!oldMessage) {
                return
            }

            if (message.id == msg.id) {
                let args = message.content.split(' ')
                post.content = args.slice(1).join(' ')
                notice.edit(f(`%s, you have 5 minutes to edit or delete your post before it's sent! Edit registed!`, msg.author.username))
            }
        }

        const deletePost = (message) => {
            if (message.id == msg.id) {
                clearTimeout(postSender)
                notice.edit(f('%s Your post has been deleted and will not be sent.', msg.author.username))
                setTimeout(() => {notice.delete('Cleaning up after self')}, 5000)
                bot.bot.removeListener('messageDelete', deletePost)
                bot.bot.removeListener('messageUpdate', updatePost)
            }
        }

        bot.bot.on('messageUpdate', updatePost)
        bot.bot.on('messageDelete', deletePost)

        setTimeout(() => {
            notice.delete('post expired')
            bot.bot.removeListener('messageDelete', deletePost)
            bot.bot.removeListener('messageUpdate', updatePost)
        }, 5 * 60 * 1000)

    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: userPost`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

//user gets posts
const getPosts = async (msg, args) => {
    try {
        let validateMailbox = await sub.registerMailbox(msg.author.id)

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
        } else {
            bot.bot.createMessage(msg.channel.id, f(`%s, you have no posts to pull at this time`, msg.author.username))
            return
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
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: getPosts`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

//scheduleMailDelivery
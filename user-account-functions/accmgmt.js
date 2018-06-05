//NPM requires
const f = require('util').format

//Project files required
const config = require('../config.json')
const reply = require('../proto_messages.json')

//Create a user in the db
exports.create = async (msg, bot, client) => {
    const col = client.db(config.db).collection('Users')

    //Check if
    let account = await col.findOne({user: msg.author.id})
    if (account == null) {

        let userDM = await msg.author.getDMChannel()

        const userdata = {
            id: msg.author.id,
            status: 'active',
            sendTo: userDM.id,
            joined: new Date(),
            premium: 0
        }

        let created = await col.insertOne(userdata)
        if (created.insertedCount === 1) {
            bot.createMessage(msg.channel.id, f(reply.create.success, msg.author.username))
            bot.createMessage(config.logChannelID, msg.author.mention + ' has created an account')
        } else {
            bot.createMessage(msg.channel.id, f(reply.create.error, msg.author.username))
        }
    } else if (found.status === 'closed'){
        let unClose = await col.updateOne({user: msg.author.id}, {$set: {status: 'active'}})

        if (unClose.result.ok === 1) {
            bot.createMessage(msg.channel.id, f('%s, your account has been reopened with all your settings where they last were.', msg.author.username))
        } else {
            bot.createMessage(msg.channel.id, f('%s, sorry an error ocurred reopening your account.', msg.author.username))
        }
    } else {
        bot.createMessage(msg.channel.id, f(reply.create.alreadyHasAccount, msg.author.username))
    }
}

exports.close = async (msg, bot, client) => {
    const col = client.db(config.db).collection('Users')

    let min = Math.ceil(1000)
    let max = Math.floor(9999)
    let confirm = Math.floor(Math.random() * (max - min)) + min

    var medit

    const confirmation = async (response) => {
        res = response.content.split(' ')[0];
        if (response.author.id === msg.author.id && res === confirm.toString()) {
            //confirmation code entered correctly
            let marked = await col.findOneAndUpdate({user: msg.author.id}, {$set: {status:'closed'}})
            if (marked.ok === 1) {
                bot.createMessage(msg.channel.id, f(reply.close.success, msg.author.username))
                bot.createMessage(config.logChannelID, msg.author.mention + ' has marked their account for closure')
            } else {
                bot.createMessage(msg.channel.id, f(reply.close.error, msg.author.username))
            }
            bot.removeListener('messageCreate', confirmation)
            clearTimeout(medit)
        } else if (response.author.id === msg.author.id && response.content === 'cancel') {
            //user cancelled closing
            bot.createMessage(msg.channel.id, f(reply.close.cancelled, msg.author.username))
            bot.removeListener('messageCreate', confirmation)
            clearTimeout(medit)
        } else if (response.author.id === msg.author.id && res !== confirm.toString()) {
            //confirmation code entered incorrectly
            bot.createMessage(msg.channel.id, f(reply.close.wrongCode, msg.author.username))
            bot.removeListener('messageCreate', confirmation)
            clearTimeout(medit)
        }
    }

    let delMessage = await bot.createMessage(msg.channel.id, f(reply.close.confirmation, msg.author.username, confirm))

    //edit message if no reply in 10s and close listener
    medit = setTimeout((msgid) => {
        bot.editMessage(msg.channel.id, msgid, f(reply.close.timeout, msg.author.username))
        bot.removeListener('messageCreate', confirmation)
    }, 10000, delMessage.id)

    //register event listener for close confirmation/cancel
    bot.on('messageCreate', confirmation)
}
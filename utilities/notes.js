//Module imports
const f = require('util').format

//project files required
const config = require('../config.json')
const bot = require('../core.js')

exports.commandList = {
    nts: 'noteToSelf',
    notes: 'getNotes',
    unnote: 'unNote'
}

exports.noteToSelf = async (msg, args) => {
    try{
        let files = []
        if (msg.attachments.length !== 0) {
            for(i in msg.attachments) {
                files.push(f(`\n[%s](%s)`, msg.attachments[i].filename, msg.attachments[i].url))
            }
        }

        let dmChannel = await bot.bot.getDMChannel(msg.author.id)

        let toPin = await bot.bot.createMessage(dmChannel.id, f(`**Note:** %s%s`, args.join(' '), files.join(' ')))
        let pinned = await toPin.pin()

        let msgToDel = await toPin.channel.getMessages(1,undefined, toPin.id)
        let deleted = await toPin.channel.deleteMessage(msgToDel[0].id)

        bot.bot.createMessage(msg.channel.id, f(`Got it %s, note made!`, msg.author.username))
    } catch (err) {
        console.log(err)
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s my pencil broke!`, msg.author.username))
    }
}

exports.getNotes = async (msg, args) => {
    try{
        let dmChannel = await bot.bot.getDMChannel(msg.author.id)

        let noteMsgs = await dmChannel.getPins()

        let notes = []
        for (m = 0; m < noteMsgs.length; m++) {
            index = m + 1
            date = new Date(noteMsgs[m].timestamp)
            notes.push({name: 'Note ' + index, value: f(`%s | created %s`, noteMsgs[m].content, date.toDateString()), inline:false})
        }

        if (notes.length === 0)
            notes.push({name: 'Note', value:`No notes found! Create a note with the \`nts\` command!`, inline:false})

        let embed = {
            embed: {
                author: {name: f(`%s's notes:`, msg.author.username), icon_url: msg.author.avatarURL},
                fields: notes,
                color: parseInt(usee.eColor, 16),
                footer: {text: `Powered by the Broadcast Tower`}
            }
        }

        bot.bot.createMessage(msg.channel.id, embed)

    } catch (err) {
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s my pencil broke!`, msg.author.username))
    }
}

exports.unNote = async (msg, args, bot) => {
    try{
        let dmChannel = await bot.bot.getDMChannel(msg.author.id)
        let noteMsgs = await dmChannel.getPins()

        let index = parseInt(args[0])

        if (index == NaN) {
            bot.bot.createMessage(msg.channel.id, f(`Sorry %s that's not a number!`, msg.author.username))
            return
        }

        if(!noteMsgs[index - 1]) {
            bot.bot.createMessage(msg.channel.id, f(`Sorry %s that's not a note index!`, msg.author.username))
            return
        }

        let deleteMessage = dmChannel.deleteMessage(noteMsgs[index - 1].id)
        bot.bot.createMessage(msg.channel.id, f(`Note deleted %s!`, msg.author.username))

    } catch (err) {
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s my pencil broke!`, msg.author.username))
    }
}
//module imports
const f = require('util').format
const MongoClient = require('mongodb').MongoClient

//project files required
const config = require('../config.json')
const bot = require('../core.js')

// mongodb login
const url = 'mongodb://127.0.0.1:36505'

exports.remindMe = async (msg, args) => {

    if (!args.includes('in')) {
        bot.createMessage(msg.channel.id, 'Missing keyword `in` cannot guess when you want to be reminded')
        return
    }

    try {
        let client = await MongoClient.connect(url)
        const col = client.db('model_tower').collection('Reminders')

        let reminder = msg.content.split(' ').slice(1, msg.content.lastIndexOf('in'))
        let rawTime = msg.connect.split(' ').slice(msg.content.lastIndexOf('in') + 1)


        let reminderObj = {
            user: usee.user,
            sendTo: usee.sendTo,
            content: reminder,
            due: remDate,
            type: 'reminder'
        }

        let addRem = await remCol.insertOne(reminderObj)
        if (addRem.insertedCount === 1)
            bot.createMessage(msg.channel.id, f('Got it I\'ll remind you: %s in %s', message.slice(0, eom).trim(), rawDate))
        else
            bot.createMessage(msg.channel.id, 'Uh oh! I can\'t remember that for you right now!')
    } catch (err) {
        console.log(err)
    }
}

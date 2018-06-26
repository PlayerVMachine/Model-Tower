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
        let rawTime = msg.content.split(' ').slice(msg.content.lastIndexOf('in') + 1)
        let dmChannel = await bot.bot.getDMChannel(msg.author.id)

        console.log(typeof rawTime)

        //set the time unit for minute, day, week, month, or year
        let timeUnit = rawTime.charAt(rawTime.length - 1).match(/[mMdyw]/) ? rawTime.charAt(rawTime.length - 1) : 'm'

        let timeMagnitude = !parseInt(rawTime) ? parseInt(rawTime.slice(0, rawTime.length -1)) : parseInt(rawTime)

        bot.bot.createMessage(msg.channel.id, f('magnitude: %d, unit: %s, reminder: %s', timeMagnitude, timeUnit, reminder))

/*        let reminderObj = {
            sendTo: dmChannel.id,
            content: reminder,
            due: remDate,
            type: 'reminder'
        }

        let addRem = await col.insertOne(reminderObj)
        if (addRem.insertedCount === 1)
            bot.createMessage(msg.channel.id, f('Got it I\'ll remind you: %s in %s', reminder, rawDate))
        else
            bot.createMessage(msg.channel.id, 'Uh oh! I can\'t remember that for you right now!') */
    } catch (err) {
        console.log(err)
    }
}

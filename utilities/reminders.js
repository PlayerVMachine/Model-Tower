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

        let splitIndex = msg.content.split(' ').lastIndexOf('in')

        let reminder = msg.content.split(' ').slice(1, splitIndex).join(' ')
        let rawTime = msg.content.split(' ').slice(splitIndex + 1).join()
        let dmChannel = await bot.bot.getDMChannel(msg.author.id)

        //set the time unit for minute, day, week, month, or year
        let timeUnit = rawTime.charAt(rawTime.length - 1).match(/[mMhdyw]/) ? rawTime.charAt(rawTime.length - 1) : 'm'

        let timeMagnitude = !parseInt(rawTime) ? parseInt(rawTime.slice(0, rawTime.length -1)) : parseInt(rawTime)

        //breakdown date
        let date = new Date()
        let min = date.getMinutes()
        let hour = date.getHours()
        let day = date.getDate()
        let month = date.getMonth()
        let year = date.getFullYear()

        let response = timeMagnitude.toString() + ' '

        if (timeUnit == 'm') {
            min += timeMagnitude
            response += 'minute(s)'
        } else if (timeUnit == 'h') {
            hour += timeMagnitude
            response += 'hour(s)'
        } else if (timeUnit == 'd') {
            day += timeMagnitude
            response += 'day(s)'
        } else if (timeUnit == 'w') {
            day += (7 * timeMagnitude)
            response += 'week(s)'
        } else if (timeUnit == 'M') {
            month += timeMagnitude
            response += 'month(s)'
        } else if (timeUnit == 'y') {
            year += timeMagnitude
            response += 'year(s)'
        }

        //create new date for when the user wants to be reminded
        let reminderTime = new Date(year, month, day, hour, min)

        let reminderObj = {
            sendTo: dmChannel.id,
            content: reminder,
            due: reminderTime,
            type: 'reminder'
        }

        let confirm = await bot.bot.createMessage(msg.channel.id, f(`Got it I'll remind you: %s in %s (react with ❌ to cancel)`, reminder, response))
        confirm.addReaction('❌')

        const setReminder = setTimeout(async () => {
            bot.bot.removeListener('messageReactionAdd', cancelTimeout)
            //send to db
        }, 5000)

        const cancelTimeout = async (message, emoji, userID) => {
            if (userID == msg.author.id) {
                if (emoji.name == '❌') {
                    bot.bot.removeListener('messageReactionAdd', cancelTimeout)
                    clearTimeout(setReminder)
                    confirm.edit('Reminder cancelled!')
                    setTimeout(() => {
                        confirm.delete('Clean up response')
                        msg.delete('Reminder cancelled')
                    }, 5000)
                }
            }
        }

        bot.bot.on('messageReactionAdd', cancelTimeout)


/*        let addRem = await col.insertOne(reminderObj)
        if (addRem.insertedCount === 1) {
            bot.bot.createMessage(msg.channel.id, f('Got it I\'ll remind you: %s in %s', reminder, response))
        } else {
            bot.bot.createMessage(msg.channel.id, 'Uh oh! I can\'t remember that for you right now!')
        }
*/
    } catch (err) {
        console.log(err)
    }
}

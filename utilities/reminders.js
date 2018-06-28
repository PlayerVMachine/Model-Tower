//module imports
const f = require('util').format
const MongoClient = require('mongodb').MongoClient

//project files required
const config = require('../config.json')
const bot = require('../core.js')

// mongodb login
const url = 'mongodb://127.0.0.1:36505'

exports.commandHandler = (msg, args) => {
    let restOfArgs = args.slice(1)

    if (['me', 'remind'].includes(args[0])) {
        remindMe(msg, restOfArgs)
    } else if (['view', 'list'].includes(args[0])) {
        viewReminders(msg, restOfArgs)
    }
}

const remindMe = async (msg, args) => {

    if (!args.includes('in')) {
        bot.createMessage(msg.channel.id, 'Missing keyword `in` cannot guess when you want to be reminded')
        return
    }

    try {
        let client = await MongoClient.connect(url)
        const col = client.db('model_tower').collection('reminders')

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

        let confirm = await bot.bot.createMessage(msg.channel.id, f(`Got it I'll remind you: %s in %s _react with ❌ to cancel_)`, reminder, response))
        confirm.addReaction('❌')

        const setReminder = setTimeout(async () => {
            bot.bot.removeListener('messageReactionAdd', cancelTimeout)
            confirm.removeReaction('❌')
            let addRem = await col.insertOne(reminderObj)
            if (addRem.insertedCount == 1) {
                confirm.edit(f(`Got it I'll remind you: %s in %s _reminder set!_`, reminder, response))
            } else {
                confirm.edit(f(`Got it I'll remind you: %s in %s _reminder not set sorry!_`, reminder, response))
            }
        }, 5000)

        const cancelTimeout = async (message, emoji, userID) => {
            if (userID == msg.author.id) {
                if (emoji.name == '❌') {
                    bot.bot.removeListener('messageReactionAdd', cancelTimeout)
                    clearTimeout(setReminder)
                    confirm.edit('Reminder cancelled!')
                    /*setTimeout(() => {
                        confirm.delete('Clean up response')
                        msg.delete('Reminder cancelled')
                    }, 5000)*/ //feedback first?
                }
            }
        }

        bot.bot.on('messageReactionAdd', cancelTimeout)
    } catch (err) {
        console.log(err)
    }
}

//View upcoming reminders and delete by reaction
const viewReminders = async (msg, args) => {
    try {
        let client = await MongoClient.connect(url)
        const col = client.db('model_tower').collection('reminders')

        let dmChannel = await bot.bot.getDMChannel(msg.author.id)
        let reminders = await col.find({ $and: [ {sendTo: dmChannel.id}, {type:'reminder'} ] }).toArray()

        let desc = []
        let count = 1
        reminders.forEach(r => {
            let time = Date.parse(r.new) - Date.now()
            desc.push(f('**%d.** %s set for: %d hours from now ', count, r.content, time))
            count ++
        })

        let embed = {
            embed: {
                title: f(`%s's upcoming reminders`, msg.author.username),
                description: desc.join('\n')
            }
        }

        let listMessage = await bot.bot.createMessage(msg.channel.id, embed)
        listMessage.addReaction('one')
        listMessage.addReaction('two')
        listMessage.addReaction('three')
        listMessage.addReaction('four')
        listMessage.addReaction('five')
        listMessage.addReaction('six')
        listMessage.addReaction('seven')
        listMessage.addReaction('eight')
        listMessage.addReaction('nine')
        listMessage.addReaction('🔟')


    } catch (err) {
        console.log(err)
    }
}

exports.checkReminders = async () => {
    try {
        let client = await MongoClient.connect(url)
        const col = client.db('model_tower').collection('reminders')

        now = new Date()
        oneMinuteLater = new Date(now.getTime() + (60*1000))

        let expiringReminders = await col.find({due: {$lte: oneMinuteLater}}).toArray()

        expiringReminders.forEach(r => {
            due = new Date(r.due)
            timeout = due.getTime() - Date.now()

            setTimeout(async () => {
                if (r.type === 'reminder') {
                    bot.bot.createMessage(r.sendTo, f(`You wanted me to remind you: %s`, r.content))
                    let remove = await col.deleteOne({_id: r._id})
                    if (remove.deletedCount !== 1) {
                        console.log(f('An error occurred removing reminder: %s', r._id))
                    }
                }
            }, timeout)

        })
    } catch (err) {
        console.log(err)
    }
}
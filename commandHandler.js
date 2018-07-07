const Memcached = require('memcached')
const memcached = new Memcached('127.0.0.1:11222')
const f = require('util').format

const r6 = require('./game-integrations/rainbowsix.js')
const lol = require('./game-integrations/leagueoflegends.js')
const ow = require('./game-integrations/overwatch.js')
const pubg = require('./game-integrations/pubg.js')

const postManager = require('./messages/postManager.js')
const subscribe = require('./messages/subscribe.js')
const annMgmt = require('./messages/announcements.js')

const notes = require('./utilities/notes.js')
const spotify = require('./utilities/spotify.js')
const weather = require('./utilities/weather.js')
const rem = require('./utilities/reminders.js')
const util = require('./utilities/tools.js')
const news = require('./utilities/news.js')

const help = require('./help.json')
const config = require('./config.json')
const bot = require('./core.js')

const userWait = async (command, time, msg) => {
    let message = await bot.bot.createMessage(msg.channel.id, f(`Sorry %s, you need to wait %d seconds before using %s again`, msg.author.username, (time/1000), command))
    setTimeout(() => {message.delete(`Delete cooldown warning`)}, 3000)
}

const cooldown = async (command, msg, args, time, onCD, offCD) => {
    let cdSet = await memcached.get(command)
    console.log(cdSet)

    if (!cdSet) {
        cdSet = new Set()
    }

    if (cdSet.has(msg.author.id)) {
        onCD(command, time, msg)
    } else {
        cdSet.add(msg.author.id)
        offCD(msg, args)
    }

    memcached.set(command, cdSet, 60 * 60, (err, res) => {
        console.log(err)
        console.log('---')
        console.log(res)
    })

    setTimeout(async () => {
        let set = await memcached.get(command)
        set.delete(msg.author.id)
        memcached.replace(command, set, 60 * 60,  (err) => {
            console.log(err)
        })
    }, time)
}

exports.parser = async (prefix, msg) => {
    let endIndex = msg.content.indexOf(` `) === -1 ? msg.length : msg.content.indexOf(` `)
    let command = msg.content.slice(prefix.length, endIndex)

    let args = msg.content.split(' ').slice(1)
    let fullArgs = [command].concat(args)

    if (['prefix', 'ping', 'server', 'about', 'help', 'invite'].includes(command)) {
        cooldown(command, msg, fullArgs, 5000, userWait, util.commandHandler)
    } else if (['clean'].includes(command)) {
        cooldown(command, msg, fullArgs, 30000, userWait, util.commandHandler)
    }
}
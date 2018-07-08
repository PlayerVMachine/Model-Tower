const Memcached = require('memcached')
const memcached = new Memcached('127.0.0.1:11222')
const f = require('util').format

const r6 = require('./game-integrations/rainbowsix.js')
const lol = require('./game-integrations/leagueoflegends.js')
const ow = require('./game-integrations/overwatch.js')
const pubg = require('./game-integrations/pubg.js')

const postManager = require('./messages/postManager.js')
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
    memcached.get(command + msg.author.id, (err, res) => {
        if (!err && !res) {
            bot.bot.createMessage(msg.channel.id, f(`Sorry %s, you need to wait %d seconds before using %s again`, msg.author.username, (time/1000), command)).then((message) => {
                    setTimeout(() => {
                        return message.delete(`Delete cooldown warning`)
                    }, 5000)
                })

            memcached.set(command + msg.author.id, 1, time/1000, (err, res) => {
                if (err)
                    console.log(err)
            })
        }
    })
}

const cooldown = async (command, msg, args, time, onCD, offCD) => {
    memcached.get(command, (err, list) => {
        if (!list) {
            list = {
                users:[]
            }
        }

        if (list.users.includes(msg.author.id)) {
            onCD(command, time, msg)
        } else {
            list.users.push(msg.author.id)
            offCD(msg, args)
        }

        memcached.set(command, list, 60 * 60, (err, res) => {
            if (err)
                console.log(err)
        })

        setTimeout(async () => {
            memcached.get(command, (err, res) => {
                res.users.splice(res.users.indexOf(msg.author.id), 1)

                memcached.replace(command, res, 60 * 60,  (err, res) => {
                    if (err)
                        console.log(err)
                })
            })
        }, time)
    })
}

exports.parser = async (prefix, msg) => {
    let endIndex = msg.content.indexOf(` `) === -1 ? msg.length : msg.content.indexOf(` `)
    let command = msg.content.slice(prefix.length, endIndex)

    let args = msg.content.split(' ').slice(1)
    let fullArgs = [command].concat(args)

    if (['prefix', 'ping', 'server', 'about', 'help', 'invite'].includes(command)) {
        cooldown(command, msg, fullArgs, 10000, userWait, util.commandHandler)
    } else if (['clean'].includes(command)) {
        cooldown(command, msg, fullArgs, 30000, userWait, util.commandHandler)
    } else if (['weather', 'forecast'].includes(command)) {
        cooldown(command, msg, fullArgs, 10000, userWait, weather.commandHandler)
    } else if (['news'].includes(command)) {
        cooldown(command, msg, args, 30000, userWait, news.commandHandler)
    } else if (['remind'].includes(command)) {
        if (args[0] == 'me') {
            cooldown(command, msg, args, 5000, userWait, reminders.commandHandler)
        } else if (args[0] == 'view') {
            cooldown(command, msg, args, 30000, userWait, reminders.commandHandler)
        }
    } else if (['spotify'].includes(command)) {
        cooldown(command, msg, args, 8000, userWait, spotify.commandHandler)
    } else if (['nts'].includes(command)) {
        if (['create', 'delete'].includes(args[0])) {
            cooldown(command, msg, args, 5000, userWait, notes.commandHandler)
        } else if (args[0] == 'view') {
            cooldown(command, msg, args, 20000, userWait, notes.commandHandler)
        }
    } else if (['post', 'pull', 'notify', 'unnotify', 'sub', 'unsub', 'subscriptions'].includes(args[0])) {
        cooldown(command, msg, fullArgs, 5000, userWait, postManager.commandHandler)
    } else if (['chan'].includes(command)) {
        cooldown(command, msg, args, 5000, userWait, annMgmt.commandHandler)
    } else if (['pubg'].includes(command)) {
        cooldown(command, msg, args, 5000, userWait, pubg.commandHandler)
    } else if (['ow'].includes(command)) {
        cooldown(command, msg, args, 5000, userWait, ow.commandHandler)
    } else if (['lol'].includes(command)) {
        cooldown(command, msg, args, 5000, userWait, lol.commandHandler)
    } else if (['r6'].includes(command)) {
        cooldown(command, msg, args, 5000, userWait, r6.commandHandler)
    } else if ('eval' == command) {
        util.commandHandler(msg, args)
    } else if (['glitch'].includes(command)) {
        bot.bot.createMessage(msg.channel.id, `Congrats you'm'st done broken the tower, test it on monday.`)
    } else if (msg.author.id == '239261547959025665') {
        bot.bot.createMessage(msg.channel.id, `Heck off NightRaven <:catHeart:442431739936112640>`)
    }
}
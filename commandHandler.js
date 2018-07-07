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
    memcached.get(command + msg.author.id, async (err, res)) => {
        if (!err && !res) {
            let message = await bot.bot.createMessage(msg.channel.id, f(`Sorry %s, you need to wait %d seconds before using %s again`, msg.author.username, (time/1000), command))
            setTimeout(() => {message.delete(`Delete cooldown warning`)}, 3000)
            memcached.set(command + msg.author.id, 1, time/1000, (err, res) => {
                console.log(err)
            })
        }
    }
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
            console.log(err)
        })

        setTimeout(async () => {
            memcached.get(command, (err, res) => {
                res.users.splice(res.users.indexOf(msg.author.id), 1)

                memcached.replace(command, res, 60 * 60,  (err, res) => {
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
        cooldown(command, msg, fullArgs, 5000, userWait, util.commandHandler)
    } else if (['clean'].includes(command)) {
        cooldown(command, msg, fullArgs, 30000, userWait, util.commandHandler)
    }
}
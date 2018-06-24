const weather = require('weather-js')
const moment = require('moment-timezone')
const f = require('util').format

//
const bot = require('../core.js')

exports.commandList = {
    weather: 'getWeather',
    forecast: 'getForecast'
}

exports.getWeather = async (msg, args) => {
    try {

        if (args.length == 0) {
            bot.bot.createMessage(msg.channel.id, 'please enter a location and optional degree type (default is F)')
            return
        }

        let degree = args[args.length - 1].toUpperCase() == 'C' ? 'C' : 'F'
        let location = (args[args.length - 1].toUpperCase() == 'C' || args[args.length - 1].toUpperCase() == 'F') ? args.slice(0, args.length - 2).join(' ') : args.join(' ')

        weather.find({search: location, degreeType: degree}, (err, result) => {
            if(err) {
                bot.bot.createMessage(msg.channel.id, err)
                return
            }

            let embed = {
                embed: {
                    author: {name: f("Current Weather in %s", result[0].location.name), icon_url: result[0].current.imageUrl},
                    color: parseInt('0x4286f4', 16),
                    description: f("Temperature: **%s**\nFeels like: **%s**\nSky: **%s**\nWind: **%s**\n", result[0].current.temperature + degree, result[0].current.feelslike + degree, result[0].current.skytext, result[0].current.winddisplay),
                    footer: {text:'Part of the Broadcast Tower Integration Network'}
                }
            }

            bot.bot.createMessage(msg.channel.id, embed)
        })
    } catch (err) {
        console.log(err)
    }
}
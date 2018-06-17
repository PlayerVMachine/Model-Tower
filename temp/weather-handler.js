const weather = require('weather-js')
const moment = require('moment-timezone')
const f = require('util').format

const config = require('./config.json')
const reply = require('./proto_messages.json')
const timeFormat = new RegExp(/^[0-2][0-9]:[0-6][0-9]\b/)

exports.getWeather = async (msg, args, bot, client) => {
  try {
    const col = client.db(config.db).collection('Users')
    let usee = await col.findOne({user: msg.author.id})

    let location = 'Montreal, QC'
    let degree = 'F'

    if (args.length === 0) {
      if (usee === null || usee.weather.location === '') {
        bot.createMessage(msg.channel.id, 'please enter a location and degree type')
        return
      } else {
        location = usee.weather.location
        degree = usee.weather.deg
      }
    } else {
      let command = args.join(' ')
      location = command.split('-')[0].trim()

      if (command.split('-')[1] !== undefined) {
        if (command.split('-')[1].trim().toUpperCase() === 'C' || command.split('-')[1].trim().toUpperCase() === 'F') {
          degree = command.split('-')[1].trim().toUpperCase()
        } else {
          degree ='F'
        }
      }
    }

    weather.find({search: location, degreeType: degree}, (err, result) => {
      if(err) {
        bot.createMessage(msg.channel.id, err)
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

      bot.createMessage(msg.channel.id, embed)
    })
  } catch (err) {
    console.log(err)
    bot.createMessage(config.logChannelID, err.message)
    bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
  }
}

exports.getForecast = async (msg, args, bot, client) => {
  try {
    const col = client.db(config.db).collection('Users')
    let usee = await col.findOne({user: msg.author.id})

    let location = 'Montreal, QC'
    let degree = 'F'

    if (args.length === 0) {
      if (usee === null || usee.weather.location === '') {
        bot.createMessage(msg.channel.id, 'please enter a location and degree type')
        return
      } else {
        location = usee.weather.location
        degree = usee.weather.deg
      }
    } else {
      let command = args.join(' ')
      location = command.split('-')[0].trim()

      if (command.split('-')[1] !== undefined) {
        if (command.split('-')[1].trim().toUpperCase() === 'C' || command.split('-')[1].trim().toUpperCase() === 'F') {
          degree = command.split('-')[1].trim().toUpperCase()
        } else {
          degree ='F'
        }
      }
    }

    weather.find({search: location, degreeType: degree}, (err, result) => {
      if(err) {
        bot.createMessage(msg.channel.id, err)
        return
      }

      let fields = []
      for (i = 2; i < 5; i++) {
        let precip = result[0].forecast[i].precip + '%'
        if (result[0].forecast[i].precip === '')
          precip = '0%'
          

        fields.push({name:result[0].forecast[i].day + f(' the %sth', result[0].forecast[i].date.slice(8)),
          value: f('High: **%s**\nLow: **%s**\nSky: **%s**\nPrecipitation: **%s**',
            result[0].forecast[i].high + degree, result[0].forecast[i].low + degree, result[0].forecast[i].skytextday, precip),
          inline:true
        })
      }

      let embed = {
        embed: {
            author: {name: f("Weather forecast in %s for the next 3 days", result[0].location.name), icon_url: result[0].current.imageUrl},
            color: parseInt('0x4286f4', 16),
            fields: fields,
            footer: {text:'Part of the Broadcast Tower Integration Network'}
        }
      }

      bot.createMessage(msg.channel.id, embed)
    })
  } catch (err) {
    console.log(err)
    bot.createMessage(config.logChannelID, err.message)
    bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
  }
}

exports.dailySub = async (msg, args, bot, client) => {
  try {
    const remCol = client.db(config.db).collection('Reminders')
    const userCol = client.db(config.db).collection('Users')

    let usee = await userCol.findOne({user: msg.author.id})

    if (usee.tz === null) {
      bot.createMessage(msg.channel.id, f(reply.fsub.noTZ, msg.author.username))
      return
    }

    if (usee.weather === {location: '', deg: ''}) {
      bot.createMessage(msg.channel.id, f(reply.fsub.noWeather, msg.author.username))
      return
    }

    if (!timeFormat.test(args[0])) {
      bot.createMessage(msg.channel.id, f(reply.fsub.wrongTime, msg.author.username))
      return
    }

    let now = new Date()
    let date = now.toISOString().slice(0,11)
    let postTime = new Date([date, args[0]].join('') + ':00Z')
    // now post time is today's date plus the time the user wants to be notified at
    // next we get the user's timezone offset
    let offset = moment.tz.zone(usee.tz).utcOffset(postTime)
    //we make a new date object that's in UTC thanks to the correction
    let scheduledTime = new Date(Date.parse(postTime) + offset*60*1000)
    if (scheduledTime.getDate() > now.getDate())
      scheduledTime = new Date(Date.parse(scheduledTime) - 24*60*60*1000)

    if (Date.parse(scheduledTime) < Date.parse(now))
       scheduledTime = new Date(Date.parse(scheduledTime) + 24*60*60*1000)

    let weatherSub = {
      user: usee.user,
      sendTo: usee.sendTo,
      due: scheduledTime,
      type: 'forecast'
    }

    let addWeather = await remCol.replaceOne({$and: [{user: usee.user}, {type:'forecast'}]}, weatherSub, {upsert: true})
    if (addWeather.result.ok === 1)
      bot.createMessage(msg.channel.id, f('%s, successfully subcribed to daily forecast updates!', msg.author.username))
    else
      bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))

  } catch (err) {
    console.log(err)
    bot.createMessage(config.logChannelID, err.message)
    bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
  }
}

exports.dailyUnsub = async (msg, args, bot, client) => {
  try {
    const remCol = client.db(config.db).collection('Reminders')

    let remWeather = await remCol.deleteOne({$and: [{user: msg.author.id}, {type:'forecast'}]})
    if (remWeather.deletedCount === 1) 
      bot.createMessage(msg.channel.id, f('%s, successfully unsubcribed from daily forecast updates!', msg.author.username))
    else
      bot.createMessage(msg.channel.id, f('%s, you were not subcribed to daily forecast updates!', msg.author.username))

  } catch (err) {
    console.log(err)
    bot.createMessage(config.logChannelID, err.message)
    bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
  }
}

exports.dailyForecast = async (destination, client, q, bot) => {
  try {
    const col = client.db(config.db).collection('Users')
    let usee = await col.findOne({sendTo: destination})

    let location = usee.weather.location
    let degree = usee.weather.deg

    weather.find({search: location, degreeType: degree}, (err, result) => {
      if(err) {
        bot.createMessage(config.logChannelID, err)
        return
      }

      let fields = []
      let precip = result[0].forecast[1].precip + '%'
      if (result[0].forecast[1].precip === '')
        precip = '0%' 

      fields.push({name:result[0].forecast[1].day + f(' the %sth', result[0].forecast[1].date.slice(8)),
        value: f('High: **%s**\nLow: **%s**\nSky: **%s**\nPrecipitation: **%s**',
          result[0].forecast[1].high + degree, result[0].forecast[1].low + degree, result[0].forecast[1].skytextday, precip),
        inline:true})

      let embed = {
        embed: {
            author: {name: f("Today's forecast in %s ", result[0].location.name), icon_url: result[0].current.imageUrl},
            color: parseInt('0x4286f4', 16),
            fields: fields,
            footer: {text:'Part of the Broadcast Tower Integration Network'}
        }
      }

      let packet = {
        content: embed,
        destination: destination,
        type: 'subscription',
      }

      q.push(packet)
    })
  } catch (err) {
    console.log(err)
    bot.createMessage(config.logChannelID, err.message)
    //bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
  }
}
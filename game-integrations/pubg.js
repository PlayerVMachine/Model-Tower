const f = require('util').format

const bot = require('../core.js')
const pubg = require('./pubg-api-wrapper.js')


exports.getPlayerStats = async (msg, args) => {
    let player = await pubg.getPlayerByName('pc-na', args[0])
    let seasons = await pubg.getSeasons('pc-na')

    console.log(seasons.data[seasons.data.length -1])

    let stats = await pubg.getPlayerSeasonStats('pc-na', player.data[0].id, seasons.data[seasons.data.length -1].id)

    bot.bot.createMessage(msg.channel.id, stats.data.attributes.gameModeStats.duo)
}
const f = require('util').format

const bot = require('../core.js').bot
const pubg = require('./pubg-api-wrapper.js')


exports.getPlayerStats = async (msg, args) => {
    let player = await pubg.getPlayerByName('na-pc', args[0])
    let seasons = await pubg.getSeasons('na-pc')

    console.log(seasons.data[0])

    let stats = await pubg.getPlayerSeasonStats('na-pc', player.data[0].id, seasons.data[0].id)

    bot.createMessage(msg.channel.id, stats.data.attributes.gameModeStats.duo)
}
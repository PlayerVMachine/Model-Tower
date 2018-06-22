const f = require('util').format

const bot = require('../core.js')
const pubg = require('./pubg-api-wrapper.js')


exports.getPlayerStats = async (msg, args) => {
    let player = await pubg.getPlayerByName('pc-na', args[0])
    let seasons = await pubg.getSeasons('pc-na')

    let season = seasons.data[seasons.data.length -1]

    let stats = await pubg.getPlayerSeasonStats('pc-na', player.data[0].id, season.id)

    console.log(JSON.stringify(stats.data.attributes))

    //bot.bot.createMessage(msg.channel.id, stats.data.attributes.gameModeStats.duo)
}
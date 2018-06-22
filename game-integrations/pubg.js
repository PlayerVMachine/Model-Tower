const f = require('util').format
const Memcached = require('memcached')

const bot = require('../core.js')
const pubg = require('./pubg-api-wrapper.js')

const cache = new Memcached('127.0.0.1.11222')

exports.getPlayerStats = async (msg, args) => {
    if (args.length == 0) {
        bot.createMessage(f(`**%s**, you need to provide a region, user, and game type`))
        return
    }

    let player = await cache.get('pc-na' + args[0])
    console.log(player)
    if (player == undefined) {
        console.log('from api')
        player = await pubg.getPlayerByName('pc-na', args[0])
        cache.set('pc-na' + args[0], player, 24*60*60)
    }

    let seasons = await cache.get('pc-na-seasons')
    if (seasons == undefined) {
        console.log('from api')
        seasons = await pubg.getSeasons('pc-na')
        cache.set('pc-na-seasons', seasons, 24*60*60)
    }

    let season = seasons.data[seasons.data.length -1]
    let stats = await pubg.getPlayerSeasonStats('pc-na', player.data[0].id, season.id)

    let modeStats = stats.data.attributes.gameModeStats[args[1]]
    let accuracy = ((modeStats.headshotKills / modeStats.kills) * 100).toFixed(2)
    let kd = ((modeStats.kills / modeStats.losses) * 100).toFixed(2)

    let embed = {
        embed : {
            title: f(`Overall PUBG Stats for %s this season:`, args[0]),
            description: f(`You've won **%s** games and finished top 10 in **%s** games out of the **%s** games you've played so far this season with a k/d ratio of **%s%%**`, modeStats.wins, modeStats.top10s, modeStats.roundsPlayed, kd),
            color: parseInt('F2A900', 16),
            fields: [
                {name: `Kills`, value: modeStats.kills, inline: true},
                {name: `Headshots`, value: modeStats.headshotKills, inline: true},
                {name: `Accuracy`, value: f(`%d%%`, accuracy), inline: true},
                {name: `Most Kills in a Game`, value: modeStats.roundMostKills, inline:true},
                {name: `Longest Kill Streak`, value: modeStats.maxKillStreaks, inline:true},
                {name: `Longest Kill Distance`, value: f(`%dM`, modeStats.longestKill.toFixed(2)), inline:true}
            ]
        }
    }

    bot.bot.createMessage(msg.channel.id, embed)
}
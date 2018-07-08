const f = require('util').format
//const Memcached = require('memcached') // Not working

const bot = require('../core.js')
const pubg = require('./pubg-api-wrapper.js')

//const cache = new Memcached('127.0.0.1.11222')
const regionList = ['xbox-as', 'xbox-eu', 'xbox-na', 'xbox-oc', 'pc-krjp', 'pc-jp', 'pc-na', 'pc-eu', 'pc-ru', 'pc-oc', 'pc-kakao', 'pc-sea', 'pc-sa', 'pc-as']
const modeList = ['duo', 'duo-fpp', 'solo', 'solo-fpp', 'squad', 'squad-fpp']

exports.commandHandler = (msg, args) => {
    let restOfArgs = args.slice(1)
    console.log(msg.conent)

    if (['stats'].includes(args[0])) {
        getPlayerStats(msg, restOfArgs)
    }
}

const getPlayerStats = async (msg, args) => {
    if (args.length < 3) {
        bot.bot.createMessage(msg.channel.id, f(`**%s**, you need to provide a region, user, and game type`, msg.author.username))
        return
    }

    if (!regionList.includes(args[0])) {
        bot.bot.createMessage(msg.channel.id, f(`**%s**, please specify a region! One of (%s)`, msg.author.username, regionList.join(', ')))
        return
    }

    if (!modeList.includes(args[2])) {
        bot.bot.createMessage(msg.channel.id, f(`**%s**, please specify a game mode! One of (%s)`, msg.author.username, modeList.join(', ')))
        return
    }

    let player = await pubg.getPlayerByName(args[0], args [1])
    let seasons = await pubg.getSeasons(args[0])

    if (!player) {
        bot.bot.createMessage(msg.channel.id, f(`Sorry **%s**, couldn't find anyone with that username`, msg.author.username))
        return
    }

    let season = seasons.data[seasons.data.length -1]
    let stats = await pubg.getPlayerSeasonStats(args[0], player.data[0].id, season.id)

    if (!stats) {
        bot.bot.createMessage(msg.channel.id, f(`Sorry **%s**, there as an error processing your request! Please Try again later.`, msg.author.username))
        return
    }

    let modeStats = stats.data.attributes.gameModeStats[args[2]]
    let accuracy = ((modeStats.headshotKills / modeStats.kills) * 100).toFixed(2)
    let kd = ((modeStats.kills / modeStats.losses) * 100).toFixed(2)

    if (accuracy == NaN)
        accuracy = 0

    let embed = {
        embed : {
            title: f(`Overall PUBG Stats for %s this season:`, args[1]),
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
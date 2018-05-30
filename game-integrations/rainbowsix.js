//module imports
const f = require('util').format
const RainbowSixApi = require('rainbowsix-api-node');
const R6 = new RainbowSixApi();

// project files required
const config = require('../config.json')
const reply = require('../proto_messages.json')



exports.getAllStats = async (msg, args, bot) => {

    let username = args[0];
    let platform = args[1];

    //Get stats on the user on that platform
    let statistics = await R6.stats(username, platform)
    if (statistics.player === undefined) {
        bot.createMessage(msg.channel.id, 'An error ocurred getting stats')
        return
    }

    bot.createMessage(msg.channel.id, JSON.stringify(statistics, null, 4))
}

exports.getCasualStats = async (msg, args, bot) => {

    if (!['uplay', 'xone', 'ps4'].includes(args[1])) {
        bot.createMessage(msg.channel.id, 'Please set platform as one of `uplay`, `xone`, or `ps4`')
        return
    }

    let username = args[0];
    let platform = args[1];

    //Get stats on the user on that platform
    let statistics = await R6.stats(username, platform)
    if (statistics.player === undefined) {
        bot.createMessage(msg.channel.id, 'An error ocurred getting stats, make sure that you entered the username correctly.')
        return
    }
    let casualStats = statistics.player.stats.casual

    if (!casualStats.has_played) {
        bot.createMessage(msg.channel.id, 'This user has not played that game mode.')
        return
    }
    let playTime = parseInt(casualStats.playtime)
    playTime = playTime/60/60

    let operatorStats = await R6.stats(username, platform, true)
    if (operatorStats.operator_records !== undefined) {
        let rawURL = operatorStats.operator_records[0].operator.images.badge
        let url = rawURL.slice(0, rawURL.length - 1)
        let badgeURL = url.replace('org', 'cc')

        desc = f('Play time: %sh Top operator: %s', playTime, operatorStats.operator_records[0].operator.name)

        thumbnail = {
            url: badgeURL,
            height: 256,
            width: 256
        }
    } else {
        desc = f('Play time: %sh', playTime)

        thumbnail = {
            url: msg.author.avatarURL,
            height: 256,
            width: 256
        }
    }

    let embed = {
        embed: {
            title:f("%s's Rainbow Six Siege Casual Stats", username),
            description: desc,
            thumbnail:thumbnail,
            fields: [
                {name:'Wins', value:casualStats.wins, inline:true},
                {name:'Losses', value:casualStats.losses, inline:true},
                {name:'Win rating', value:casualStats.wlr.toString(), inline:true},
                {name:'Kills', value:casualStats.kills, inline:true},
                {name:'Deaths', value:casualStats.deaths, inline:true},
                {name:'k/d', value:casualStats.kd.toString(), inline:true}
            ]
        }
    }

    bot.createMessage(msg.channel.id, embed)
}
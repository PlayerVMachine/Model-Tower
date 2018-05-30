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

    let rankedStats = statistics.player.stats.ranked
    let casualStats = statistics.player.stats.casual
    let overallStats = statistics.player.stats.overall
    let progression = statistics.player.stats.progression

    bot.createMessage(msg.channel.id, JSON.stringify(rankedStats))
    bot.createMessage(msg.channel.id, JSON.stringify(casualStats))
    bot.createMessage(msg.channel.id, JSON.stringify(overallStats))
    bot.createMessage(msg.channel.id, JSON.stringify(progression))
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

    let playTime = casualStats.playTime/60/60

    let embed = {
        embed: {
            title:f("%s's Rainbow Six Siege Casual Stats"),
            description: f('Play time: %dh', playTime),
            fields: [
                {name:'Wins', value:casualStats.wins, inline:true},
                {name:'Losses', value:casualStats.losses, inline:true},
                {name:'Win rating', value:casualStats.wlr.toString(), inline:true},
                {name:'Kills', value:casualStats.Kills, inline:true},
                {name:'Deaths', value:casualStats.deaths, inline:true},
                {name:'k/d', value:casualStats.kd.toString(), inline:true}
            ]
        }
    }

    bot.createMessage(msg.channel.id, embed)
}
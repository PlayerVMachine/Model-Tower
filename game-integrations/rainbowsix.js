//module imports
const f = require('util').format
const RainbowSixApi = require('rainbowsix-api-node');
const R6 = new RainbowSixApi();

// project files required
const config = require('../config.json')
const reply = require('../proto_messages.json')



exports.getOverallStats = async (msg, args, bot) => {
    bot.sendChannelTyping(msg.channel.id)
    let username = args[0];
    let platform = args[1];

    //Get stats on the user on that platform
    let statistics = await R6.stats(username, platform)
    if (statistics.player === undefined) {
        bot.createMessage(msg.channel.id, 'An error ocurred getting stats')
        return
    }

    let overall = statistics.player.stats.overall
    if (overall.suicides > 0) {
        desc = f('Try killing yourself less you might improve your winrate! Suicides: %d', overall.suicides)
    } else {
        desc = f('Good job not killing yourself on the field!')
    }

    let hitrate = (overall.bullets_hit / overall.bullets_fired)
    hitrate = hitrate.toFixed(2)

    let embed = {
        embed: {
            title:f("%s's Rainbow Six Siege Overall Stats", username),
            description: desc,
            fields: [
                {name:'Revives:', value:overall.revives, inline:false},
                {name:'Reinforcements Deployed:', value:overall.reinforcements_deployed, inline:true},
                {name:'Barricades Built:', value:overall.barricades_built, inline:false},
                {name:'Hit Rate:', value:hitrate, inline:false},
                {name:'Headshots:', value:overall.headshots, inline:false},
                {name:'Melee Kills:', value:overall.melee_kills, inline:true},
                {name:'Penetration Kills:', value:overall.penetration_kills, inline:true},
                {name:'Assits:', value:overall.assits, inline:false}
            ]
        }
    }

    bot.createMessage(msg.channel.id, embed)
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
    playTime = playTime.toFixed(2)

    let desc = f('Clearance level: %d, XP: %d\n', statistics.player.progression.level, statistics.player.progression.xp)

    let operatorStats = await R6.stats(username, platform, true)
    if (operatorStats.operator_records !== undefined) {
        let rawURL = operatorStats.operator_records[0].operator.images.badge
        let url = rawURL.slice(0, rawURL.length - 1)
        let badgeURL = url.replace('org', 'cc')

        desc = desc + f('Play time: %sh Top operator: %s', playTime, operatorStats.operator_records[0].operator.name)

        thumbnail = {
            url: badgeURL,
            height: 256,
            width: 256
        }
    } else {
        desc = desc + f('Play time: %sh', playTime)

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


exports.getRankedStats = async (msg, args, bot) => {

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
    let rankedStats = statistics.player.stats.ranked

    if (!rankedStats.has_played) {
        bot.createMessage(msg.channel.id, 'This user has not played that game mode.')
        return
    }
    let playTime = parseInt(rankedStats.playtime)
    playTime = playTime/60/60
    playTime = playTime.toFixed(2)

    let desc = f('Clearance level: %d, XP: %d\n', statistics.player.progression.level, statistics.player.progression.xp)

    let operatorStats = await R6.stats(username, platform, true)
    if (operatorStats.operator_records !== undefined) {
        let rawURL = operatorStats.operator_records[0].operator.images.badge
        let url = rawURL.slice(0, rawURL.length - 1)
        let badgeURL = url.replace('org', 'cc')

        desc = desc + f('Play time: %dh Top operator: %s', playTime, operatorStats.operator_records[0].operator.name)

        thumbnail = {
            url: badgeURL,
            height: 256,
            width: 256
        }
    } else {
        desc = desc + f('Play time: %dh', playTime)

        thumbnail = {
            url: msg.author.avatarURL,
            height: 256,
            width: 256
        }
    }

    let embed = {
        embed: {
            title:f("%s's Rainbow Six Siege Ranked Stats", username),
            description: desc,
            thumbnail:thumbnail,
            fields: [
                {name:'Wins', value:rankedStats.wins, inline:true},
                {name:'Losses', value:rankedStats.losses, inline:true},
                {name:'Win rating', value:rankedStats.wlr.toString(), inline:true},
                {name:'Kills', value:rankedStats.kills, inline:true},
                {name:'Deaths', value:rankedStats.deaths, inline:true},
                {name:'k/d', value:rankedStats.kd.toString(), inline:true}
            ]
        }
    }

    bot.createMessage(msg.channel.id, embed)
}
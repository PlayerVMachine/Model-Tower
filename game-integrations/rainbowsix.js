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
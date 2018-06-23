const f = require('util').format
const ow = require('owapi')

const bot = require('../core.js')

exports.test = async (msg, args) => {
    let player = await ow.getModeStats(args[0], 'quickplay', 'pc')
    bot.bot.createMessage(msg.channel.id, '```\n' + JSON.stringify(player.career_stats['ALL HEROES'], undefined, 4) + '\n```')
}
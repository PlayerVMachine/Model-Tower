const f = require('util').format
const ow = require('owapi')

const bot = require('../core.js')

exports.getOverallStats = async (msg, args) => {

    if (args.length < 3) {
        bot.bot.createMessage(msg.channel.id, f(`**%s**, you need to provide a username, platform, and game type!`, msg.author.username))
        return
    }

    if (!['pc', 'xbl', 'psn'].includes(args[1])) {
        bot.bot.createMessage(msg.channel.id, f(`**%s**, platform must be oned of: pc, xbl, psn!`, msg.author.username))
        return
    }

    if (!['quickplay', 'competitve'].includes(args[2])) {
        bot.bot.createMessage(msg.channel.id, f(`**%s**, game type must be quickplay or competitve!`, msg.author.username))
        return
    }

    try {
        let player = await ow.getModeStats(args[0], 'quickplay', 'pc')

        let embed = {
            embed: {
                title: f(`%s's Overall %s stats:`, args[0], args[2]),
                description: '',
                fields: [
                {name: `Eliminations`, value: player.career_stats['ALL HEROES'].Combat.Eliminations, inline: true},
                {name: `Deaths`, value: player.career_stats['ALL HEROES'].Combat.Deaths, inline: true},
                {name: `Damage Dealt`, value: player.career_stats['ALL HEROES'].Combat.HeroDamageDone, inline: true},
                {name: `Healing Done`, value: player.career_stats['ALL HEROES'].Assists.HealingDone, inline:true}
                ]
            }
        }

        console.log(JSON.stringify(player, undefined, 4))

        bot.bot.createMessage(msg.channel.id, embed)

    } catch (err) {
        console.log(err)
        if (err == 'PLAYER_NOT_EXIST') {
            bot.bot.createMessage(msg.channel.id, f(`Sorry **%s**, could not find results for that user on platform %s!`, msg.author.username, args[1]))
            return
        }
    }
}

exports.getMedals = async (msg, args) => {

}

exports.getHeroStats = async (msg, args) => {

}
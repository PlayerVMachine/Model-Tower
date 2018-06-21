const f = require('util').format
const {Kayn, REGIONS} = require('kayn')

const config = require('../config.json')
const bot = require('../core.js')

const league = Kayn(config.RIOT_KEY)({
    region: REGIONS.NORTH_AMERICA
})

exports.getSummoner = async (msg, args) => {
    let version = await league.Static.Version.list()[data][0]
    let summoner = await league.Summoner.by.name(args[0])

    let level = summoner.summonerLevel
    let profileIcons = await league.Static.ProfileIcon.list()
    console.log(JSON.stringify(summoner, undefined, 2))
    let embed = {
        embed: {
            image: {url: f('http://ddragon.leagueoflegends.com/cdn/%s/img/profileicon/%s.png', version, summoner.profileIconId), height: 256, width: 256}
        }
    }
    bot.bot.createMessage(msg.channel.id, embed)
}
const f = require('util').format
const {Kayn, REGIONS} = require('kayn')

const config = require('../config.json')
const bot = require('../core.js')

const league = Kayn(config.RIOT_KEY)({
    region: REGIONS.NORTH_AMERICA
})

exports.getSummoner = async (msg, args) => {
    let versionList = await league.Static.Version.list()
    let version = versionList[0]
    let summoner = await league.Summoner.by.name(args[0])
    let summonerPostion = await league.LeaguePositions.by.summonerID(summoner.id)
    let level = summoner.summonerLevel
    let profileIcons = await league.Static.ProfileIcon.list()

    console.log(JSON.stringify(summonerPostion, undefined, 2))

    let embed = {
        embed: {
            title: `Summoner info:` + args[0],
            thumbnail: {url: f('http://ddragon.leagueoflegends.com/cdn/%s/img/profileicon/%s.png', version, summoner.profileIconId), height: 256, width: 256}
        }
    }
    bot.bot.createMessage(msg.channel.id, embed)
}
const {Kayn, REGIONS} = require('kayn')

const config = require('../config.json')
const bot = require('../core.js')

const league = Kayn(config.RIOT_KEY)({
    region: REGIONS.NORTH_AMERICA
})

exports.getSummoner = async (msg, args) => {
    let summoner = await league.Summoner.by.name(args[0])

    let level = summoner.summonerLevel
    let profileIcons = await league.Static.ProfileIcon.list()
    console.log(JSON.stringify(summoner, undefined, 2))
    let embed = {
        embed: {
            image: {url: f('http://ddragon.leagueoflegends.com/cdn/6.24.1/img/profileicon/%s.png', summoner.profileIconId)}
        }
    }
    bot.bot.createMessage(msg.channel.id, embed)
}
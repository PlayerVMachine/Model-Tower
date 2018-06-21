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

    let rank = f(`%s %s`, summonerPostion[0].tier, summonerPostion[0].rank)
    let lp = summonerPostion[0].leaguePoints
    let winrate = summonerPostion[0].wins / (summonerPostion[0].wins + summonerPostion[0].losses)
    winrate = (winrate * 100).toFixed(2)

    let noteText = ''
    if (summonerPostion[0].veteran) {
        noteText += 'Veteran of the league'
    } else if (summonerPostion[0].freshBlood) {
        noteText += 'Fresh blood in the league'
    }
    if(summonerPostion[0].hotStreak) {
        noteText += ' and is on a hotStreak'
    }

    let embed = {
        embed: {
            title: args[0] + `'s summoner card:`,
            description: noteText,
            fields: [
                {name: `Rank`, value: rank, inline: false},
                {name: `Win Rate`, value: winrate + '%', inline: false},
                {name: `LP`, value: lp, inline: false}
            ],
            thumbnail: {url: f('http://ddragon.leagueoflegends.com/cdn/%s/img/profileicon/%s.png', version, summoner.profileIconId), height: 128, width: 128}
        }
    }
    bot.bot.createMessage(msg.channel.id, embed)
}
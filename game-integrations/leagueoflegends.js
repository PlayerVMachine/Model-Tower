const {Kayn, REGIONS} = require('kayn')

const config = require('../config.json')

const league = Kayn(config.RIOT_KEY)({
    region: REGIONS.NORTH_AMERICA
})

exports.getSummoner = async (msg, args) => {
    let summoner = await league.Summoner.by.name(args[0])

    let level = summoner.summonerLevel
    let profileIcons = await league.Static.ProfileIcon.list()
    console.log(JSON.stringify(summoner, undefined, 2))
    console.log(JSON.stringify(profileIcons[summoner.profileIconId], undefined, 2))
}
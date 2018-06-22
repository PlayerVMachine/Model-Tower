const f = require('util').format
const client = require('superagent')

//load API Key from a secret file
const config = require('../config.json')

//Base url for PC-NA: https://api.playbattlegrounds.com/shards/pc-na

exports.getSeasons = async (region) => {
    let url = f(`https://api.playbattlegrounds.com/shards/%s/seasons`, region)

    let seasons = await client.get(url)
    .set('Authorization', 'Bearer ' + config.PUBG_KEY)
    .set('Accept','application/vnd.api+json')

    return JSON.parse(seasons.text)
}

exports.getPlayerByName = async (region, name) => {
    let url = f(`https://api.playbattlegrounds.com/shards/%s/players`, region)

    let player = await client.get(url)
    .set('Authorization', 'Bearer ' + config.PUBG_KEY)
    .set('Accept','application/vnd.api+json')
    .query({'filter[playerNames]':name})

    console.log(player.text)

    return JSON.parse(player.text)
}

exports.getPlayerByID = async (region, id) => {
    let url = f(`https://api.playbattlegrounds.com/shards/%s/players/%s`, region, id)

    let player = await client.get(url)
    .set('Authorization', 'Bearer ' + config.PUBG_KEY)
    .set('Accept','application/vnd.api+json')

    return JSON.parse(player.text)
}

exports.getPlayerSeasonStats = async (region, player, season) => {
    let url = f(`https://api.playbattlegrounds.com/shards/%s/players/%s/seasons/%s`, region, player, season)

    let stats = await client.get(url)
    .set('Authorization', 'Bearer ' + config.PUBG_KEY)
    .set('Accept','application/vnd.api+json')

    return JSON.parse(stats.text)
}

exports.getMatch = async (region, id) => {
    let url = f(`https://api.playbattlegrounds.com/shards/%s/matches/%s`, region, id)

    let match = await client.get(url)
    .set('Authorization', 'Bearer ' + config.PUBG_KEY)
    .set('Accept','application/vnd.api+json')

    return JSON.parse(match.text)
}
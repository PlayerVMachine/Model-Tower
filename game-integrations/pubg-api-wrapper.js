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


    if (seasons.code = 200)
        return JSON.parse(seasons.text)
    else
        return null
}

exports.getPlayerByName = async (region, name) => {
    let url = f(`https://api.playbattlegrounds.com/shards/%s/players`, region)
    try {
        let player = await client.get(url)
        .set('Authorization', 'Bearer ' + config.PUBG_KEY)
        .set('Accept','application/vnd.api+json')
        .query({'filter[playerNames]':name})

        return JSON.parse(player.text)
    } catch (err) {
        console.log(err.message)
        return null
    }
}

exports.getPlayerByID = async (region, id) => {
    let url = f(`https://api.playbattlegrounds.com/shards/%s/players/%s`, region, id)

    try {
        let player = await client.get(url)
        .set('Authorization', 'Bearer ' + config.PUBG_KEY)
        .set('Accept','application/vnd.api+json')

        return JSON.parse(player.text)
    } catch (err) {
        console.log(err.message)
        return null
    }
}

exports.getPlayerSeasonStats = async (region, player, season) => {
    let url = f(`https://api.playbattlegrounds.com/shards/%s/players/%s/seasons/%s`, region, player, season)

    try {
        let stats = await client.get(url)
        .set('Authorization', 'Bearer ' + config.PUBG_KEY)
        .set('Accept','application/vnd.api+json')

        return JSON.parse(stats.text)
    } catch (err) {
        console.log(err.message)
        return null
    }
}

exports.getMatch = async (region, id) => {
    let url = f(`https://api.playbattlegrounds.com/shards/%s/matches/%s`, region, id)

    try {
        let match = await client.get(url)
        .set('Authorization', 'Bearer ' + config.PUBG_KEY)
        .set('Accept','application/vnd.api+json')

        return JSON.parse(match.text)
    } catch (err) {
        console.log(err.message)
        return null
    }
}
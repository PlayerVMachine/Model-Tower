const f = require('util').format
const client = require('superagent')

const config = require('../config.json')
const bot = require('../core.js')

//Base url for PC-NA: https://api.playbattlegrounds.com/shards/pc-na

exports.test = async (msg, args) => {
    let player = await client.get(`https://api.playbattlegrounds.com/shards/pc-na/players`)
    .set('Authorization', 'Bearer ' + config.PUBG_KEY)
    .set('Accept','application/vnd.api+json')
    .query({'filter[playerNames]':args[0]})

    console.log(player.text['data'])
}
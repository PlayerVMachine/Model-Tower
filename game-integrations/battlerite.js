const request = require('superagent')
const config = require('../config.json')

//https://api.dc01.gamelockerapp.com/shards/global/players?filter[playerIds]=player1Id,player2Id

exports.test = async (msg, args) => {
    let player = await request.get('https://api.dc01.gamelockerapp.com/shards/global/players')
    .set('Authorization', 'Bearer ' + config.BATTLERITE_KEY)
    .set('Accept', 'application/vnd.api+json')
    .query({'filter[playerNames]':args[0]})

    console.log(player)
}
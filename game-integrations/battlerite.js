const request = require('superagent')
const config = require('../config.json')

//https://api.dc01.gamelockerapp.com/shards/global/players?filter[playerIds]=player1Id,player2Id

request.get('https://api.dc01.gamelockerapp.com/shards/global/players')
    .set('Authorization', config.BATTLERITE_KEY)
    .set('Accept', 'application/json')
    .
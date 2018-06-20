const LeagueJs = require('leaguejs');

const config = require('../config.json')

const api = new LeagueJs(config.RIOT_KEY);

exports.test = () => {
    api.Summoner.gettingByName('PlayerVM').then(data => {
        console.log(JSON.stringify(data, undefined, 4));
    })
    api.League.gettingPositionsForSummonerId(48214900).then(data => {
        console.log(JSON.stringify(data, undefined, 4));
    })
}
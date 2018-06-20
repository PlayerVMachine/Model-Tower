const LeagueJs = require('leaguejs');

const config = require('../config.json')

const api = new LeagueJs(config.RIOT_KEY);

exports.test = () => {
    api.Summoner.gettingByName('Dyrus').then(data => {
        console.log(JSON.stringify(data, undefined, 4));
        api.League.gettingPositionsForSummonerId(data.id).then(data2 => {
            console.log(JSON.stringify(data2, undefined, 4));
        })
    })
}
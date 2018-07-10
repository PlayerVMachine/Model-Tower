const f = require('util').format
//const Memcached = require('memcached')
//const memcached = new Memcached('127.0.0.1:11222')
const axios = require('axios')
const cheerio = require('cheerio')

//config files
//const bot = require('../core.js')
const config = require('../config.json')

const steamURL = {
    GetNewsForApp: `http://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/`,
    GetGlobalAchievementPercentagesForApp: `http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/`,
    GetGlobalStatsForGame: `http://api.steampowered.com/ISteamUserStats/GetGlobalStatsForGame/v0001/`,
    GetPlayerSummaries: `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/`,
    GetFriendList: `http://api.steampowered.com/ISteamUser/GetFriendList/v0001/`,
    GetPlayerAchievements: `http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/`,
    GetUserStatsForGame: `http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/`,
    GetOwnedGames: `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/`,
    GetRecentlyPlayedGames: `http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/`,
    IsPlayingSharedGame: `http://api.steampowered.com/IPlayerService/IsPlayingSharedGame/v0001/`,
    GetSchemaForGame: `http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/`,
}

const steamSearch = `https://store.steampowered.com/search/?term=`

const getGameIDByName = (name) => {
    let searchURL = steamSearch + name.replace(/ /g, '+')

    const $  = cheerio.load(searchURL)
    //let res = $('a.search_result_row.ds_collapse_flag.app_impression_tracked')
    console.dir($, {depth:10})
}

getGameIDByName('Borderlands')
//console.log('----')
//getGameIDByName('fjahsdfgjlkashg')
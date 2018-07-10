const f = require('util').format
//const Memcached = require('memcached')
//const memcached = new Memcached('127.0.0.1:11222')
const axios = require('axios')
const rp = require('request-promise')

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

const getGameIDByName = async (name) => {
    let searchURL = steamSearch + name.trim().replace(/ /g, '+')

    let html = await rp(searchURL)
    let appIDs = html.match(/data-ds-appid="\d+"/g)
    let names = html.match(/<span class="title">.*<\/span>/g)

    if (appIDs == null)
        return null

    for (i = 0; i < names.length; i++) {
        let title = names[i].substring(20, names[i].length - 7)
        if (title == name) {
            return(appIDs[i].substring(15, appIDs[i].length - 1))
        }
    }

    return null
}

const getNewsForApp = async (name, count, maxLength) => {
    //Error if any arguments are missing
    if (!name || !count || !maxLength) {
        return new Error(`Insufficent arguments!`)
    }

    if (count == NaN || parseInt(count) == NaN) {
        return new Error(`count is not a Number!`)
    }

    if (maxLength == NaN || parseInt(maxLength) == NaN) {
        return new Error(`maxLength is not a Number!`)
    }

    let appID = null
    if (name.match(/\D/g) == null) {
        console.log('reached')
        //contains non digit characters so assume it's a name
        appID = await getGameIDByName(name)
        if (!appID) {
            //error if the game is not found by name
            return new Error(`Game Not Found`)
        }
    } else {
        //appid is a number
        appID = name
    }

    requestURL = f(`%s?appid=%s&count=%s&maxlength=%s&format=json`, steamURL.GetNewsForApp, appID, count, maxLength)
    console.log(requestURL)
    try {
        let result = await axios.get(requestURL)
        return JSON.stringify(result, undefined, 4)

    } catch (err) {
        return err.message
    }
}

async function test () {
    let res = await getNewsForApp('Borderlands', 4, 200)
    console.log(res)
}
test()
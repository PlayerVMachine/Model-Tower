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
const steamCommunity = `https://steamcommunity.com/id/`

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

const getUserIDByUsername = async (name) => {
    let searchURL = steamCommunity + name.trim()

    let html = await rp(searchURL)
    let userID = html.match(/"steamid":"\d+"/g)

    if (userID == null)
        return null
    else
        return userID[0].substring(11, userID[0].length - 1)
}

const getNewsForApp = async (name, count, maxLength) => {
    //Error if any arguments are missing
    if (!name || !count || !maxLength) {
        return new Error(`Insufficent arguments!`)
    }

    if (isNaN(parseInt(count))) {
        return new Error(`count is not a Number!`)
    }

    if (isNaN(parseInt(maxLength))) {
        return new Error(`maxLength is not a Number!`)
    }

    let appID = null
    if (name.match(/\D/g) != null) {
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

    //make the request and send the JSON response back
    requestURL = f(`%s?appid=%s&count=%s&maxlength=%s&format=json`, steamURL.GetNewsForApp, appID, count, maxLength)
    try {
        let result = await axios.get(requestURL)
        return result.data
    } catch (err) {
        return err.message
    }
}

const getGlobalAchievementPercentagesForApp = async (name) => {
    if (!name) {
        return new Error(`Insufficent arguments!`)
    }

    let appID = null
    if (name.match(/\D/g) != null) {
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

    //make the request and send the JSON response back
    requestURL = f(`%s?gameid=%s&format=json`, steamURL.GetGlobalAchievementPercentagesForApp, appID)
    try {
        let result = await axios.get(requestURL)
        return result.data
    } catch (err) {
        return err.message
    }
}

const getGlobalStatsForGame = async (name, achievements) => {
    if (!name || !achievements) {
        return new Error(`Insufficent arguments!`)
    }

    if (typeof(achievements) != 'object' || achievements.length == 0) {
        return new Error(`Must provide an array of achievements!`)
    }

    let achievementsList = []
    for (i = 0; i < achievements.length; i ++) {
        achievementsList.push(f(`name[%d]=%s`, i, achievements[i]))
    }

    let appID = null
    if (name.match(/\D/g) != null) {
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

    //make the request and send the JSON response back
    requestURL = f(`%s?format=json&appid=%s&count=%s&%s`, steamURL.GetGlobalStatsForGame, appID, achievements.length, achievementsList.join('&'))
    try {
        let result = await axios.get(requestURL)
        return result.data
    } catch (err) {
        return err.message
    }
}

//NOTE: if steamids is a mix of ids and usernames order cannot be guaranteed
const getPlayerSummaries = async (steamids) => {
    if (!steamids || steamids.length == 0) {
        return new Error(`Insufficent arguments!`)
    }

    if (typeof(steamids) != 'object') {
        return new Error(`Must provide an array of strings!`)
    }

    let listOfIDs = []
    for (i = 0; i < steamids.length; i++) {
        if (steamids[i].match(/\D/g) != null) {
            let id = await getUserIDByUsername(steamids[i])
            if (!id) {
                return new Error(f(`User not found: %s`, steamids[i]))
            } else {
                listOfIDs.push(id)
            }
        } else {
            listOfIDs.push(steamids[i])
        }
    }

    requestURL = f(`%s?key=%s&steamids=%s`, steamURL.GetPlayerSummaries, config.STEAM_KEY, listOfIDs.join(','))
    try {
        let result = await axios.get(requestURL)
        return result.data
    } catch (err) {
        return err.message
    }
}

const getFriendList = async (id) => {
    if (!id) {
        return new Error(`Insufficent arguments!`)
    }

    if (typeof(id) != 'string') {
        return new Error(`Must provide a string!`)
    }

    let steamID = null
    if (id.match(/\D/g) != null) {
        steamID = await getUserIDByUsername(id)
        if (!steamID) {
            return new Error(f(`User not found: %s`, steamid))
        }
    } else {
        steamID = id
    }

    requestURL = f(`%s?key=%s&steamid=%s&relationship=friend`, steamURL.GetFriendList, config.STEAM_KEY, steamID)
    try {
        let result = await axios.get(requestURL)
        return result.data
    } catch (err) {
        return err.message
    }
}

const getPlayerAchievements = async (app, name) => {
    if (!app || !name) {
        return new Error(`Insufficent arguments!`)
    }

    let steamID = null
    if (name.match(/\D/g) != null) {
        steamID = await getUserIDByUsername(name)
        if (!steamID) {
            return new Error(f(`User not found: %s`, steamid))
        }
    } else {
        steamID = name
    }

    let appID = null
    if (app.match(/\D/g) != null) {
        //contains non digit characters so assume it's a name
        appID = await getGameIDByName(app)
        if (!appID) {
            //error if the game is not found by name
            return new Error(`Game Not Found`)
        }
    } else {
        //appid is a number
        appID = app
    }

    requestURL = f(`%s?appid=%s&key=%s&steamid=%s&relationship=friend`, steamURL.GetPlayerAchievements, appID, config.STEAM_KEY, steamID)
    try {
        let result = await axios.get(requestURL)
        return result.data
    } catch (err) {
        return err.message
    }
}

const getOwnedGames = async (name) => {
    if (!name) {
        return new Error(`Insufficent arguments!`)
    }

        let steamID = null
    if (name.match(/\D/g) != null) {
        steamID = await getUserIDByUsername(name)
        if (!steamID) {
            return new Error(f(`User not found: %s`, name))
        }
    } else {
        steamID = name
    }

    requestURL = f(`%s?key=%s&steamid=%s&include_appinfo=1&include_played_free_games=1`, steamURL.GetOwnedGames, config.STEAM_KEY, steamID)
    try {
        let result = await axios.get(requestURL)
        return result.data
    } catch (err) {
        return err.message
    }
}

const getSchemaForGame = async (app) => {
    if (!app) {
        return new Error(`Insufficent arguments!`)
    }

    let appID = null
    if (app.match(/\D/g) != null) {
        //contains non digit characters so assume it's a name
        appID = await getGameIDByName(app)
        if (!appID) {
            //error if the game is not found by name
            return new Error(`Game Not Found`)
        }
    } else {
        //appid is a number
        appID = app
    }

    requestURL = f(`%s?key=%s&appid=%s`, steamURL.GetSchemaForGame, config.STEAM_KEY, appID)
    try {
        let result = await axios.get(requestURL)
        return result.data
    } catch (err) {
        return err.message
    }
}

const getRecentlyPlayedGames = async (name) => {
    if (!name) {
        return new Error(`Insufficent arguments!`)
    }

        let steamID = null
    if (name.match(/\D/g) != null) {
        steamID = await getUserIDByUsername(name)
        if (!steamID) {
            return new Error(f(`User not found: %s`, name))
        }
    } else {
        steamID = name
    }

    requestURL = f(`%s?key=%s&steamid=%s`, steamURL.GetRecentlyPlayedGames, config.STEAM_KEY, steamID)
    try {
        let result = await axios.get(requestURL)
        return result.data
    } catch (err) {
        return err.message
    }
}

async function test () {
    let res = await getRecentlyPlayedGames('Inversman')
    console.dir(res, {depth: 4})
}
test()
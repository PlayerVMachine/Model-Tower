const Parser = require('rss-parser')
const f = require('util').format

const feedReader = new Parser()

const bot = require('../core.js')
const config = require('../config.json')

//Collect types of news from RSS feeds and put them somewhere?
exports.pullNews = async (bot, client) => {
    let thirtyMinutesAgo = new Date(Date.now() - 30*60*1000)

    let leagueNews = await feedReader.parseURL('https://na.leagueoflegends.com/en/rss.xml')
    let r6News = await feedReader.parseURL('https://steamcommunity.com/games/359550/rss/')
    let pubgNews = await feedReader.parseURL('https://steamcommunity.com/games/578080/rss')
    let owNews = await feedReader.parseURL('https://fbis251.github.io/overwatch_news_feed/pc.atom')

    let feeds = {
        generalNews: generalNews,
        generalTech: generalTech
    }

    let col = client.db('RSS').collection('channels')

    let channels = await col.find().toArray()

    channels.forEach(channel => {
        let embeds = []
        feeds[channel.name].items.forEach(item => {
            console.log(item.isoDate + ': ' + item.title)
            if(Date.parse(item.isoDate) > Date.parse(thirtyMinutesAgo)) {
                embeds.push({
                    title: item.title,
                    description: item.content,
                    url: item.link,
                    timestamp: item.isoDate
                })
            }
        })

        channel.subscribers.forEach(subscriber => {
            if (embeds.length > 0) {
                bot.executeWebhook(subscriber.id, subscriber.token, {embeds: embeds.reverse()})
            }
        })
    })
}

const subscribeToNews = async (msg, args) => {
    try {
        let embed = {
            embed: {
                title: {text: `Available Game Newsfeeds`},
                author: {name: bot.bot.user.username, icon_url: bot.bot.user.avatarURL, url:`https://buymeacoff.ee/playervm`},
                description: `1. League of Legends News\n2. Rainbow Six Seige News\n3. Overwatch Patch Notes\n4. Player Unknown's Battlegrounds News`,
                footer: `Know a good RSS feed for news on a game the bot supports? Let me know!`
            }
        }

        let feedList = await bot.bot.createMessage(msg.channel.id, embed)
        feedList.addReaction('1_:461947842055897099')
        feedList.addReaction('2_:461947842546630656')
        feedList.addReaction('3_:461947842294972419')
        feedList.addReaction('4_:461947842232320011')

        const createNewsSubscription = async (message, emoji, userID) => {
            if (userID != msg.author.id) {
                return
            }

            let botHook = null

            //check if channel has our webhook, if so set botHook to our hook
            let webhooks = await msg.channel.getWebhooks()
            if (webhooks.length > 0) {
                for (i in webhooks) {
                    if (webhooks[i].user.id == bot.user.id) {
                        botHook = webhooks[i]
                        break
                    }
                }
            }

            //create webhook since none exists
            if (!botHook) {
                botHook = await msg.channel.createWebhook({name: bot.user.username, avatar: bot.user.avatarURL}, `Registered webhook to send news`)
            }

            //parse the emjoi name to get the # 1 through 4
            //register the subscription in the db somehow


    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: subscribeToNews`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}
//Module imports
const MongoClient = require('mongodb').MongoClient
const Parser = require('rss-parser')
const f = require('util').format

const feedReader = new Parser()

const bot = require('../core.js')
const config = require('../config.json')

// mongodb login
const url = 'mongodb://127.0.0.1:36505'

const emotes1to10 = ['1_:461947842055897099', '2_:461947842546630656', '3_:461947842294972419', '4_:461947842232320011', '5_:461947842215542790', '6_:461947842370732062', '7_:461947842294972436', '8_:461946580472168467', '9_:461947842290909194', '10_:461947842614001674']

exports.commandHandler = (msg, args) => {
    let restOfArgs = args.slice(1)
    if (['set','sub'].includes(args[0])) {
        subscribeToNews(msg, restOfArgs)
    }
}

//Collect types of news from RSS feeds and put them somewhere?
exports.pullNews = async () => {
    let client = await MongoClient.connect(url)
    let thirtyMinutesAgo = new Date(Date.now() - 48*60*60*1000)

    let leagueNews = await feedReader.parseURL('https://na.leagueoflegends.com/en/rss.xml')
    let r6News = await feedReader.parseURL('https://steamcommunity.com/games/359550/rss/')
    let owNews = await feedReader.parseURL('https://fbis251.github.io/overwatch_news_feed/pc.atom')
    let pubgNews = await feedReader.parseURL('https://steamcommunity.com/games/578080/rss')

    let feeds = [leagueNews, r6News, owNews, pubgNews]
    let col = client.db('RSS').collection('channels')

    let channels = await col.find().toArray()

    channels.forEach(channel => {
        let embeds = []
        channel.subscriptions.forEach(sub => {
            feeds[sub].items.forEach(item => {
                if(Date.parse(item.isoDate) > Date.parse(thirtyMinutesAgo)) {
                    console.log('pushing')
                    embeds.push({
                        title: item.title,
                        description: item.content,
                        url: item.link,
                        timestamp: item.isoDate
                    })
                }
            })
        })
        console.log(embeds.length)
            if (embeds.length > 0) {
                bot.bot.executeWebhook(channel.webhook.id, channel.webhook.token, {embeds: embeds.reverse()})
            }
    })
}

const subscribeToNews = async (msg, args) => {
    try {
        if (!msg.member.permission.has('manageChannels')) {
            return
        }

        let embed = {
            embed: {
                title: `Available Game Newsfeeds`,
                author: {name: bot.bot.user.username, icon_url: bot.bot.user.avatarURL, url:`https://buymeacoff.ee/playervm`},
                description: `1. League of Legends News\n2. Rainbow Six Seige News\n3. Overwatch Patch Notes\n4. Player Unknown's Battlegrounds News`,
                footer: {text:`Know a good RSS feed for news on a game the bot supports? Let me know!`}
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
            if (!emotes1to10.includes(emoji.name + ':' + emoji.id)) {
                return
            }

            let botHook = null

            //check if channel has our webhook, if so set botHook to our hook
            let webhooks = await msg.channel.getWebhooks()
            if (webhooks.length > 0) {
                for (i in webhooks) {
                    if (webhooks[i].user.id == bot.bot.user.id) {
                        botHook = webhooks[i]
                        break
                    }
                }
            }

            //create webhook since none exists
            if (!botHook) {
                botHook = await msg.channel.createWebhook({name: bot.bot.user.username + `: Game News`, avatar: bot.bot.user.avatarURL}, `Registered webhook to send news`)
            }

            //parse the emjoi name to get the # 1 through 4
            let choice = parseInt(emoji.name.charAt(0)) - 1

            //register the subscription in the db somehow
            let client = await MongoClient.connect(url)
            let col = client.db('RSS').collection('channels')

            let create = await col.updateOne({_id:msg.channel.id}, {$setOnInsert: {subscriptions: [], webhook:{id:botHook.id, token:botHook.token}}}, {upsert:true})
            if (create.result.ok == 1) {
                let registerChoice = await col.updateOne({_id:msg.channel.id}, {$addToSet: {subscriptions:choice}})
                if (registerChoice.result.ok == 1) {
                    let confirmation = await bot.bot.createMessage(msg.channel.id, f(`%s your subscription has been registered`, msg.author.username))
                    setTimeout(() => {confirmation.delete('Cleaning up after self')}, 5000)
                }
            }

        }

        bot.bot.on('messageReactionAdd', createNewsSubscription)
        setTimeout(() => {bot.bot.removeListener('messageReactionAdd', createNewsSubscription)}, 60 * 1000)


    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: subscribeToNews`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}
const request = require('superagent')
const Parser = require('rss-parser')
const f = require('util').format

let feedReader = new Parser()

const rh = require('./replyHandler')

//News related functions, like RSS and ???

// CREATE WEBHOOK
// let webhook = await msg.channel.createWebhook({name: bot.user.username, avatar: bot.user.avatarURL}, `Registered webhook to send news`)


/* POST TO A WEBHOOK CREATED BY THE BOT
request.post('https://discordapp.com/api/webhooks/{id}/{token}
.set('Content-Type', 'application/json')
.send({'content': 'I did not hit her!'})
.then((res) => {
    console.log(res.status)
})
*/

//Collect types of news from RSS feeds and put them somewhere?
exports.pullNews = async (bot, client) => {
    let thirtyMinutesAgo = new Date(Date.now() - 30*60*1000)

    let generalNews = await feedReader.parseURL('http://feeds.bbci.co.uk/news/rss.xml')
    let generalTech = await feedReader.parseURL('https://www.cnet.com/rss/news/')


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

//Function for subscribing to news
exports.subscribeToNews = async (msg, bot, client) => {
    let botHook = null

    //check if channel has our webhook, if so set botHook to our hook
    let webhooks = await msg.channel.getWebhooks()
    if (webhooks.length > 0) {
        for (i in webhooks) {
            if (webhooks[i].user.id == bot.user.id)
                botHook = webhooks[i]
            break
        }
    }

    if (botHook == null) {

        let question = `\`\`\`\nWould you like to configure this channel to recieve news? This will create a webhook. Y/n\`\`\``
        let doWork = async (reply) => {
            if (reply.content.trim().toUpperCase() == 'Y') {
                    botHook = await reply.channel.createWebhook({name: bot.user.username, avatar: bot.user.avatarURL}, `Registered webhook to send news`)

                    let newsOptions = `\`\`\`xl\nSelect the news feed you wish to subscribe to:\n\n1. General News\n2. Tech News\n9. Leave menu\`\`\``
                    let doMoreWork = async (reply) => {
                        if (reply.content == '9') {
                            // do nothing menu is closed
                        } else {
                            //push the created webhook to the selected news list
                            let col = client.db('RSS').collection('channels')

                            let feedID = parseInt(reply.content)

                            if (feedID == NaN) {

                            } else {
                                let addWF = await col.findOneAndUpdate({_id:feedID}, {$addToSet: {subscribers:{id:botHook.id, token:botHook.token}}})
                                console.log(addWF)
                            }


                            //call this again
                            rh.replyHandler(bot, msg, newsOptions, doMoreWork)
                        }
                    }
                    rh.replyHandler(bot, msg, newsOptions, doMoreWork)
            } else {
                //They chose not to proceed
            }
        }

        rh.replyHandler(bot, msg, question, doWork)

    } else {
        //user may want to update hook
    }

}
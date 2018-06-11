const request = require('superagent')
const Parser = require('rss-parser')

let feedReader = new Parser()

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
/*
exports.pullNews = async (redis) => {
    //get and set last time news wasll pulled from RSS feeds in redis
    let lastPull = await redis.getset('lastPulledNewsDate', new Date())

    //pull RSS updates and store in REDIS?
    let generalNews = await feedReader.parseURL('http://feeds.bbci.co.uk/news/rss.xml')
    let generalTech = await feedReader.parseURL('https://www.cnet.com/rss/news/')

    let newGeneralNews = []
    let newGeneralTech = []

    //check for news posted since last pull time
    generalNews.items.forEach(item => {
        //get list of general news webhook subscribers
        let subHooks = await redis.get('generalNewsHooks')

        let itemDate = new Date(item.isoDate)
        if (itemDate > lastPull) {
            newGeneralNews.push(item)
        }
    })

    generalTech.items.forEach(item => {
        let itemDate = new Date(item.isoDate)
        if (itemDate > lastPull) {
            newGeneralTech.push(item)
        }
    })

    //New RSS items added to lists that can then be pushed to webhooks could probably just push to webhooks tbh

}
*/

//Function for subscribing to news
exports.subscribeToNews = async (msg, bot) => {
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
        let question1 = await bot.createMessage(msg.channel.id, `\`\`\`\nWould you like to configure this channel to recieve news? This will create a webhook. Y/n\`\`\``)

        const reply1 = async (reply) => {
            if (reply.author.id == msg.author.id) {
                question1.delete('Menu close.')
                bot.removeListener('messageCreate', reply1)
                if (msg.content.toUpperCase() == 'Y') {
                    botHook = await reply.channel.createWebhook({name: bot.user.username, avatar: bot.user.avatarURL}, `Registered webhook to send news`)

                    //continue to ask what news they want
                    //TO DO
                } else {
                    //They chose not to proceed
                    question1.delete('Menu close.')
                }
            }
        }
        bot.on('messageCreate', reply1)
    } else {
        //user may want to update hook
    }

}
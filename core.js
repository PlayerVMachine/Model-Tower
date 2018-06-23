const MongoClient = require('mongodb').MongoClient
const f = require('util').format
const Eris = require('eris')

//config files
const config = require('./config.json')

//Project files
//const news = require('./news.js')
const r6 = require('./game-integrations/rainbowsix.js')
const lol = require('./game-integrations/leagueoflegends.js')
//const fortnite = require('./game-integrations/fortnite.js')
//const destiny = require('./game-integrations/destiny.js')
//const battlerite = require('./game-integrations/battlerite.js')
const ow = require('./game-integrations/overwatch.js')
const pubg = require('./game-integrations/pubg.js')
const postManager = require('./messages/mailDelivery.js')


// mongodb login
const url = 'mongodb://127.0.0.1:36505'

//sleep func
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/////////////////////////////////////////////
//COMMAND CLIENT REWRITE WITH JUST CLIENT //
///////////////////////////////////////////

const bot = new Eris.Client(config.BOT_TOKEN, {
    messageLimit: 20,
    defaultImageSize:256
})

//EXPORT BOT
exports.bot = bot

/////////////////////////////////////////////
//EVENTS TO REACT TO                      //
///////////////////////////////////////////

//ready
bot.on("ready", () => {
    console.log("The Tower of Power is online!")
});

//Perform permissions check when added to a guild
bot.on('guildCreate', async (guild) => {
    try {
        //Wait 2 seconds for the bot's role to be assigned
        await sleep(2000)

        //Get the bot's member object in that guild
        let selfMember = guild.members.find(m => m.id == bot.user.id)
        let botRole = guild.roles.find(r => r.id == selfMember.roles[0])

        //Check if the bot is missing a key permission
        let missing = []
        if (!botRole.permissions.has('sendMessages'))
            missing.push('Send Messages')
        if (!botRole.permissions.has('manageWebhooks'))
            missing.push('Manage Webhooks')
        if (!botRole.permissions.has('manageMessages'))
            missing.push('Manage Messages')

        //Message the server owner in the case that the bot is missing a key permission
        if (missing.length > 0) {
            let ownerDM = await bot.getDMChannel(guild.ownerID)
            bot.createMessage(ownerDM.id, f('Hi someone (perhaps you) just invited me to your server %s! But they/you haven\'t given me all the permissions I need to do my best work, I\'m missing: %s permissions', guild.name, missing.join(', ')))
        }

        //Increment guild count in Prometheus
        guildGauge.inc()
    } catch (err) {
        console.log(err)
    }
})

//Request feedback when removed from a guild
bot.on('guildDelete', async (guild) => {
    try {
        //Request and submit feedback
        let ownerDM = await bot.getDMChannel(guild.ownerID)

        bot.createMessage(ownerDM.id, f('Hi, someone (perhaps you) just kicked me from you server %s, I\'m sorry you weren\'t satisfied with my performance! When you have a moment if you could send me some feedback I would appreciate it! (send as one message here)', guild.name))

        const feedback = (message) => {
            if (message.author.id == guild.ownerID) {
                bot.createMessage(config.feedbackID, f('Feedback from: %s\n%s', message.author.mention, message.content))
                bot.createMessage(ownerDM.id, 'Thank you for your feedback! We will take it under advisement and hope that a future version of the bot will once again be able to server you.')
                bot.removeListener('messageCreate', feedback)
            }
        }

        bot.on('messageCreate', feedback)

        //Decrement guild count in Prometheus
        guildGauge.dec()
    } catch (err) {
        console.log(err)
    }
})

//////////////////////////////////////////////
//GUILD PREFIX CONFIG                      //
////////////////////////////////////////////

const getGuildPrefix = async (guild) => {
    //message channel is a DM not a guild channel
    if (!guild) {
        return `m.`
    }

    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('guild_configs')

    let guildConfig = await col.findOne({_id:guild.id})
    if(guildConfig) {
        return guildConfig.prefix
    }

    return `m.`
}

const isChannelGuildAnnouncer = async (id) => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('guild_announcers')

    let findChannel = await col.findOne({channel:id})
    if (findChannel) {
        return true
    } else {
        return false
    }
}

/////////////////////////////////////////////
//COMMANDS                                //
///////////////////////////////////////////
let r6Commands = r6.commandList
let pmCommands = postManager.commandList
let lolCommands = lol.commandList
let pubgCommands = pubg.commandList

bot.on('messageCreate', async (msg) => {

    //Ignore other bots and itself
    if (msg.author.bot) {
        return
    }

    //Check the origin guild to set prefix
    prefix = await getGuildPrefix(msg.channel.guild)

    //bad get rid of later
    if (msg.content.startsWith(prefix + `ping`)) {
        //Ping, used to reassure people that the bot is up and to check latency
        let start = Date.now()

        bot.createMessage(msg.channel.id, 'Pong!').then(msg => {
            let diff = Date.now() - start
            return msg.edit(f('Pong! `%dms`', diff))
        })
        return
    }

    if (msg.content.startsWith(prefix + `post`)) {
        postManager.deliverPost(`user`, msg)
        return
    }

    if (msg.content.startsWith(prefix + `test`)) {
        let args = msg.content.slice(prefix.length + 5).split(' ')
        ow.test(msg, args)
    }

    //Check if the message sent was a command intended for the bot
    if (msg.content.startsWith(prefix)) {
        //Get the command after the prefix and before any arguments
        let endIndex = msg.content.indexOf(` `) === -1 ? msg.length : msg.content.indexOf(` `)
        let command = msg.content.slice(prefix.length, endIndex)
        console.log(command)

        //Check if the command is a rainbow six siege stats command
        if (Object.keys(r6Commands).indexOf(command) > -1) {

            let key = Object.keys(r6Commands)[Object.keys(r6Commands).indexOf(command)]
            let args = msg.content.slice(prefix.length + key.length + 1).split(' ')
            //run the function corresponding to the command name and pass it the message and its args
            r6[r6Commands[key]](msg, args)

        //Check if the command is a postManager Command
        } else if (Object.keys(pmCommands).indexOf(command) > -1) {

            let key = Object.keys(pmCommands)[Object.keys(pmCommands).indexOf(command)]
            let args = msg.content.slice(prefix.length + key.length + 1).split(' ')
            //run the function corresponding to the command name and pass it the message and its args
            postManager[pmCommands[key]](msg, args)

        } else if (Object.keys(lolCommands).indexOf(command) > - 1) {

            let key = Object.keys(lolCommands)[Object.keys(lolCommands).indexOf(command)]
            let args = msg.content.slice(prefix.length + key.length + 1).split(' ')
            //run the function corresponding to the command name and pass it the message and its args
            lol[lolCommands[key]](msg, args)
        } else if (Object.keys(pubgCommands).indexOf(command) > - 1) {

            let key = Object.keys(pubgCommands)[Object.keys(pubgCommands).indexOf(command)]
            let args = msg.content.slice(prefix.length + key.length + 1).split(' ')
            //run the function corresponding to the command name and pass it the message and its args
            pubg[pubgCommands[key]](msg, args)
        }

    } else {

        if (isChannelGuildAnnouncer(msg.channel.id)) {
            postManager.deliverPost(`channel`, msg)
        }
    }
})

/////////////////////////////////////////////
//STREAM NOTIFICATIONS                    //
///////////////////////////////////////////

bot.on(`presenceUpdate`, async (other, old) => {
    //Is the presence update to streaming?
    if(other.game) {
        if(other.game == 1) {

        } else if (other.game == 2) {

        } else {
            return
        }

        //send post to followers

        //if guild has a streamer role configured send in stream announcement channel

        //https://static-cdn.jtvnw.net/previews-ttv/live_user_TWITCHNAME-108x60.jpg TWITCH LINK
        //https://static-cdn.jtvnw.net/previews-ttv/live_user_TWITCHNAME-108x60.jpg WHEN NOT STREAMING

    }
})

//Used to configure the RSS webhook options
// const setNews = bot.registerCommand('news', async (msg, args) => {
//     let client = await MongoClient.connect(url)
//     news.subscribeToNews(msg, bot, client)
// })


/////////////////////////////////////////////
//SCHEDULED TASKS                         //
///////////////////////////////////////////

//GET news from RSS feeds every 30 minutes and send to subscribed webhooks
const getNews = async () => {
    let client = await MongoClient.connect(url)
    news.pullNews(bot, client)
}
setInterval(getNews, 30*60*1000)


/////////////////////////////////////////////
//THINGS TO DO ON START UP                //
///////////////////////////////////////////

//Connect to Discord
bot.connect()
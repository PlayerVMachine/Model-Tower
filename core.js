const MongoClient = require('mongodb').MongoClient
const f = require('util').format
const Eris = require('eris')

//config files
const config = require('./config.json')

//Project files
const news = require('./news.js')
const r6 = require('./game-integrations/rainbowsix.js')


// mongodb login
const url = 'mongodb://127.0.0.1:36505'


//sleep func
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/////////////////////////////////////////////
//COMMAND CLIENT                          //
///////////////////////////////////////////

const bot = new Eris.CommandClient(config.BOT_TOKEN, {
    defaultImageSize:256
}, {
    defaultHelpCommand: false,
    description:'Discord bot providing social media functions',
    name:'Broadcast Tower',
    owner:'PlayerVMachine#6223',
    prefix: ['m.'],
    defaultCommandOptions: {
        caseInsensitive: true,
        invalidUsageMessage: `Sorry my responses are limited you must use the right commands.`,
        permissionMessage: `Unauthorized user!`
    }
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

/////////////////////////////////////////////
//COMMANDS                                //
///////////////////////////////////////////

//Ping, used to reassure people that the bot is up and to check latency
const ping = bot.registerCommand('ping', (msg, args) => {
    let start = Date.now()

    bot.createMessage(msg.channel.id, 'Pong!').then(msg => {
        let diff = Date.now() - start
        return msg.edit(f('Pong! `%dms`', diff))
    })
})

//Used to configure the RSS webhook options
const setNews = bot.registerCommand('news', async (msg, args) => {
    let client = await MongoClient.connect(url)
    news.subscribeToNews(msg, bot, client)
})

/////////////////////////////////////////////
//R6 STATS COMMAND                        //
///////////////////////////////////////////

const r6cas = bot.registerCommand('r6cas', r6.getCasualStats, {})
const r6rnk = bot.registerCommand('r6rnk', r6.getRankedStats, {})
const r6top = bot.registerCommand('r6op', r6.getTopOp, {})
const rsoal = bot.registerCommand('r6oall', r6.getOverallStats, {})

/////////////////////////////////////////////
//NOTIFICATION SUBSCRIBERS                //
///////////////////////////////////////////


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
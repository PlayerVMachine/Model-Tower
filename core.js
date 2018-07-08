const MongoClient = require('mongodb').MongoClient
const f = require('util').format
const Eris = require('eris')

//config files
const config = require('./config.json')

//Project files
const ch = require('./commandHandler.js')
const rem = require('./utilities/reminders.js')
const spotify = require('./utilities/spotify.js')
const postManager = require('./messages/postManager.js')
const news = require('./utilities/news.js')


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

//Export bot and footer

exports.bot = bot
exports.footer = {text: `If you like the bot consider supporting development here: buymeacoff.ee/playervm`, icon_url:`https://cdn.discordapp.com/attachments/461945242061504515/463104485443502090/logo-mark-1.png`}

/////////////////////////////////////////////
//EVENTS TO REACT TO                      //
///////////////////////////////////////////

//ready
bot.on("ready", () => {
    console.log("The Tower of Power is online!")

    //Make sure Spotify data is there
    //spotify.getReleases()

    //check for expiring reminders
    rem.checkReminders
    setInterval(rem.checkReminders, 60*1000)
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
        if (!botRole.permissions.has('externalEmojis'))
            missing.push('External Emojis')
        if (!botRole.permissions.has('addReactions'))
            missing.push('Add Reactions')

        //Message the server owner in the case that the bot is missing a key permission
        if (missing.length > 0) {
            let ownerDM = await bot.getDMChannel(guild.ownerID)
            bot.createMessage(ownerDM.id, f('Hi someone (perhaps you) just invited me to your server %s! But they/you haven\'t given me all the permissions I need to do my best work, I\'m missing: %s permissions', guild.name, missing.join(', ')))
        }

        bot.createMessage(config.logChannelID, f(`I've just been invited to %s owned by <@%s> and has %s members`, guild.name, guild.ownerID, guild.memberCount))

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
        bot.createMessage(config.logChannelID, f(`I've just been kicked from %s owned by <@%s> and has %s members`, guild.name, guild.ownerID, guild.memberCount))
    } catch (err) {
        console.log(err)
    }
})

//////////////////////////////////////////////
//GUILD CONFIG CHECKS                      //
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
    } else {
        return `m.`
    }
}

const isChannelGuildAnnouncer = async (id) => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('guild_announcers')

    let findChannel = await col.findOne({announcements:id})
    if (findChannel != null) {
        return true
    } else {
        return false
    }
}

/////////////////////////////////////////////
//COMMANDS                                //
///////////////////////////////////////////
bot.on('messageCreate', async (msg) => {

    //Post announcement if message is in announcement channel
    let chanGuildAnn = await isChannelGuildAnnouncer(msg.channel.id)
    if (chanGuildAnn) {
        postManager.deliverPost(msg)
    }

    //Ignore other bots and itself
    if (msg.author.bot) {
        return
    }

    //Check the origin guild to set prefix
    prefix = await getGuildPrefix(msg.channel.guild)

    //Get the prefix in case they lost it
    if (msg.content.startsWith(`<@464529935315370004> prefix`)) {
        bot.createMessage(msg.channel.id, f(`This server's prefix is: %s`, prefix))
    }

    //Check if the message sent was a command intended for the bot
    if (msg.content.startsWith(prefix)) {
        ch.parser(prefix, msg)
    }
})

//////////////////////////////////////////////
//ERROR HANDLER                            //
////////////////////////////////////////////
bot.on('error', (err, id) => {
    console.log(err)
})

/////////////////////////////////////////////
//STREAM NOTIFICATIONS                    //
///////////////////////////////////////////

bot.on(`presenceUpdate`, async (other, old) => {
    //ignore bot presences
    if (other.bot == true) {
        return
    }

    if(other.game) {
        console.dir(other.game)
        if(other.game.type == 1) {
            let timestamp = new Date()
            let twitchUser = other.game.assets.large_image.slice(7)

            let embed = {
                embed: {
                    title: f(`%s is now streaming: %s`, other.username, other.game.name),
                    author: {name: other.username, icon_url: other.avatarURL},
                    thumbnail: {url:f(`https://static-cdn.jtvnw.net/previews-ttv/live_user_%s-256x256.jpg`, twitchUser), height:256, width:256},
                    color: parseInt(config.color, 16),
                    url: other.game.url,
                    description: other.game.details,
                    timestamp: timestamp.toISOString()
                }
            }

            let client = await MongoClient.connect(url)
            let col = client.db('model_tower').collection('guild_announcers')

            let announcesStreams = await col.findOne({_id: other.guild.id})
            if(!announcesStreams) {
                return
            } else if (announcesStreams.stream) {
                bot.createMessage(announcesStreams.stream, embed)
            }
        } else {
            return
        }
    }
})

/////////////////////////////////////////////
//SCHEDULED TASKS                         //
///////////////////////////////////////////

//GET news from RSS feeds every 30 minutes and send to subscribed webhooks
const getNews = () => {
    news.pullNews()
}
setInterval(getNews, 15*60*1000)

//refresh the spotify new releases
const spotifyRefresh = () => {
    date = new Date()
    if(date.getDay() === 5) {
        if (date.getHours() == 18) {
            spotify.getReleases()
        }
    }
}
setInterval(spotifyRefresh, 60*60*1000)

/////////////////////////////////////////////
//EXPRESS SERVER                          //
///////////////////////////////////////////



/////////////////////////////////////////////
//THINGS TO DO ON START UP                //
///////////////////////////////////////////

//Connect to Discord
bot.connect()
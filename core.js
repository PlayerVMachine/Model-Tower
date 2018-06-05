const MongoClient = require('mongodb').MongoClient
const f = require('util').format
const Eris = require('eris')
const Redis = require('ioredis')
const express = require('express')
const prometheus = require('prom-client')

//config files
const config = require('./config.json')

//Project files
const reply = require('./proto_messages.json')
const amgmt = require('./user-account-functions/accmgmt.js')

//Express server to push metrics to
const server = express()

// mongodb login
const user = encodeURIComponent(config.user)
const password = encodeURIComponent(config.pass)
const authMechanism = 'DEFAULT'
const url = f('mongodb://%s:%s@127.0.0.1:36505/admin?authMechanism=%s', user, password, authMechanism)

//redis instance
const redis = new Redis();

//sleep func
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/////////////////////////////////////////////
//PROMETHEUS TRACKERS                     //
///////////////////////////////////////////

//Collect the basic metrics like memory consumption
prometheus.collectDefaultMetrics()

//Gauge representing guild count
const guildGauge = new prometheus.Gauge({name: 'Guild_Count', help: 'Number of guilds the bot is currently in.'})

server.get('/metrics', (req, res) => {
    res.set('Content-Type', prometheus.register.contentType)
    res.end(prometheus.register.metrics())
})

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
        //to do
    }
})

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

const ping = bot.registerCommand('ping', (msg, args) => {
    let start = Date.now()

    bot.createMessage(msg.channel.id, 'Pong!').then(msg => {
        let diff = Date.now() - start
        return msg.edit(f('Pong! `%dms`', diff))
    })
})

const glitch = bot.registerCommand('glitch', `congrats you'm'st done broken the tower, test it on monday.`, {
    cooldown: 5000,
    hidden: true
})

const raven = bot.registerCommand('Night', (msg, args) => {
    return f('Raven, %s', args.join(' '))
}, {
    cooldown: 5000,
    hidden: true
})

const createAccount = bot.registerCommand('create', async (msg, args) => {
    try {
        let client = await MongoClient.connect(url)
        amgmt.create(msg, bot, client)
    } catch (err) {
        console.log(err)
        bot.createMessage(config.logChannelID, err.message)
        bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
    }
}, {
    aliases: ['signup', 'register'],
    cooldown: 10000,
    description: reply.create.description,
    fullDescription: reply.create.fullDescription,
    usage: reply.create.usage
})

const deleteAccount = bot.registerCommand('close', async (msg, args) => {
    try {
        let client = await MongoClient.connect(url)
        amgmt.close(msg, bot, client)
    } catch (err) {
        console.log(err)
        bot.createMessage(config.logChannelID, err.message)
        bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
    }
}, {
    aliases: ['delete', 'rm', 'del'],
    cooldown: 10000,
    description: reply.close.description,
    fullDescription: reply.close.fullDescription,
    usage: reply.close.usage
})

/////////////////////////////////////////////
//THINGS TO DO ON START UP                //
///////////////////////////////////////////

//Connect to Discord
bot.connect()
//Endpoint for Prometheus to scrape from
server.listen(9010)
const MongoClient = require('mongodb').MongoClient
const f = require('util').format
const Eris = require('eris')
const Redis = require('ioredis')
const express = require('express')
const prometheus = require('prom-client')

//config files
const config = require('./config.json')

//Express server to push metrics to
const server = express()

// mongodb login
const user = encodeURIComponent(config.user)
const password = encodeURIComponent(config.pass)
const authMechanism = 'DEFAULT'
const url = f('mongodb://%s:%s@127.0.0.1:36505/admin?authMechanism=%s', user, password, authMechanism)

//redis instance
const redis = new Redis();

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
        //get the bot's member object in that guild
        let selfMember = guild.members.find(m => m.id == bot.user.id)
        console.log(selfMember.roles)
        let botRole = guild.roles.find(r => r.id == selfMember.roles[0])

        //check if the bot is missing a key permission
        let missing = []
        if (!botRole.permissions.has('sendMessages'))
            missing.push('Send Messages')
        if (!botRole.permissions.has('manageWebhooks'))
            missing.push('Manage Webhooks')
        if (!botRole.permissions.has('manageMessages'))
            missing.push('Manage Messages')

        //Message the server owner in the case that the bot is missing a key permission
        if (missing) {
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
    //TO DO: request and submit feedback

    //Decrement guild count in Prometheus
    guildGauge.dec()
})

//Connect to Discord
bot.connect()

server.listen(9010)
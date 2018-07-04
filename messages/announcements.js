//Module imports
const MongoClient = require('mongodb').MongoClient
const f = require('util').format

//project files required
const config = require('../config.json')
const bot = require('../core.js')
const resolver = require('../resolver.js')
const spotify = require('../utilities/spotify.js')

// mongodb login
const url = 'mongodb://127.0.0.1:36505'

//Register a guild's announcement channel as subscribable
//call this one 'notifs'?

exports.commandHandler = (msg, args) => {
    if (args[0] == 'set') {
        let restOfArgs = args.slice(2)

        if (args[1] == 'ann') {
            registerGuildAnnouncementChannel(msg, restOfArgs)
        } else if (args[1] == 'spotify') {
            registerGuildSpotifyChannel(msg, restOfArgs)
        } else if (args[1] == 'stream') {
            registerGuildStreamChannel(msg, restOfArgs)
        }

    } else if (args[0] == 'unset') {
        let restOfArgs = args.slice(2)

        if (args[1] == 'ann') {
            unregisterGuildAnnouncementChannel(msg, restOfArgs)
        } else if (args[1] == 'spotify') {
            unregisterGuildSpotifyChannel(msg, restOfArgs)
        } else if (args[1] == 'stream') {
            unregisterGuildStreamChannel(msg, restOfArgs)
        }

    }
}

const registerGuildAnnouncementChannel = async (msg, args) => {
    try {
        if (!msg.member.permission.has('manageChannels')) {
            return
        }

        let guild = msg.channel.guild
        let channel = resolver.channel(guild.channels, args[0])

        if (!channel) {
            bot.bot.createMessage(msg.channel.id, `Sorry I couldn't find that channel in this server!`)
            return
        }

        //Add the guild and channel to a collection
        let client = await MongoClient.connect(url)
        let col = client.db('model_tower').collection('guild_announcers')

        let checkForGuild = await col.findOne({_id:guild.id})

        if(!checkForGuild) {
            let register = await col.insertOne({_id:guild.id, announcements:channel.id})
            if (register.insertedCount == 1)
                bot.bot.createMessage(msg.channel.id, f(`%s is now set as this server's announcement channel.`, channel.mention))
            else
                bot.bot.createMessage(msg.channel.id, f(`There was an error setting %s as this server's announcement channel.`, channel.mention))
        } else if (checkForGuild.announcements == undefined) {
            let register = await col.updateOne({_id:guild.id}, {$set: {announcements:channel.id}})
            if (register.modifiedCount == 1)
                bot.bot.createMessage(msg.channel.id, f(`%s is now set as this server's announcement channel.`, channel.mention))
            else
                bot.bot.createMessage(msg.channel.id, f(`There was an error setting %s as this server's announcement channel.`, channel.mention))
        } else {
            let existingChannel = await resolver.channel(guild.channels, checkForGuild.announcements)
            bot.bot.createMessage(msg.channel.id, f(`%s is already configured as this server's announcement channel.`, existingChannel.mention))
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: registerGuildAnnouncementChannel`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

const registerGuildSpotifyChannel = async (msg, args) => {
    try {
        if (!msg.member.permission.has('manageChannels')) {
            return
        }

        let guild = msg.channel.guild
        let channel = resolver.channel(guild.channels, args[0])

        if (!channel) {
            bot.bot.createMessage(msg.channel.id, `Sorry I couldn't find that channel in this server!`)
            return
        }

        //Add the guild and channel to a collection
        let client = await MongoClient.connect(url)
        let col = client.db('model_tower').collection('guild_announcers')

        let checkForGuild = await col.findOne({_id:guild.id, spotify:channel.id})

        if(!checkForGuild) {
            let register = await col.insertOne({_id:guild.id, spotify:channel.id})
            if (register.insertedCount == 1)
                bot.bot.createMessage(msg.channel.id, f(`%s is now set as this server's Spotify New Music channel.`, channel.mention))
            else
                bot.bot.createMessage(msg.channel.id, f(`There was an error setting %s as this server's Spotify New Music channel.`, channel.mention))
        } else if (checkForGuild.spotify == undefined) {
            let register = await col.updateOne({_id:guild.id}, {$set: {spotify:channel.id}})
            if (register.modifiedCount == 1)
                bot.bot.createMessage(msg.channel.id, f(`%s is now set as this server's Spotify New Music channel.`, channel.mention))
            else
                bot.bot.createMessage(msg.channel.id, f(`There was an error setting %s as this server's Spotify New Music channel.`, channel.mention))
        } else {
            let existingChannel = await resolver.channel(guild.channels, checkForGuild.spotify)
            bot.bot.createMessage(msg.channel.id, f(`%s is already configured as this server's Spotify New Music channel.`, existingChannel.mention))
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: registerGuildSpotifyChannel`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

const registerGuildStreamChannel = async (msg, args) => {
    try {
        if (!msg.member.permission.has('manageChannels')) {
            return
        }

        let guild = msg.channel.guild
        let channel = resolver.channel(guild.channels, args[0])

        if (!channel) {
            bot.bot.createMessage(msg.channel.id, `Sorry I couldn't find that channel in this server!`)
            return
        }

        //Add the guild and channel to a collection
        let client = await MongoClient.connect(url)
        let col = client.db('model_tower').collection('guild_announcers')

        let checkForGuild = await col.findOne({_id:guild.id})

        if(!checkForGuild) {
            let register = await col.insertOne({_id:guild.id, stream:channel.id})
            if (register.insertedCount == 1)
                bot.bot.createMessage(msg.channel.id, f(`%s is now set as this server's Stream notification channel.`, channel.mention))
            else
                bot.bot.createMessage(msg.channel.id, f(`There was an error setting %s as this server'sStream notification channel.`, channel.mention))
        } else if (checkForGuild.stream == undefined) {
            let register = await col.updateOne({_id:guild.id}, {$set: {stream:channel.id}})
            if (register.modifiedCount == 1)
                bot.bot.createMessage(msg.channel.id, f(`%s is now set as this server's Stream notification channel.`, channel.mention))
            else
                bot.bot.createMessage(msg.channel.id, f(`There was an error setting %s as this server's Stream notification channel.`, channel.mention))
        } else {
            let existingChannel = await resolver.channel(guild.channels, checkForGuild.stream)
            bot.bot.createMessage(msg.channel.id, f(`%s is already configured as this server's Stream notification channel.`, existingChannel.mention))
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: registerGuildStreamChannel`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

const unregisterGuildAnnouncementChannel = async (msg, args) => {
    try {
        if (!msg.member.permission.has('manageChannels')) {
            return
        }

        let guild = msg.channel.guild

        let client = await MongoClient.connect(url)
        let col = client.db('model_tower').collection('guild_announcers')
        let mailboxes = client.db('model_tower').collection('mailboxes')

        let removeChannel = await col.findOneAndUpdate({_id:guild.id}, {$set: {announcements:undefined}})
        if(removeChannel.ok == 1) {
            let removeSubscriptions = await mailboxes.updateMany({subscriptions:removeChannel.value.announcements}, {$pull: {subscriptions:removeChannel.value.announcements}})
            bot.bot.createMessage(msg.channel.id, f(`This server's announcement channel is no longer set.`))
        } else {
            bot.bot.createMessage(msg.channel.id, f(`There was no announcement channel to remove.`))
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: unregisterGuildAnnouncementChannel`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

const unregisterGuildSpotifyChannel = async (msg, args) => {
    try {
        if (!msg.member.permission.has('manageChannels')) {
            return
        }

        let guild = msg.channel.guild

        let client = await MongoClient.connect(url)
        let col = client.db('model_tower').collection('guild_announcers')

        let removeChannel = await col.updateOne({_id:guild.id}, {$set: {spotify:undefined}})
        if(removeChannel.modifiedCount == 1) {
            bot.bot.createMessage(msg.channel.id, f(`This server's Spotify New Music channel is no longer set.`))
        } else {
            bot.bot.createMessage(msg.channel.id, f(`There was no Spotify New Music channel to remove.`))
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: unregisterGuildSpotifyChannel`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}

const unregisterGuildStreamChannel = async (msg, args) => {
    try {
        if (!msg.member.permission.has('manageChannels')) {
            return
        }

        let guild = msg.channel.guild

        let client = await MongoClient.connect(url)
        let col = client.db('model_tower').collection('guild_announcers')


        let removeChannel = await col.updateOne({_id:guild.id}, {$set: {stream:undefined}})
        if(removeChannel.modifiedCount == 1) {
            bot.bot.createMessage(msg.channel.id, f(`This server's Stream notification channel is no longer set.`))
        } else {
            bot.bot.createMessage(msg.channel.id, f(`There was no Stream notification channel to remove.`))
        }
    } catch (err) {
        bot.bot.createMessage(config.logChannelID ,f(`%s, error: %s in: subscribeToGuildAnnouncementChannel`, new Date(), err.message))
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, a fuse blew somewhere if this message persists please report it in <#447153276786311180>`, msg.author.username))
    }
}
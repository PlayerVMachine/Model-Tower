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

        if (args[0] == 'ann') {
            registerGuildAnnouncementChannel(msg, restOfArgs)
        } else if (args[0] == 'spotify') {
            registerGuildSpotifyChannel(msg, restOfArgs)
        } else if (args[0] == 'stream') {
            registerGuildStreamChannel(msg, restOfArgs)
        }

    } else if (args[0] == 'unset') {
        let restOfArgs = args.slice(2)

        if (args[0] == 'ann') {
            unregisterGuildAnnouncementChannel(msg, restOfArgs)
        } else if (args[0] == 'spotify') {
            unregisterGuildSpotifyChannel(msg, restOfArgs)
        } else if (args[0] == 'stream') {
            unregisterGuildStreamChannel(msg, restOfArgs)
        }

    }
}

const = registerGuildAnnouncementChannel = async (msg, args) => {
    if (!msg.member.permission.has('manageChannels')) {
        return
    }

    let guild = msg.channel.guild
    let channel = resolver.channel(guild.channels, args[0])

    if (!channel) {
        bot.bot.createMessage(msg.channel.id, `Sorry I couldn't find that channel in this server!`)
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
}

const = registerGuildSpotifyChannel = async (msg, args) => {
    if (!msg.member.permission.has('manageChannels')) {
        return
    }

    let guild = msg.channel.guild
    let channel = resolver.channel(guild.channels, args[0])

    if (!channel) {
        bot.bot.createMessage(msg.channel.id, `Sorry I couldn't find that channel in this server!`)
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
}

const = registerGuildStreamChannel = async (msg, args) => {
    if (!msg.member.permission.has('manageChannels')) {
        return
    }

    let guild = msg.channel.guild
    let channel = resolver.channel(guild.channels, args[0])

    if (!channel) {
        bot.bot.createMessage(msg.channel.id, `Sorry I couldn't find that channel in this server!`)
    }

    //Add the guild and channel to a collection
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('guild_announcers')

    let checkForGuild = await col.findOne({_id:guild.id, stream:channel.id})

    if(!checkForGuild) {
        let register = await col.insertOne({_id:guild.id, stream:stream.id})
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
}

const = unregisterGuildAnnouncementChannel = async (msg, args) => {
    if (!msg.member.permission.has('manageChannels')) {
        return
    }

    let guild = msg.channel.guild
    let channel = resolver.channel(guild.channels, args[0])

    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('guild_announcers')

    if (!channel) {
        bot.bot.createMessage(msg.channel.id, `Sorry I couldn't find that channel in this server!`)
    }

    let removeChannel = await col.updateOne({_id:guild.id}, {$set: {announcements:undefined}})
    if(removeChannel.modifiedCount == 1) {
        bot.bot.createMessage(msg.channel.id, f(`%s is no longer configured as this server's announcement channel.`, channel.mention))
    } else {
        bot.bot.createMessage(msg.channel.id, f(`There was no announcement channel to remove.`))
    }
}

const = unregisterGuildSpotifyChannel = async (msg, args) => {
    if (!msg.member.permission.has('manageChannels')) {
        return
    }

    let guild = msg.channel.guild
    let channel = resolver.channel(guild.channels, args[0])

    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('guild_announcers')

    if (!channel) {
        bot.bot.createMessage(msg.channel.id, `Sorry I couldn't find that channel in this server!`)
    }

    let removeChannel = await col.updateOne({_id:guild.id}, {$set: {spotify:undefined}})
    if(removeChannel.modifiedCount == 1) {
        bot.bot.createMessage(msg.channel.id, f(`%s is no longer configured as this server's Spotify New Music channel.`, channel.mention))
    } else {
        bot.bot.createMessage(msg.channel.id, f(`There was no Spotify New Music channel to remove.`))
    }
}

const = unregisterGuildStreamChannel = async (msg, args) => {
    if (!msg.member.permission.has('manageChannels')) {
        return
    }

    let guild = msg.channel.guild
    let channel = resolver.channel(guild.channels, args[0])

    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('guild_announcers')

    if (!channel) {
        bot.bot.createMessage(msg.channel.id, `Sorry I couldn't find that channel in this server!`)
    }

    let removeChannel = await col.updateOne({_id:guild.id}, {$set: {stream:undefined}})
    if(removeChannel.modifiedCount == 1) {
        bot.bot.createMessage(msg.channel.id, f(`%s is no longer configured as this server's Stream notification channel.`, channel.mention))
    } else {
        bot.bot.createMessage(msg.channel.id, f(`There was no Stream notification channel to remove.`))
    }
}
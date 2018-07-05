//Module imports
const MongoClient = require('mongodb').MongoClient
const f = require('util').format
const bodyParser = require('body-parser')
const request = require('superagent')

//project files required
const config = require('../config.json')
const bot = require('../core.js')

// mongodb login
const url = 'mongodb://127.0.0.1:36505'

//spotify token
let data = config.spotifyID + ':' + config.spotifySecret
let buff = new Buffer.from(data)
const base64data = buff.toString('base64')

exports.commandHandler = (msg, args) => {
    let restOfArgs = args.slice(1)

    if (['playlists', 'plists', 'pl'].includes(args[0])) {
        getPlaylists(msg, restOfArgs)
    } else if (['album', 'adetail'].includes(args[0])) {
        albumDetail(msg, restOfArgs)
    } else if (['tenList', 'new', 'releases'].includes(args[0])) {
        tenList(msg, restOfArgs)
    } else if (['search', 'lookup', 'lu', 's'].includes(args[0])) {
        search(msg, restOfArgs)
    } else if (['sub'].includes(args[0])) {
        userSubscribeToWeeklyUpdate(msg, restOfArgs)
    } else if (['unsub'].includes(args[0])) {
        userUnsubscribeFromWeeklyUpdate(msg, restOfArgs)
    }
}

const getAlbum = async (position) => {
    try {
        let client = await MongoClient.connect(url)
        const spotifyCol = client.db('spotify').collection('NewReleases')

        let album = await spotifyCol.findOne({position:position})
        return album
    } catch (err) {
        return err
    }
}

exports.getReleases = async () => {
    try {
        let client = await MongoClient.connect(url)
        const spotifyCol = client.db('spotify').collection('NewReleases')

        let prepare = await spotifyCol.drop() //throw out the top releases list in prep for the new one

        let response = await request.post('https://accounts.spotify.com/api/token')
        .send({grant_type:'client_credentials'})
        .set('Authorization', 'Basic ' + base64data)
        .type('application/x-www-form-urlencoded')

        let data = JSON.parse(response.text)
        let token = 'Bearer ' + data.access_token

        let position = 1
        for (i = 0; i < 2; i++) {
            let getResponse = await request.get('https://api.spotify.com/v1/browse/new-releases?limit=50&offset=' + 50*i)
            .set('Authorization', token)

            let top50newReleasesRAW = JSON.parse(getResponse.text)
            let info = top50newReleasesRAW.albums

            let albums = []
            for (album in info.items) {
                let record = {
                    position: position,
                    name: info.items[album].name,
                    artist: info.items[album].artists[0].name,
                    artist_url: info.items[album].artists[0].external_urls.spotify,
                    album_url: info.items[album].external_urls.spotify,
                    image_url_300: info.items[album].images[1].url,
                    release_date: info.items[album].release_date
                }
                albums.push(record)
                position += 1
            }

            let pushAlbums = await spotifyCol.insertMany(albums)
            if (pushAlbums.insertedCount !== albums.length)
                console.log('Not all albums were pushed: ' + pushAlbums.insertedCount)
            else
                console.log('50 albums pushed to db')
        }
        postTop10ToChannels()
        postTop10ToUsers()
    } catch (e) {
        console.log(e)
    }
}

const getPlaylists = async (msg, args) => {
    try {
        let response = await request.post('https://accounts.spotify.com/api/token')
        .send({grant_type:'client_credentials'})
        .set('Authorization', 'Basic ' + base64data)
        .type('application/x-www-form-urlencoded')

        let data = JSON.parse(response.text)
        let token = 'Bearer ' + data.access_token

        let getResponse = await request.get('https://api.spotify.com/v1/browse/featured-playlists?limit=5')
        .set('Authorization', token)

        let featuredPlayslistsRAW = JSON.parse(getResponse.text)
        let info = featuredPlayslistsRAW.playlists.items
        let spotifyMessage = featuredPlayslistsRAW.message

        let list = [`Use this command again with a playlist number To get a playlist embed`]
        for (i in info) {
            index = parseInt(i) + 1
            list.push(f(`%s. **%s**\n[%s Tracks](%s)`, index, info[i].name, info[i].tracks.total, info[i].external_urls.spotify))
        }

        if (args.length === 0) {
            let embed = {
                embed : {
                    author: {name: spotifyMessage,  icon_url: 'https://beta.developer.spotify.com/assets/branding-guidelines/icon4@2x.png'},
                    description: list.join('\n'),
                    color: parseInt('0x1DB954', 16),
                    footer: {text:'Part of the Broadcast Tower Integration Network'}
                }
            }

            bot.bot.createMessage(msg.channel.id, embed)
        } else if (parseInt(args[0]) >= 1 || parseInt(args[0]) <= 5){
            bot.bot.createMessage(msg.channel.id, info[parseInt(args[0]) - 1].external_urls.spotify)
        }

    } catch (e) {
        console.log(e)
    }
}

const albumDetail = async (msg, args) => {
    try {
        let position = 1

        if (args.length > 0) {
            let num = parseInt(args[0])
            if (num < 1 || num > 100) {
                bot.bot.createMessage(msg.channel.id, f('%s, woah out of range buddy, number must be from 1 - 100'), msg.author.username)
                return
            }

            position = num
        }

        let album = await getAlbum(position)

        let embed = {
            embed: {
                author: {name: 'Spotify New Release #' + position, icon_url: 'https://beta.developer.spotify.com/assets/branding-guidelines/icon4@2x.png' },
                color: parseInt('0x1DB954', 16),
                image: {url:album.image_url_300, height:300, width:300},
                description: f('Artist: **%s** | Album: [%s](%s)\nRelease date: %s\n[Artist page](%s)', album.artist, album.name, album.album_url, album.release_date, album.artist_url),
                footer: {text:'Part of the Broadcast Tower Integration Network'}
            }
        }

        bot.bot.createMessage(msg.channel.id, embed)

    } catch (err) {
        console.log(err)
    }
}

const tenList = async (msg, args) => {
    let client = await MongoClient.connect(url)
    const spotifyCol = client.db('spotify').collection('NewReleases')

    //get the album from the database
    let offset = args[0] ? (parseInt(args[0]) > 0 && parseInt(args[0]) < 11) ? (parseInt(args[0]) - 1) * 10 : 0 : 0
    let albums = await spotifyCol.find({ $and: [ {position:{$gte:offset}} , {position:{$lte:offset + 10}} ] }).toArray()

    let fields = []
    for (i = 0; i < albums.length; i++)
        fields.push({name: albums[i].position, value:f('Artist: **%s** | Album: [%s](%s)', albums[i].artist, albums[i].name.split('(')[0], albums[i].album_url), inline: false})

    let embed = {
        embed: {
            author: {name: 'Spotify New Releases', icon_url: 'https://beta.developer.spotify.com/assets/branding-guidelines/icon4@2x.png' },
            color: parseInt('0x1DB954', 16),
            fields: fields,
            footer: {text:'Part of the Broadcast Tower Integration Network'}
        }
    }

    bot.bot.createMessage(msg.channel.id, embed)
}

const search = async (msg, args) => {
    if (args.length == 0) {
        return
    }

    let query = args.join('%20')

    let response = await request.post('https://accounts.spotify.com/api/token')
        .send({grant_type:'client_credentials'})
        .set('Authorization', 'Basic ' + base64data)
        .type('application/x-www-form-urlencoded')

    let data = JSON.parse(response.text)
    let token = 'Bearer ' + data.access_token

    console.log(f('https://api.spotify.com/v1/search?q=%s', query))

    let getResponse = await request.get(f('https://api.spotify.com/v1/search?q=%s&type=track&limit=5', query))
    .set('Authorization', token)

    let results = JSON.parse(getResponse.text)

    let fields = []
    let count = 1

    results.tracks.items.forEach(track => {
        let album = f('[%s](%s)', track.album.name, track.album.external_urls.spotify)
        let artists = []
        track.artists.forEach(artist => {
            artists.push(f('[%s](%s)', artist.name, artist.external_urls.spotify))
        })

        fields.push({
            name: f('%s. %s', count, track.name),
            value: f('Listen [here](%s) Artist(s): %s Album: %s', track.external_urls.spotify, artists.join(', '), album),
            inline: false
        })
        count ++
    })

    let embed = {
        embed: {
            author: {name: 'Spotify Track Search Results', icon_url: 'https://beta.developer.spotify.com/assets/branding-guidelines/icon4@2x.png' },
            color: parseInt('0x1DB954', 16),
            fields: fields,
            footer: {text:'Like the bot? Consider buying me a coffee'}
        }
    }

    bot.bot.createMessage(msg.channel.id, embed)
}

const postTop10ToChannels = async () => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('guild_announcers')
    const spotifyCol = client.db('spotify').collection('NewReleases')

    let guild_announcers = await col.find().toArray()
    let albums = await spotifyCol.find({ $and: [ {position:{$gte:0}} , {position:{$lte:10}} ] }).toArray()

    let fields = []
    for (i = 0; i < albums.length; i++) {
        fields.push({name: albums[i].position, value:f('Artist: **%s** | Album: [%s](%s)', albums[i].artist, albums[i].name.split('(')[0], albums[i].album_url), inline: false})

        let embed = {
            embed: {
                author: {name: 'Spotify New Releases', icon_url: 'https://beta.developer.spotify.com/assets/branding-guidelines/icon4@2x.png' },
                color: parseInt('0x1DB954', 16),
                fields: fields,
                footer: {text:'Part of the Broadcast Tower Integration Network'}
            }
        }
    }

    guild_announcers.forEach(ga => {
        if (ga.spotify) {
            bot.bot.createMessage(ga.spotify, embed)
        }
    })
}

const postTop10ToUsers = async () => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('guild_announcers')
    const spotifyCol = client.db('spotify').collection('NewReleases')

    //get top 10
    let albums = await spotifyCol.find({ $and: [ {position:{$gte:0}} , {position:{$lte:10}} ] }).toArray()
    let description = []
    for (i = 0; i < albums.length; i++) {
        description.push(f('%s. Artist: **%s** | Album: [%s](%s)', albums[i].position, albums[i].artist, albums[i].name.split('(')[0], albums[i].album_url))
    }

    //create message
    let message = {
        source: `Spotify New Releases`,
        content: description.join('\n'),
        sent: new Date()
    }

    //put in all mailboxes where spotify is true
    let sent = await col.updateMany({spotify:true}, {$addToSet: {news:message}})
    if (sent.result.ok != 1) {
        console.log(sent)
    }
}


const userSubscribeToWeeklyUpdate = async (msg, args) => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('mailboxes')

    let update = col.updateOne({_id:msg.author.id}, {$set: {spotify:true}})
    if (update.result.ok != 1) {
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, there was an error subscribing to Spotify updates. Please try again later.`, msg.author.username))
        return
    }

    bot.bot.createMessage(msg.channel.id, f(`%s, you are now subscribed to Spotify weekly updates. You'll find them in your mailbox every Friday.`, msg.author.username))
}

const userUnsubscribeFromWeeklyUpdate = async (msg, args) => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('mailboxes')

    let update = col.updateOne({_id:msg.author.id}, {$set: {spotify:false}})
    if (update.result.ok != 1) {
        bot.bot.createMessage(msg.channel.id, f(`Sorry %s, there was an error unsubscribing from Spotify updates. Please try again later.`, msg.author.username))
        return
    }

    bot.bot.createMessage(msg.channel.id, f(`%s, you are now unsubscribed from Spotify weekly updates.`, msg.author.username))
}
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

exports.commandList = {
    splists: `getPlaylists`,
    spalbum: `albumDetail`,
    sptop: `tenList`
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

    } catch (e) {
        console.log(e)
    }
}

exports.getPlaylists = async (msg, args) => {
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

        let list = [`\`m.splists <playlist #>\` To get a playlist embed`]
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

exports.albumDetail = async (msg, args) => {
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

exports.tenList = async (msg, args) => {
    let client = await MongoClient.connect(url)
    const spotifyCol = client.db('spotify').collection('NewReleases')

    if (args.length > 0) {
        num = parseInt(args[0])

        if (num < 1 || num > 10) {
            bot.bot.createMessage(msg.channel.id, f('%s, woah out of range buddy, number must be from 1 - 10'), msg.author.username)
            return
        }
    } else {
        num = 1
    }

    let offset = 10 * (num - 1)

    //get the album from the database
    spotifyCol.find({ $and: [ {position:{$gte:offset}} , {position:{$lte:offset + 10}} ] }).toArray((err, albums) => {
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
    })
}
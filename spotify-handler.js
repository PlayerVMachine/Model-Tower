const MongoClient = require('mongodb').MongoClient
const f = require('util').format
const bodyParser = require('body-parser')
const request = require('superagent')
const moment = require('moment-timezone')

// project files required
const config = require('./config.json')
const reply = require('./proto_messages.json')

// mongodb login
const user = encodeURIComponent(config.user)
const password = encodeURIComponent(config.pass)
const authMechanism = 'DEFAULT'
const url = f('mongodb://%s:%s@127.0.0.1:36505/broadcast_tower?authMechanism=%s', user, password, authMechanism)

const timeFormat = new RegExp(/^[0-2][0-9]:[0-6][0-9]\b/)

exports.getReleases = async () => {
	let data = config.spotifyID + ':' + config.spotifySecret;  
	let buff = new Buffer.from(data);  
	let base64data = buff.toString('base64');


	try {
		let client = await MongoClient.connect(url)
		const spotifyCol = client.db(config.db).collection('SpotifyNewReleases')

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
				console.log('50 albums pusehd to db')
		}

	} catch (e) {
		console.log(e)
	}
}


exports.getPlaylists = async (msg, args, bot) => {
	let data = config.spotifyID + ':' + config.spotifySecret;  
	let buff = new Buffer.from(data);  
	let base64data = buff.toString('base64');

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

		let list = [`\`b.spotify -p <playlist #>\` To get a playlist embed`]
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

			bot.createMessage(msg.channel.id, embed)
		} else if (parseInt(args[0]) >= 1 || parseInt(args[0]) <= 5){
			bot.createMessage(msg.channel.id, info[parseInt(args[0]) - 1].external_urls.spotify)
		}

	} catch (e) {
		console.log(e)
	}
}


const getAlbum = async (position) => {
	try {
		let client = await MongoClient.connect(url)
		const spotifyCol = client.db(config.db).collection('SpotifyNewReleases')

		let album = await spotifyCol.findOne({position:position})
		return album
	} catch (err) {
		return err
	}
}

exports.albumDetail = async (msg, args, bot) => {
	try {

		let position = 1

		if (args.length > 0) {
			let num = parseInt(args[0])

			if (num < 1 || num > 100) {
				bot.createMessage(msg.channel.id, f('%s, woah out of range buddy, number must be from 1 - 100'), msg.author.username)
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

		bot.createMessage(msg.channel.id, embed)

	} catch (err) {
		console.log(err)
	}
}

exports.tenList = async (msg, args, bot) => {
	let client = await MongoClient.connect(url)
	const spotifyCol = client.db(config.db).collection('SpotifyNewReleases')
	let offset = 0

	if (args.length > 0) {
		let num = parseInt(args[0])

		if (num < 1 || num > 10) {
			bot.createMessage(msg.channel.id, f('%s, woah out of range buddy, number must be from 1 - 10'), msg.author.username)
			return
		}

		offset = 10 * (num - 1)
	} 

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

		bot.createMessage(msg.channel.id, embed)
	})
}

exports.weeklyNotif = async (msg, args, bot, client) => {
	try {
    const remCol = client.db(config.db).collection('Reminders')
    const userCol = client.db(config.db).collection('Users')

    let usee = await userCol.findOne({user: msg.author.id})

    if (usee.tz === null) {
      bot.createMessage(msg.channel.id, f(reply.sSub.noTZ, msg.author.username))
      return
    }

    if (!timeFormat.test(args[0])) {
      bot.createMessage(msg.channel.id, f(reply.sSub.wrongTime, msg.author.username))
      return
    }

    let now = new Date()
    let date = now.toISOString().slice(0,11)
    let postTime = new Date([date, args[0]].join('') + ':00Z')
    // now post time is today's date plus the time the user wants to be notified at
    // next we get the user's timezone offset
    let offset = moment.tz.zone(usee.tz).utcOffset(postTime)
    //we make a new date object that's in UTC thanks to the correction
    let scheduledTime = new Date(Date.parse(postTime) + offset*60*1000)

    //enusre it will be scheduled for the next friday
    if (Date.parse(scheduledTime) < Date.parse(now))
    	scheduledTime = new Date(Date.parse(scheduledTime) + 24*60*60*1000)

    let day = scheduledTime.getDay()

    if (day !== 5) {
    	let days = 6

    	if (day < 5)
    		days = 5 - day

    	scheduledTime = new Date(Date.parse(scheduledTime) + days*24*60*60*1000)
    }

    let spotifySub = {
      user: usee.user,
      sendTo: usee.sendTo,
      due: scheduledTime,
      type: 'spotify'
    }

    let addWeather = await remCol.replaceOne({$and: [{user: usee.user}, {type:'spotify'}]}, spotifySub, {upsert: true})
    if (addWeather.result.ok === 1)
      bot.createMessage(msg.channel.id, f('%s, successfully subcribed to weekly spotify updates!', msg.author.username))
    else
      bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))

  } catch (err) {
    console.log(err)
    bot.createMessage(config.logChannelID, err.message)
    bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
  }
}

exports.unNotif = async (msg, args, bot, client) => {
  try {
    const remCol = client.db(config.db).collection('Reminders')

    let remSpotify = await remCol.deleteOne({$and: [{user: msg.author.id}, {type:'spotify'}]})
    if (remSpotify.deletedCount === 1) 
      bot.createMessage(msg.channel.id, f('%s, successfully unsubcribed from weekly Spotify updates!', msg.author.username))
    else
      bot.createMessage(msg.channel.id, f('%s, you were not subcribed to weekly Spotify updates!', msg.author.username))

  } catch (err) {
    console.log(err)
    bot.createMessage(config.logChannelID, err.message)
    bot.createMessage(msg.channel.id, f(reply.generic.error, msg.author.username))
  }
}
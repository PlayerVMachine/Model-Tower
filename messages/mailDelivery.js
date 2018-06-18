//Module imports
const MongoClient = require('mongodb').MongoClient
const f = require('util').format

//project files required
const config = require('../config.json')
const bot = require('../core.js')

// mongodb login
const url = 'mongodb://127.0.0.1:36505'

/*
* var message = {
*   source: {type:'user' || 'channel', id: id}
*   destination: {type:'user' || 'channel', id: id}
*   content: string
*   sent: Date()
* }
*/

//Check if input is a user or channel known to the bot
const isValidID = (msg) => {
    let sliceOn = msg.indexOf(' ') + 1
    let check = msg.slice(sliceOn)
    let checkID = check

    if(check.indexOf('@') == 0 || check.indexOf'#' == 0)
        checkID = check.slice(1)

    if (msg.channel.guild.members.find(m => m.username == check)) { //find by username
        let user = msg.channel.guild.members.find(m => m.username == check);
        return user.id
    } else if (msg.channel.guild.members.find(m => m.id == checkID)) { //find by user id
        let user = msg.channel.guild.members.find(m => m.id == checkID);
        return user.id
    } else if (msg.channel.guild.members.find(m => m.nick == check)) { //find by nickname
        let member = msg.channel.guild.members.find(m => m.nick == check);
        return member.id
    } else if (msg.channel.guild.members.find(m => m.username.startsWith(check))) { //find by partial username
        let member = msg.channel.guild.members.find(m => m.id == checkID);
        return member.id
    } else if (msg.channel.guild.channels.find(m => m.name == check)) { //find by channel name

    } else if (msg.channel.guild.channels.find(m => m.id == checkID)) { //find by channel id

    }
}

//Register mailbox for a user if it does not exist
const registerMailbox = async (userid) => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('mailboxes')

    let mailbox = {
        _id: userid,
        news: []
    }

    let findUser = await col.findOne({_id:userid})
    if(!findUser) {
        let register = await col.insertOne(mailbox)
        if (register.insertedCount == 1)
            return true
        else
            return false

    } else {
        return true
    }
}

//Send a message to a mailbox
const deliverMail = async (src, dest, content) => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('mailboxes')

    let message = {
        source: src,
        destination: dest,
        content:content,
        sent: Date()
    }

    let validateDest = await registerMailbox(dest)

    if (validateDest) {
        let sent = await col.updateOne({_id:dest}, {$addToSet: {news:message}})
        if (sent.result.ok != 1)
            console.log(f(`Could not deliver message from %s to %s`, src, dest))
    } else {
        console.log(f(`Could not deliver message from %s to %s`, src, dest))
    }
}

//Create user's mailing list, store user id, destintation id, and list of subscriptions
const createMailingList = async (userid) => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('mailingLists')

    let mailingList = {
        _id: userid,
        subscriptions: []
    }

    let findUser = await col.findOne({_id:userid})
    if(!findUser) {
        let register = await col.insertOne(mailingList)
        if (register.insertedCount == 1)
            return true
        else
            return false

    } else {
        return true
    }
}


//subscribe to a person or channel
exports.subscribe = async (msg, args) => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('mailingLists')

    //TO DO: validate source in message

    let validateList = await createMailingList(msg.author.id)

    if (validateList) {
        let subbed = await col.updateOne({_id:msg.author.id}, {$addToSet: {subscriptions:source}})
        if (subbed.result.ok != 1)
            console.log(f(`Could not subscribe to %s for %s`, source, msg.author.id))
    } else {
        console.log(f(`Could not subscribe to %s for %s`, source, msg.author.id))
    }
}
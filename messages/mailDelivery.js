//Module imports
const MongoClient = require('mongodb').MongoClient
const f = require('util').format

//project files required
const config = require('../config.json')
const bot = require('../core.js')
const resolver = require('./resolver.js')

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

//Register mailbox for a user if it does not exist
const registerMailbox = async (userid) => {
    let client = await MongoClient.connect(url)
    let col = client.db('model_tower').collection('mailboxes')

    let mailbox = {
        _id: userid,
        subscriptions: [],
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

//Subscribe to a user or channel
const addSubscription = async (user, subscription, context) => {
    let validateMailbox = await registerMailbox(user)

    if (validateMailbox) {
        if (subscription.type == 'user')
            let sub = resolver.user(context, subscription.val)
        else (subscription.type == 'channel')
            let sub = resolver.channel(context, subscription.val)

        if (!sub) {
            console.log(f(`Could not subscribe to %s for %s`, subscription, user))
            return
        }

        let client = await MongoClient.connect(url)
        let col = client.db('model_tower').collection('mailboxes')
        let subscribe = await col.updateOne({_id:user}, {$addToSet: {subscriptions:sub.id}})
        if (subscribe.result.ok != 1)
            console.log(f(`Could not deliver message from %s to %s`, src, dest))

    } else {
        console.log(f(`Could not subscribe to %s for %s`, subscription, user))
    }
}
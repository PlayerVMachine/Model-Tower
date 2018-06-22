const f = require('util').format
const destiny = require('node-destiny')

const config = require('../config.json')
const bot = require('../core.js')

const destinyClient = new destiny.DestinyClient(config.BUNGIE_KEY)

exports.test = async (msg, args) => {
    destinyClient.search('1', 'Carsten').then( response => {
        console.log(JSON.stringify(response, undefined, 2))
    });
}
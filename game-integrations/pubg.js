const f = require('util').format
const pubg = require('pubg.js');

const config = require('../config.json')
const bot = require('../core.js')

//add this call to functions later on to load guild configured region and support region as an argument
const client = new pubg.Client(config.PUBG_KEY, 'pc-na');

exports.test = async (msg, args) => {
    let player = await client.getPlayer({name:args[0]})
    console.log(JSON.stringify(player, undefined, 3))
}
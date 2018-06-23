const f = require('util').format
const ow = require('owapi')

exports.test = async (msg, args) => {
    let player = await ow.getModeStats(args[0], 'quickplay', 'pc')
    console.dir(player, {depth : 2, colors : true})
}
const f = require('util').format
const ow = require('owapi')

exports.test = async (msg, args) => {
    let player = await ow.getGeneralStats(args[0], 'pc')
    console.dir(player, {depth : 2, colors : true})
}
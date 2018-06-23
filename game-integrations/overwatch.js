const f = require('util').format
const ow = require('overwatch-js')

exports.test = async (msg, args) => {
    let player = await ow.getOverall('pc', 'na', args[0])
    console.dir(player, {depth : 2, colors : true})
}
const f = require('util').format
const Fortnite = require('fortnite-api')

const config = require('../config.json')
const bot = require('../core.js')

const fnite = new Fortnite([
    config.FORTNITE_EA,
    config.FORTNITE_PWD,
    config.FORTNITE_CLT,
    config.FORTNITE_CT
    ])

exports.test = async (msg, args) => {
    console.log(args[0])
    fnite.checkPlayer(args[0], 'pc')
    .then(stats => {
        console.log(stats)
    })
    .catch(err => {
        console.log(err)
    })
}
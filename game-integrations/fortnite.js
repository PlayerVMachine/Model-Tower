 const Fortnite = require('fortnite-api')

 const config = require('../config.json')

 const fnite = new Fortnite([
    config.FORTNITE_EA,
    config.FORTNITE_PWD,
    config.FORTNITE_CLT,
    config.FORTNITE_CT
    ])

exports.test = async (msg, args) => {
    fnite.checkPlayer(args[0], 'pc')
    .then(stats => {
        console.log(stats)
    })
    .catch(err => {
        console.log(err)
    })
}
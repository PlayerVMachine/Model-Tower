const moment = require('moment-timezone')

//moment.tz.setDefault('America/Toronto')
console.log(new Date())//let date = moment.tz('2018-05-23T19:46:00Z', 'Atlantic/Reykjavik')


let date = new Date('2018-05-23T19:46:00Z')
console.log(date)
let offset = moment.tz.zone('America/Toronto').utcOffset(date)

let newDate = new Date(Date.parse('2018-05-23T19:46:00Z') + offset*60*1000)
console.log(newDate)

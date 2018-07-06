
const credentials = {
    client: {
        id: config.BLIZ_ID,
        secret: config.BLIZ_SECRET
    }
}


const oauth2 = require('simple-oauth2').create(credentials)


const config = require('../config.json')
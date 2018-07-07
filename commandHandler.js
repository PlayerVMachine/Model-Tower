const Memcached = require('memcached')
const memcached = new Memcached('127.0.0.1:11222')

exports.cooldown = async (commandName, cdTime, cdMessage) => {
    let cdSet = await memcached.get(commandName)

    if (!cdSet) {
        memcached.set(commandName, new Set(),
    }

}
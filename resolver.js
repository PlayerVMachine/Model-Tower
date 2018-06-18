//Excape regular expression characters
const regEscape = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Resolve user and nicknames
exports.user = (context, user) => {

    // Is user a metion?
    const exact = '<@!?([0-9]+)>$'
    const partial = '<@!?([0-9]+)>'
    let mentionId = new RegExp(exact, 'g').exec(user)
    if (mentionId === null) {
        mentionId = new RegExp(partial, 'g').exec(user)
    }
    if (mentionId && mentionId.length > 1) {
        return context.find(u => u.id === mentionId[1])
    }

    // Is user in username#1337 format?
    if (user.indexOf('#') > -1) {
        const [name, discrim] = user.split('#')
        const nameDiscrimSearch = context.find(u => u.username === name && u.discriminator === discrim)
        if (nameDiscrimSearch) {
            return nameDiscrimSearch
        }
    }

    // Is user an id?
    if (user.match(/^([0-9]+)$/)) {
        const userIdSearch = context.find(u => u.id === user);
        if (userIdSearch) {
            return userIdSearch;
        }
    }

    // Is user the exact username?
    const exactNameSearch = context.find(u => u.username === user);
    if (exactNameSearch) {
        return exactNameSearch;
    }

    const escapedUser = regEscape(user);
    // username match
    const userNameSearch = context.find(u => u.username.match(new RegExp(`^${escapedUser}.*`, 'i')) != undefined)
    if (userNameSearch) {
        return userNameSearch
    }

    // Is user an exact nickname?
    const exactNickSearch = context.find(u => u.nick === user);
    if (exactNickSearch) {
        return exactNickSearch;
    }

    // nickname match
    const nickNameSearch = context.find(u => u.nick ? u.nick.match(new RegExp(`^${escapedUser}.*`, 'i')) != undefined : null)
    if (nickNameSearch) {
        return nickNameSearch
    }

    return null
}

// Resolve channel
exports.channel = (context, channel) => {
    // Is channel a metion?
    const exact = '<#!?([0-9]+)>$'
    const partial = '<#!?([0-9]+)>'
    let mentionId = new RegExp(exact, 'g').exec(channel)
    if (mentionId === null) {
        mentionId = new RegExp(partial, 'g').exec(channel)
    }
    if (mentionId && mentionId.length > 1) {
        return context.find(c => c.id === mentionId[1])
    }

    // Is channel an id?
    if (channel.match(/^([0-9]+)$/)) {
        const channelIdSearch = context.find(c => c.id === channel);
        if (channelIdSearch) {
            return channelIdSearch;
        }
    }

    // Is channel the exact username?
    const exactNameSearch = context.find(c => c.name === channel);
    if (exactNameSearch) {
        return exactNameSearch;
    }

    const escapedChannel = regEscape(channel);
    // channelname match
    const channelNameSearch = context.find(c => c.name.match(new RegExp(`^${escapedChannel}.*`, 'i')) != undefined)
    if (channelNameSearch) {
        return channelNameSearch
    }
}

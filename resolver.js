
//Resolve user but not nicknames
exports.user = (context, user) => {

    //Is user a metion?
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
    const exactNameSearch = users.find(u => u.username === user);
    if (exactNameSearch) {
        return exactNameSearch;
    }

    const escapedUser = utils.regEscape(user);
    // username match
    const userNameSearch = users.find(u => u.username.match(new RegExp(`^${escapedUser}.*`, 'i')) != undefined)
    if (userNameSearch) {
        return userNameSearch
    }

    return null
}

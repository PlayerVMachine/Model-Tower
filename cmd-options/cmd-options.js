//Command options go here

exports.create = {
    aliases: [`signup`, `register`],
    cooldown: 10000,
    description: `Create a station with the Tower to start broadcasting.`,
    fullDescription: `Create an account to use the bot`s features.`,
    usage: `\`b.create\``
}

exports.close = {
    aliases: [`delete`, `del`],
    cooldown: 10000,
    description: `Close up your station and take down your antenna`,
    fullDescription: `Close your account to stop using the bot`s features`,
    usage: `\`b.close\``
}

exports.follow = {
    aliases: [`fol`, `f`],
    argsRequired: true,
    cooldown: 2000,
    description: reply.follow.description,
    fullDescription: reply.follow.fullDescription,
    usage: reply.follow.usage
}

exports.unfollow = {
    aliases: [`unfol`, `uf`],
    argsRequired: true,
    cooldown: 2000,
    description: reply.unfollow.description,
    fullDescription: reply.unfollow.fullDescription,
    usage: reply.unfollow.usage
}

exports.block = {
    aliases: [`bl`],
    argsRequired: true,
    cooldown: 2000,

    description: reply.block.description,
    fullDescription: reply.block.fullDescription,
    usage: reply.block.usage
}

exports.unblock = {
    aliases: [`unb`],
    argsRequired:true,
    cooldown: 2000,
    description: reply.unblock.description,
    fullDescription: reply.unblock.fullDescription,
    usage:reply.unblock.usage
}

exports.post = {
    aliases: [`cast`, `send`],
    cooldown: 5000,
    description: reply.post.description,
    fullDescription: reply.post.fullDescription,
    usage: reply.post.usage
}

exports.reply = {
    cooldown: 5000,
    dmOnly: true,
    description: reply.reply.description,
    fullDescription: reply.reply.fullDescription,
    usage: reply.reply.usage
}

exports.threadLeave = {
    cooldown: 5000,
    dmOnly: true,
    description: reply.leave.description,
    fullDescription: reply.leave.fullDescription,
    usage: reply.leave.usage
}

exports.report = {
    cooldown: 5000,
    dmOnly: true,
    description: reply.report.description,
    fullDescription: reply.report.fullDescription,
    usage: reply.report.usage
}

exports.viewProfile = {
    aliases: [`profile`],
    cooldown: 5000,
    description: reply.view.description,
    fullDescription: reply.view.fullDescription,
    usage: reply.view.usage
}

exports.DMPurge = {
    aliases: [`cls`, `clear`],
    cooldown: 10000,
    dmOnly: true,
    description: reply.clearDMs.description,
    fullDescription: reply.clearDMs.fullDescription,
    usage: reply.clearDMs.usage
}

exports.help = {
    cooldown: 5000,
    description: reply.help.description,
    fullDescription: reply.help.fullDescription,
    usage: reply.help.usage
}


exports.replyHandler = async (bot, msg, question, doWork) => {
    let qMessage = await bot.createMessage(msg.channel.id, question)

    let menuTimeout = setTimeout(async () => {
        bot.removeListener('messageCreate', handleReply)
        qMessage.delete('Menu Timeout.')
        let timeoutmsg = await bot.createMessage(msg.channel.id, 'Menu timed out.')
        setTimeout(() => {
            timeoutmsg.delete('Menu Timeout.')
        }, 2000)
    }, 10000)

    const handleReply = async (reply) => {
        if (reply.author.id == msg.author.id) {
            clearTimeout(menuTimeout)
            bot.removeListener('messageCreate', handleReply)
            qMessage.delete('Menu close.') // delete first question
            doWork(reply)
        }
    }

    bot.on('messageCreate', handleReply)
}


exports.replyHandler = async (bot, msg, question, doWork) => {
    let qMessage = await bot.createMessage(msg.channel.id, question)

    let menuTimeout = setTimeout(() => {
        bot.removeListener('messageCreate', handleReply)
        qMessage.delete('Menu Timeout.')
        bot.createMessage(msg.channel.id, 'Menu timed out.')
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
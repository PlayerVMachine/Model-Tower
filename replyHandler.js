

exports.replyHandler = async (bot, msg, question, doWork) => {
    let qMessage = await bot.createMessage(msg.channel.id, question)

    const handleReply = async (reply) => {
        if (reply.author.id == msg.author.id) {
            bot.removeListener('messageCreate', handleReply)
            qMessage.delete('Menu close.') // delete first question
            doWork(reply)
        }
    }

    bot.on('messageCreate', replyHandler)
}
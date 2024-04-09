const publicKey = '45dc56f3e085146993094f22023a73d5', privateKey = 'e98d995af7d6e5d24594e70f1582d251';
const mailjet = require('node-mailjet').apiConnect(publicKey, privateKey);

exports.sendEmail = async (to, message) => {
    return await mailjet.post('send', {version: 'v3.1'}).request({
        Messages: [
            {
                From: {
                    Email: 'alitarek5120@gmail.com',
                    Name: 'Mini Trello'
                },
                To: to,
                Subject: message.subject,
                TextPart: message.textPart,
                HtmlPart: message.htmlPart
            }
        ]
    });
};
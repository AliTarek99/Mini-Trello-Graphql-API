const publicKey = '45dc56f3e085146993094f22023a73d5', privateKey = 'e98d995af7d6e5d24594e70f1582d251';
const mailjet = require('node-mailjet').apiConnect(publicKey, privateKey);
const jwt = require('jsonwebtoken');
const Users = require('../models/users');

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

exports.getJwtPyaload = async (req) => {
    if(req.Authorization) {
        let payload = jwt.decode(req.Authorization, process.env.JWT_PRIVATE_KEY);
        if(payload.userId)
            return payload;
        return undefined;
    }
    return undefined;
}

exports.getUser = async (req) => {
    let payload = getJwtPyaload(req);
    if(payload) {
        let user = await Users.findById(payload.userId);
        if(user) {
            return user;
        }
    }
    return undefined;
}
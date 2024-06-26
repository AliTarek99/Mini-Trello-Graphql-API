const publicKey = '45dc56f3e085146993094f22023a73d5', privateKey = 'e98d995af7d6e5d24594e70f1582d251';
const mailjet = require('node-mailjet').apiConnect(publicKey, privateKey);
const jwt = require('jsonwebtoken');
const Users = require('../models/users');
const groupMembers = require('../models/groupMembers');
const fs = require('fs');

exports.sendEmail = async (to, message) => {
    try {
        if (to.length) {
            return await mailjet.post('send', { version: 'v3.1' }).request({
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
        }
    } catch (err) {
        console.log(err);
    }
};

exports.getJwtPayload = (req) => {
    token = req.Authorization || req.get('Authorization');
    if (token) {
        let payload = jwt.decode(token, process.env.JWT_PRIVATE_KEY);
        if (payload.userId)
            return payload;
        return undefined;
    }
    return undefined;
}

exports.getUser = async (req, res, next) => {
    try {
        let payload = exports.getJwtPayload(req);
        if (payload) {
            let user = await Users.findById(payload.userId);
            if (user) {
                req.user = user;
                if (next)
                    return next();
                else return;
            }
        }
        let err = new Error('Unauthorized access!');
        err.set = true;
        throw err;
    } catch (err) {
        err.originalError = true;
        exports.errorhandler(err, req, res, next);
    }
}

exports.fileUpload = async (req, res, next) => {
    try {
        if (!req.user) {
            let err = new Error('Unauthorized access.');
            err.originalError = true;
            err.set = true;
            throw err;
        }
        if (!req.body.dest || !req.file) {
            let err = new Error('Missing data.');
            err.originalError = true;
            err.set = true;
            throw err;
        }
        
        if (req.body.dest == 'profile') {
            return res.status(201).json({ msg: 'Image uploaded.', url: `${req.protocol}://${req.get('host')}/profile/${req.file.path.replace(/\\/g, '/')}` });
        }
        else if (req.body.dest == 'group') {
            if (!req.body.groupId) {
                let err = new Error('Missing data.');
                err.originalError = true;
                err.set = true;
                throw err;
            }
            let member = await groupMembers.findOne({ user: req.user._id, group: req.body.groupId });
            if (!member) {
                let err = new Error('Unauthorized access.');
                err.originalError = true;
                err.set = true;
                throw err;
            }
            return res.status(201).json({ msg: 'Media uploaded.', url: `${req.protocol}://${req.get('host')}/groups/${req.file.path.replace(/\\/g, '/')}` });
        }
        let err = new Error('Invalid dest.');
        err.originalError = true;
        err.set = true;
        throw err;
    } catch (err) {
        if(req.file) {
            this.deleteFile(req.file.path);
        }
        next(err);
    }
}

exports.errorhandler = (err, req, res, next) => {
    if (!err.originalError) {
        return err;
    }
    if (err.set) {
        return res.status(400).json({ msg: err.message });
    }
    console.log(err);
    if (next) {
        return res.status(500).json({ msg: 'Something went wrong we are working on it.' });
    }
    return { msg: 'Something went wrong we are working on it.' }
}

exports.deleteFile = (path) => {
    try {
        fs.rm(path, err => {
            console.log(err);
        });
    } catch (err) {
        console.log(err);
    }
}
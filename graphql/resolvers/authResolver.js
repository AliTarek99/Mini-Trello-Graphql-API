const Users = require('../../models/users');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

exports.login = async ({ data }, req) => {
    let res = { errors: [], successful: true };
    if (!validator.isEmail(data.email) || !data.name) {
        res.errors.push('Invalid Credentials!');
        res.successful = false;
        return res;
    }
    let hashVal = await bcrypt.hash(data.password, 12);
    let user = await Users.findOne({ email: data.email, name: data.name, password: hashVal });
    if (!user) {
        res.errors.push('Invalid Credentials!');
        res.successful = false;
        return res;
    }
    delete user.password;
    delete user.friends;
    delete user.friendRequests;
    delete user.verficationToken;
    res.user = user;
    return res;
};


exports.signup = async ({ data }, req) => {
    let res = { errors: [], successful: true };
    if (!validator.isEmail(data.email) || !(await Users.findOne({ email: data.email }))) {
        res.errors.push('Invalid Email!');
        res.successful = false;
    }

    if (!data.name || !(await Users.findOne({ name: data.name }))) {
        res.errors.push('Username already exists!');
        res.successful = false;
    }

    if (!validator.isLength(validator.trim('password'), { max: 20, min: 5 })) {
        res.errors.push('Password must be between 5 and 20 characters!');
        res.successful = false;
    }

    if(data.phoneNumber && !validator.isMobilePhone(data.phoneNumber)) {
        res.errors.push('Invalid phoneNumber!');
        res.successful = false;
    }

    if (res.errors.length)
        return res;
    let user = new Users({
        email: data.email,
        name: data.email,
        verified: false,
        verificationExpiry: new Date(new Date() + 3600000),
        verficationToken: crypto.randomInt(100000, 999999).toString(),
        password: await bcrypt.hash(data.password, 12),
        friends: [],
        friendRequests: [],
        phoneNumber: data.phoneNumber
    });
    sendEmail({
        Email: data.email, 
        Name: data.name
    }, {
        subject: 'Verification Email.',
        textPart: `Your verification code is ${user.verficationToken}. It expires after 30 minutes.`,
        htmlPart: `<p>Your verification code is <b>${user.verficationToken}</b>. It expires after 30 minutes.</p>`
    });
    res.user = await user.save();
    return res;
};


exports.sendResetPasswordEmail = async ({ email }, req) => {

};


exports.resetPasswordCode = async ({ code }, req) => {

};


exports.resetPassword = async ({ code, password }, req) => {

};
const Users = require('../../models/users');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendEmail } = require("../../util/helper");
const jwt = require('jsonwebtoken');

exports.login = async ({ data }, req) => {
    let res = { errors: [], successful: true };
    if ((!data.email && !data.name) || (data.email && !validator.isEmail(data.email))) {
        res.errors.push('Invalid Credentials!');
        res.successful = false;
        return res;
    }
    try {
        let query;
        if (data.email) {
            query = { email: data.email };
        }
        else {
            query = { name: data.name };
        }
        var user = await Users.findOne(query, {
            friends: 0,
            friendRequests: 0,
            verficationToken: 0,
            passwordResetCode: 0,
            passwordResetExpiry: 0
        });
        if (!user || ! await bcrypt.compare(data.password, user.password) || (!user.verified && user.verificationExpiry < new Date())) {
            res.errors.push('Invalid Credentials!');
            res.successful = false;
            return res;
        }
        res.token = jwt.sign({ userId: user._id, verified: user.verified }, process.env.JWT_PRIVATE_KEY);
    } catch (err) {
        console.log(err);
        res.successful = false;
        res.errors.push('Server Error!');
        return res;
    }
    delete user.password;
    res.user = user;
    return res;
};


exports.signup = async ({ data }, req) => {
    let res = { errors: [], successful: true };
    let check = await Users.findOne({ email: data.email }, { email: 1, verified: 1, verificationExpiry: 1 });
    if (!validator.isEmail(data.email) || (check && (check.verified || check.verificationExpiry > new Date()))) {
        res.errors.push('Invalid Email!');
        res.successful = false;
    }

    check = await Users.findOne({ name: data.name }, { email: 1, verified: 1, verificationExpiry: 1 });
    if (!data.name || (check && (check.verified || check.verificationExpiry > new Date()))) {
        res.errors.push('Username already exists!');
        res.successful = false;
    }

    if (!data.password || !validator.isLength(validator.trim(data.password), { max: 20, min: 5 })) {
        res.errors.push('Password must be between 5 and 20 characters!');
        res.successful = false;
    }


    if (data.phoneNumber && !validator.isMobilePhone(data.phoneNumber)) {
        res.errors.push('Invalid phoneNumber!');
        res.successful = false;
    }

    if (res.errors.length)
        return res;
    let user = new Users({
        email: data.email,
        name: data.name,
        verified: false,
        verificationExpiry: new Date(new Date() + 3600000).getTime(),
        verficationToken: crypto.randomInt(100000, 999999).toString(),
        password: await bcrypt.hash(data.password, 12),
        friends: [],
        friendRequests: [],
        phoneNumber: data.phoneNumber
    });
    sendEmail([{
        Email: data.email,
        Name: data.name
    }], {
        subject: 'Verification Email.',
        textPart: `Your verification code is ${user.verficationToken}. It expires after 1 hour.`,
        htmlPart: `<p>Your verification code is <b>${user.verficationToken}</b>. It expires after 1 hour.</p>`
    });
    res.user = await user.save();

    res.token = jwt.sign({ userId: res.user._id, verified: res.user.verified }, process.env.JWT_PRIVATE_KEY);
    delete res.user.password;
    delete res.user.friends;
    delete res.user.friendRequests;
    delete res.user.verficationToken;
    delete res.user.verificationExpiry;
    return res;
};

exports.verifyUser = async ({ email, code }, req) => {
    let user = await Users.findOneAndUpdate({
        email: email,
        verficationToken: code,
        verificationExpiry: { $lt: new Date() }
    }, {
        verified: true,
        verficationToken: null,
        verificationExpiry: null
    }, { projection: { email: 1 }, new: true });
    if (user) return true;
    return false;
}

exports.sendResetPasswordEmail = async ({ email }, req) => {
    let user = await Users.findOne({ email: email });
    if (user) {
        user.passwordResetCode = crypto.randomInt(100000, 999999).toString();
        user.passwordResetExpiry = new Date(new Date() + 3600000).getTime();
        sendEmail([{
            Email: user.email,
            Name: user.name
        }], {
            subject: 'Password Reset.',
            textPart: `Your password reset code is ${user.passwordResetCode}.`,
            htmlPart: `<p>Your password reset code is <b>${user.passwordResetCode}</b>.</p>`
        });
        await user.save();
    }
    return 'If account exists you will receive an email with password reset code.';
};


exports.resetPasswordCode = async ({ email, code }, req) => {
    let user = await Users.findOne({
        email: email,
        passwordResetCode: code,
        passwordResetExpiry: { $lt: new Date() }
    }, { email: 1 });
    if (user) {
        return true;
    }
    return false;
};


exports.resetPassword = async ({ email, code, password }, req) => {
    let res = { errors: [], successful: true };
    let user = await Users.findOne({
        email: email,
        passwordResetCode: code,
        passwordResetExpiry: { $lt: new Date() }
    });
    if (user) {
        if (!validator.isLength(validator.trim(password), { max: 20, min: 5 })) {
            res.errors.push('Password must be between 5 and 20 characters!');
            res.successful = false;
            return res;
        }
        user.password = await bcrypt.hash(password, 12);
        user.passwordResetCode = crypto.randomInt(100000, 999999).toString();
        user.passwordResetExpiry = new Date(new Date() + 3600000).getTime();
        sendEmail([{
            Email: user.email,
            Name: user.name
        }], {
            subject: 'Password Reset.',
            textPart: `Your password reset code is ${user.passwordResetCode}.`,
            htmlPart: `<p>Your password reset code is <b>${user.passwordResetCode}</b>.</p>`
        });
        res.user = await user.save();
        delete res.user.password;
        delete res.user.friends;
        delete res.user.friendRequests;
        delete res.user.verficationToken;
        delete res.user.verificationExpiry;
        res.token = jwt.sign({ userId: res.user._id, verified: true }, process.env.JWT_PRIVATE_KEY);
    }
    else {
        res.errors.push('Invalid code or email!');
        res.successful = false;
    }
    return res;
};
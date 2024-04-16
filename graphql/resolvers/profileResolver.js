const Users = require('../../models/users');
const { getIO } = require('../../util/sockets');
const validator = require('validator');
const bcrypt = require('bcrypt');


exports.sendFriendRequest = async ({ name }, req) => {
    // if (req.user) {
    let user = await Users.findOne({ name: name }, { _id: 1, friends: 1, friendRequests: 1 });
    if (user && user.friendRequests.indexOf(req.user._id) == -1 && user.friends.indexOf(req.user._id) == -1) {
        if (req.user.friendRequests.indexOf(user._id) == -1) {
            user.friendRequests.push(req.user._id);
            await user.save();
            let sockets = getIO();
            if (sockets && sockets.userSocket[user._id.toString()]) {
                sockets.to(sockets.userSocket[user._id.toString()]).emit('friendRequest', { name: req.user.name, picture: req.user.picture });
            }
            return true;
        }
        else {
            return await this.manageFriendRequest({ name: user.name, accept: true }, req);
        }
    }
    // }
    return false;
}

exports.manageFriendRequest = async ({ name, accept }, req) => {
    // if (req.user) {
    let user = await Users.findOne({ name: name }, { _id: 1, friends: 1, friendRequests: 1 });
    let indxOfRequest = req.user.friendRequests.indexOf(user._id);
    if (user && indxOfRequest != -1) {
        if (accept) {
            req.user.friends.push(req.user.friendRequests[indxOfRequest]);
            req.user.friendRequests = req.user.friendRequests.filter((value, index) => index != indxOfRequest);
            user.friends.push(req.user._id);
            await req.user.save();
            user.save().then(user => {
                let sockets = getIO();
                if (sockets && sockets.userSocket[user._id.toString()]) {
                    sockets.to(sockets.userSocket[user._id.toString()]).emit('requestAccepted', { name: req.user.name, picture: req.user.picture });
                }
            });
            return true;
        }
        else if (accept == false) {
            req.user.friendRequests = req.user.friendRequests.filter((value, index) => index != indxOfRequest);
            await req.user.save();
            return true;
        }
    }
    // }
    return false;
}

exports.removeFriend = async ({ name }, req) => {
    // if (req.user) {
    let user = await Users.findOne({ name: name });
    let indxOfRequest = req.user.friends.indexOf(user._id);
    if (user && indxOfRequest != -1) {
        user.friends = user.friends.filter(value => value.toString() != req.user._id.toString());
        req.user.friends = req.user.friends.filter((value, index) => index != indxOfRequest);
        await req.user.save();
        user.save();
        return true;
    }
    // }
    return false;
}

exports.updateUserInfo = async ({ data }, req) => {
    let res = { errors: [], successful: true };
    // if (req.user) {
    let check = await Users.findOne({ name: data.name, _id: { $ne: req.user._id } }, { email: 1, verified: 1, verificationExpiry: 1 });
    if (data.name && (check && (check.verified || check.verificationExpiry > new Date()))) {
        res.errors.push('Name already used.');
        res.successful = false;
    }
    if (data.newPassword) {
        if (!validator.isLength(validator.trim(data.newPassword), { max: 20, min: 5 })) {
            res.errors.push('Password must be between 5 and 20 characters.');
            res.successful = false;
        }
        if (!(await bcrypt.compare(data.oldPassword, req.user.password))) {
            res.errors.push('Wrong old password.');
            res.successful = false;
        }
    }
    if (data.phoneNumber && !validator.isMobilePhone(data.phoneNumber)) {
        res.errors.push('Invalid phoneNumber!');
        res.successful = false;
    }

    if (!res.successful)
        return res;
    if (data.newPassword)
        data.newPassword = await bcrypt.hash(data.newPassword, 12);

    req.user.name = data.name || req.user.name;
    req.user.password = data.newPassword || req.user.password;
    req.user.phoneNumber = data.phoneNumber || req.user.phoneNumber;
    req.user.picture = data.picture || req.user.picture;
    await req.user.save();
    return res;
    // }
    // else {
    //     res.errors.push('Unauthorized access.');
    //     res.successful = false;
    // }
}


exports.searchUsers = async ({ name }, req) => {
    // if (req.user) {
    let result = await Users.find({
        name: {
            $regex: `^${name}.*`,
            $options: 'i'
        }
    }, {
        name: 1,
        picture: 1,
        friendRequests: 1,
        friends: 1
    }).populate('friends', 'name picture');

    result = result.map(async value => {
        return {
            name: value.name,
            picture: value.picture,
            friends: value.friends,
            sentRequest: (value.friendRequests.indexOf(req.user._id) != -1),
            inFriendRequests: (req.user.friendRequests.indexOf(value._id) != -1),
            inFriendsList: Boolean(value.friends.find(v => v._id.toString() == req.user._id.toString()))
        }
    });
    return result;
    // }
    // return null;
}


exports.getUserProfile = async ({ name }, req) => {
    // if (req.user) {
    let res = await Users.findOne({ name: name }, { name: 1, picture: 1, friends: 1, friendRequests: 1 }).populate('friends');
    if(!res) {
        return null;
    }
    res.sentRequest = (res.friendRequests.indexOf(req.user._id) != -1);
    res.inFriendRequests = (req.user.friendRequests.indexOf(res._id) != -1);
    res.inFriendsList =  Boolean(res.friends.find(value => value._id.toString() == req.user._id.toString()))
    return res;
    // }
    // return null;
}


exports.getPersonalProfile = async ({ userId, email }, req) => {
    // if (req.user) {
    await req.user.populate(['friends', 'friendRequests']);
    return {
        name: req.user.name,
        email: req.user.email,
        friends: req.user.friends,
        friendRequests: req.user.friendRequests,
        picture: req.picture,
        phoneNumber: req.user.phoneNumber
    }
    // }
    // return null;
}
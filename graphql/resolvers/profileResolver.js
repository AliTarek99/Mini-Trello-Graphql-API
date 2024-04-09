const Users = require('../../models/users');
const { getIO } = require('../../util/sockets');
const validator = require('validator');
const bcrypt = require('bcrypt');


exports.sendFriendRequest = async ({ name }, req) => {
    if (req.user) {
        let user = await Users.findOne({ name: name }, { _id: 1, friends: 1, friendRequests: 1 });
        if (user && user.friendRequests.indexOf(req.user._id) == -1) {
            if (req.user.friendRequests.indexOf(user._id) == -1) {
                user.friendRequests.push(req.user._id);
                await user.save();
                let sockets = getIO();
                if (sockets && sockets.userSocket.has(user._id.toString())) {
                    sockets.to(sockets.userSocket[user._id.toString()]).emit('friendRequest', { name: req.user.name, picture: req.user.picture });
                }
                return true;
            }
            else {
                return await this.manageFriendRequest({ name: user.name, accept: true }, req);
            }
        }
    }
    return false;
}

exports.manageFriendRequest = async ({ name, accept }, req) => {
    if (req.user) {
        let user = await Users.findOne({ name: name }, { _id: 1, friends: 1, friendRequests: 1 });
        let indxOfRequest = req.user.friendRequests.indexOf(req.user._id);
        if (user && indxOfRequest != -1) {
            if (accept) {
                req.user.friends.push(req.user.friendRequests[indxOfRequest]);
                req.user.friendRequests = req.user.friendRequests.filter((value, index) => index != indxOfRequest);
                user.friends.push(req.user._id);
                await req.user.save();
                user.save().then(user => {
                    let sockets = getIO();
                    if (sockets && sockets.userSocket.has(user._id.toString())) {
                        sockets.to(sockets.userSocket[user._id.toString()]).emit('RequestAccepted', { name: req.user.name, picture: req.user.picture });
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
    }
    return false;
}

exports.removeFriend = async ({ name }, req) => {
    if (req.user) {
        let user = await Users.findOne({ name: name });
        let indxOfRequest = req.user.friendRequests.indexOf(req.user._id);
        if (user && indxOfRequest != -1) {
            user.friendRequests = user.friendRequests.filter(value => value != req.user._id);
            req.user.friendRequests = req.user.friendRequests.filter((value, index) => index != indxOfRequest);
            await req.user.save();
            user.save();
            return true;
        }
    }
    return false;
}

exports.updateUserInfo = async ({ data }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        if (data.name && await Users.findOne({ name: data.name, _id: { $ne: req.user._id } }, { name: 1 })) {
            res.errors.push('Name already used.');
            res.successful = false;
        }
        if (data.newPassword) {
            if (!validator.isLength(validator.trim(data.newPassword), { max: 20, min: 5 }))
                res.errors.push('Password must be between 5 and 20 characters.');

            if (await bcrypt.compare(data.oldPassword, req.user.password))
                res.errors.push('Old password is wrong.');
            res.successful = false;
        }
        if (data.phoneNumber && validator.isMobilePhone(data.phoneNumber)) {
            res.errors.push('Invalid phoneNumber!');
            res.successful = false;
        }

        if(!res.successful)
            return res;

        req.user.name = data.name || req.user.name;
        req.user.password = data.newPassword || req.user.password;
        req.user.phoneNumber = data.phoneNumber || req.user.phoneNumber;
        req.user.picture = data.picture || req.user.picture;
        await req.user.save();
        return res;
    }
    else {
        res.errors.push('Unauthorized access.');
        res.successful = false;
    }
    return res;
}


exports.searchUsers = async ({ name }, req) => {
    if (req.user) {
        let result = await Users.find({ name: { $regex: `${name}*` } }, { name: 1, picture: 1, friendRequests: 1, friends: 1 });
        result.forEach(value => {
            return {
                name: value.name,
                picture: value.picture,
                sentRequest: (value.friendRequests.indexOf(req.user._id) != -1),
                inFriendRequests: (req.user.friendRequests.indexOf(req.user._id) != -1),
                inFriendsList: (value.friends.indexOf(req.user._id) != -1)
            }
        });
        return result;
    }
    return null;
}


exports.getUserProfile = async ({ name, userId }, req) => {
    if (req.user) {
        let res = await Users.findOne({ name: name, _id: userId }, { name: 1, picture: 1, friends: 1, friendRequests: 1 }).populate('friends');
        res.sentRequest = (res.friendRequests.indexOf(req.user._id) != -1);
        res.inFriendRequests = (req.user.friendRequests.indexOf(req.user._id) != -1);
        res.inFriendsList = (res.friends.indexOf(req.user._id) != -1);
        return res;
    }
    return null;
}


exports.getPersonalProfile = async ({ userId, email }, req) => {
    if (req.user) {
        await req.user.populate(['friends', 'friendRequests']);
        return {
            name: req.user.name,
            email: req.user.email,
            friends: req.user.friends,
            friendRequests: req.user.friendRequests,
            picture: req.picture,
            phoneNumber: req.user.phoneNumber
        }
    }
    return null;
}
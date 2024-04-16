const mongoose = require('mongoose');

const schema = mongoose.Schema;

const Users = new schema({
    name: {
        required: true,
        type: schema.Types.String,
        unique: true,
        index: true
    },
    email: {
        required: true,
        type: schema.Types.String,
        unique: true,
        index: true
    },
    password: {
        required: true,
        type: schema.Types.String
    },
    phoneNumber: {
        type: schema.Types.String,
        index: true
    },
    picture: {
        type: schema.Types.String
    },
    friends: {
        type: [{ type: schema.Types.ObjectId, ref: 'Users' }],
        required: true
    },
    friendRequests: {
        type: [{ type: schema.Types.ObjectId, ref: 'Users' }],
        required: true
    },
    verified: {
        type: schema.Types.Boolean,
        required: true
    },
    verficationToken: {
        type: schema.Types.String
    },
    verificationExpiry: {
        type: schema.Types.Date
    },
    passwordResetCode: {
        type: schema.Types.String
    },
    passwordResetExpiry: {
        type: schema.Types.Date
    }
})

module.exports = mongoose.model('Users', Users, 'Users');
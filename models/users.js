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
    phoneNumber: {
        type: schema.Types.String,
        unique: true
    },
    picture: {
        type: schema.Types.String,
        unique: true
    },
    friends: {
        type: [{type: schema.Types.ObjectId, ref: 'Users'}],
        required: true
    },
    friendRequest: {
        type: [{type: schema.Types.ObjectId, ref: 'Users'}],
        required: true
    }
})

module.exports = mongoose.model('Users', Users, 'Users');
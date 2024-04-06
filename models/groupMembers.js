const mongoose = require('mongoose');

const schema = mongoose.Schema;

const GroupMembers = new schema({
    group: {
        type: schema.Types.ObjectId,
        required: true,
        index: true,
        ref: 'Groups'
    },
    role: schema.Types.ObjectId,
    user: {
        type: schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    admin: {
        type: schema.Types.Boolean,
        required: true
    }
});

module.exports = mongoose.model('GroupMembers', GroupMembers, 'GroupMembers');
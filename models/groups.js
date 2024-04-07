const mongoose = require('mongoose');

const schema = mongoose.Schema;

const Groups = new schema({
    name: {
        type: schema.Types.String,
        required: true,
        index: true
    },
    creator: {
        type: schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    states: {
        required: true,
        type: [{ name: schema.Types.String }]
    },
    roles: [{
        color: {
            type: {
                r: { type: schema.Types.Number, required: true },
                g: { type: schema.Types.Number, required: true },
                b: { type: schema.Types.Number, required: true }
            },
            required: true
        },
        permissions: {
            type: [{ type: schema.Types.ObjectId }],
            reuquired: true
        }
    }],
    inviteLink: {
        type: schema.Types.String,
        unique: true
    }
});

module.exports = mongoose.model('Groups', Groups, 'Groups');
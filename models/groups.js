const mongoose = require('mongoose');
const tasks = require('./tasks');
const { types } = require('../util/reminder');
const groupMembers = require('./groupMembers');

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
        name: { 
            type: schema.Types.String,
            required: true
        },
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
    inviteCode: {
        type: schema.Types.String,
        unique: true,
        index: true
    }
});

Groups.pre('deleteOne', async function (next) {
    try {
        // delete and unschedule all tasks
        await tasks.deleteMany({group: this.getQuery()._id});

        // delete all members
        await groupMembers.deleteMany({group: this.getQuery()._id});
        next();
    } catch(err) {
        console.log(err);
    }
});

module.exports = mongoose.model('Groups', Groups, 'Groups');
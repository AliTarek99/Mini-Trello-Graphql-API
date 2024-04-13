const mongoose = require('mongoose');
const tasks = require('./tasks');
const { types } = require('../util/remider');

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
    inviteCode: {
        type: schema.Types.String,
        unique: true
    }
});

Groups.pre('deleteMany', async function (next) {
    try {
        let tmp = await tasks.find({group: {$in: this.getQuery()._id}});
        tasks.deleteMany({group: {$in: this.getQuery()._id}});
        tmp.forEach(value => {
            process.REMINDER.stdin.resume();
            process.REMINDER.stdin.write(JSON.stringify({type: types.delete, taskId: value._id}));
            process.REMINDER.end();
        });
        next();
    } catch(err) {
        console.log(err);
    }
});

module.exports = mongoose.model('Groups', Groups, 'Groups');
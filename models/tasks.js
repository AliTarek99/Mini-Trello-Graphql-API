const mongoose = require('mongoose');
const Comment = require('./comments');
const { types } = require('../util/reminder');
const { deleteFile } = require('../util/helper');

const schema = mongoose.Schema;

const Tasks = new schema({
    name: {
        type: schema.Types.String,
        required: true
    },
    description: {
        type: schema.Types.String,
        required: true
    },
    group: {
        type: schema.Types.ObjectId,
        required: true,
        ref: 'Groups'
    },
    assignedUsers: {
        type: [{ type: schema.Types.ObjectId, ref: 'Users' }],
        required: true
    },
    dueDate: schema.Types.Date,
    media: {
        type: [{ type: schema.Types.String }]
    },
    state: {
        type: schema.Types.ObjectId,
        required: true
    },
    reminderID: {
        type: schema.Types.String,
        index: true
    }
});

Tasks.pre('deleteOne', async function (next) {
    try {
        // delete media before deleting task
        let task = await module.exports.findById(this.getQuery()._id);
        task.media.forEach(value => {
            try {
                deleteFile(`data\\media\\${value.split('/')[6]}`)
            } catch (err) {
                console.log(err);
            }
        });

        // Delete comments inside this task
        await Comment.deleteMany({ task: this.getQuery()._id }, { media: 1 });

        // remove scheduled reminder for task's due date
        process.REMINDER.postMessage({ type: types.delete, taskId: this.getQuery()._id });
        next();
    } catch (err) {
        console.log(err);
    }
})

Tasks.pre('deleteMany', async function (next) {
    try {
        // delete media before deleting task
        let task = await module.exports.find({ group: this.getQuery().group });
        task.forEach(async value => {
            try {
                value.media.forEach(x => {
                    deleteFile(`data\\media\\${x.split('/')[6]}`)
                });
                // Delete comments inside this task
                await Comment.deleteMany({ task: value._id }, { media: 1 });
            } catch (err) {
                console.log(err);
            }
        });
        // remove scheduled reminder for task's due date
        process.REMINDER.postMessage({ type: types.delete, taskId: this.getQuery()._id });
        next();
    } catch (err) {
        console.log(err);
    }
})

module.exports = mongoose.model('Tasks', Tasks, 'Tasks');
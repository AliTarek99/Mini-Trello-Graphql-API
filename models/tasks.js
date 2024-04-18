const mongoose = require('mongoose');

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

module.exports = mongoose.model('Tasks', Tasks, 'Tasks');
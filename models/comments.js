const mongoose = require('mongoose');

const schema = mongoose.Schema;

const Comments = new schema({
    task: {
        type: schema.Types.ObjectId,
        ref: 'Tasks',
        required: true,
        index: true
    },
    user: {
        type: schema.Types.ObjectId,
        required: true,
        ref: 'Users'
    },
    media: {
        type: schema.Types.String,
        unique: true
    },
    text: {
        type: schema.Types.String
    }
});

module.exports = mongoose.model('Comments', Comments, 'Comments');
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
        type: schema.Types.String
    },
    text: {
        type: schema.Types.String
    },
    mentions: [{ type: schema.Types.ObjectId, ref: 'Users' }]
});

Comments.pre('deleteMany', async function (next) {
    try {
        // delete media before deleting comment
        let comments = await module.exports.find({task: this.getQuery().task});
        comments = comments.forEach(value => {
            try {
                deleteFile(`data\\media\\${value.media.split('/')[6]}`)
            } catch (err) {
                console.log(err);
            }
        });
        next();
    } catch (err) {
        console.log(err);
    }
})

module.exports = mongoose.model('Comments', Comments, 'Comments');

const reminder = require('node-schedule');
const Task = require('../models/tasks');
const { sendEmail } = require('./helper');

exports.types = {
    create: 0,
    modify: 1,
    delete: 2
}


process.stdin.setEncoding('utf8');
let input = '';

process.stdin.on('data', data => {
    input += data;
});

process.stdin.on('end', () => {
    input = JSON.parse(input);
    let date = new Date(input.date - 86400000);
    if(input.type == types.create) {
        const job = reminder.scheduleJob(input.taskId.toString() , date, async () => {
            let task = await Task.findById(input.taskId).populate({path: 'assignedUsers', select: 'name email'});
            
            sendEmail(task.assignedUsers.map(value => {
                return {
                    Name: value.name, 
                    Email: value.email
                };
            }), {
                subject: 'Due Date Reminder.',
                textPart: `This is a reminder for Task: ${task.name} which its due date is near ${task.dueDate}.`,
                htmlPart: `This is a reminder for <b>Task: ${task.name}</b> which its due date is near <b>${task.dueDate}</b>.`
            })
        });
    }
    else if(input.type == types.modify) {
        reminder.rescheduleJob(input.taskId.tostring(), date);
    }
    else {
        reminder.cancelJob(input.taskId.tostring());
    }
    input = '';
})
const reminder = require('node-schedule');
const Task = require('../models/tasks');
const { sendEmail } = require('./helper');
const { parentPort, isMainThread } = require('worker_threads');
const dburi = 'mongodb+srv://alitarek:512003@cluster0.yt1qvle.mongodb.net/Mini-Trello?retryWrites=true&w=majority';
const mongoose = require('mongoose');

let jobs = {}

exports.types = {
    create: 0,
    modify: 1,
    delete: 2
};

if (!isMainThread) {
    parentPort.on('message', async input => {
        if (input) {
            let date;
            // Set the reminder date
            if (new Date(input.date - 86400000).getTime() > Date.now()) {
                date = new Date(input.date - 86400000);
            }
            else {
                date = new Date(Date.now() + (60000 * 0.5));
            }
            // check if the main thread wants to create modify or delete a job
            if (input.type == exports.types.create) {
                jobs[input.taskId] = {
                    job: reminder.scheduleJob(input.taskId.toString(), date, async () => {
                        try {
                            await mongoose.connect(dburi);
                            var task = await Task.findById(input.taskId);
                            await task.populate('assignedUsers', 'name email');
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

                        } catch (err) {
                            console.log(err);
                        }
                    }),
                    // schedule a job to delete the original job from the jobs object
                    removeJob: reminder.scheduleJob(input.taskId.toString(), input.date, async () => { delete jobs[input.taskId]; }) 
                }
            }
            else if (input.type == exports.types.modify) {
                try {
                    // schedule a new job and delete 
                    jobs[input.taskId].job = reminder.rescheduleJob(jobs[input.taskId].job , date);
                    jobs[input.taskId].removeJob = reminder.rescheduleJob(jobs[input.taskId].removeJob , date);
                } catch (err) {
                    console.log(err);
                }
            }
            else {
                try {
                    reminder.cancelJob(jobs[input.taskId].job);
                    reminder.cancelJob(jobs[input.taskId].removeJob);
                    delete jobs[input.taskId];
                } catch (err) {
                    console.log(err);
                }
            }
        }
    });
}
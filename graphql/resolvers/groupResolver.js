const Task = require('../../models/tasks');
const Group = require('../../models/groups');
const GroupMember = require('../../models/groupMembers');
const { types } = require('../../util/reminder');
const { sendEmail, deleteFile } = require('../../util/helper');
const User = require('../../models/users');
const Comment = require('../../models/comments');
const { getIO } = require('../../util/sockets');
const { Worker } = require('worker_threads');
const users = require('../../models/users');
// const { GraphQLScalarType } = require('graphql')



// exports.Date = new GraphQLScalarType({
//     name: 'Date',
//     description: 'Date custom scalar type',
//     parseValue(value) {
//         // Convert incoming date string to Date object
//         return new Date(value);
//     },
//     serialize(value) {
//         // Convert outgoing Date object to string
//         console.log(value);
//         return value.toString();
//     },
//     parseLiteral(ast) {
//         if (ast.kind === Kind.STRING) {
//             // Parse AST string to Date object
//             return new Date(ast.value);
//         }
//         return null;
//     },
// })

exports.addComment = async ({ taskId, comment, notifyViaEmail }, req) => {
    let res = {status: { errors: [], successful: true }};
    if (!comment.text && !comment.media) {
        res.status.errors.push('Bad request.')
        res.status.successful = false;
        return res;
    }
    // check whether taskId is correct or not
    let task = await Task.findById(taskId, { assignedUsers: 1, group: 1, name: 1 }).populate('assignedUsers', 'name email');
    if (!task) {
        res.status.errors.push('Task not found.')
        res.status.successful = false;
        return res;
    }

    // check if user is admin or one of the assigned users to this task
    let member = await GroupMember.findOne({ user: req.user._id, group: task.group });
    let assigned = member.admin | task.assignedUsers.findIndex(value => req.user._id.toString() == value._id.toString()) != -1;
    if (!assigned) {
        res.status.errors.push('User must be admin or assigned to this task to comment.');
        res.status.successful = false;
        return res;
    }

    // send email if user wants to notify other users via email
    if (notifyViaEmail) {
        let emailedUsers = task.assignedUsers.map(value => {
            return { Name: value.name, Email: value.email };
        });
        sendEmail(emailedUsers, {
            subject: `Task Comments`,
            textPart: `${req.user.name} added a comment to task: ${task.name}\n${'Comment:' + comment.text || ''}`,
            htmlPart: `<b>${req.user.name}</b> added a comment to task: <b>${task.name}</b><br>${'Comment:' + comment.text || ''}`
        });
    }

    // check if there is users mentioned in the comment and check if they are admins or assigned users
    if (comment.mentions && comment.mentions.length) {
        let users = await User.find({ name: { $in: comment.mentions } }, { _id: 1 });
        var members = await GroupMember.find({ user: { $in: users }, group: task.group });
        let tmp = new Set(task.assignedUsers.map(value => value._id.toString()));
        members = members.filter(value => value.admin || tmp.has(value.user.toString())).map(value => value.user);
        let sockets = getIO();
        members.forEach(value => {
            if (sockets && sockets.userSocket[value.toString()]) {
                sockets.to(sockets.userSocket[value.toString()]).emit('addedComment', { taskId: taskId, groupId: task.group, comment: comment });
            }
        });
    }

    // save comment
    let c = new Comment({
        media: comment.media || '',
        mentions: members || [],
        task: task._id,
        text: comment.text || '',
        user: req.user._id
    });
    c = await c.save();
    await c.populate('user', 'name picture');
    res.comment = c;
    return res;
}

exports.addTask = async ({ task, groupId }, req) => {
    let res = { status: { errors: [], successful: true } };
    // check if user is group admin
    try {
        let member = await GroupMember.findOne({ user: req.user._id, admin: true, group: groupId });
        if (!member) {
            res.status.errors.push('user must be group admin to add tasks.');
            res.status.successful = false;
            return res;
        }

        // filter assigned users list if it has users that are not group members
        task.assignedUsers = await User.find({ name: { $in: task.assignedUsers } }, { _id: 1 })
        task.assignedUsers = await task.assignedUsers.filter(async u => {
            u = u._id;
            try {
                if (!(await GroupMember.findOne({ user: u, group: groupId }))) {
                    return false;
                }
                return true;
            } catch (err) {
                console.log(err);
            }
        });

        // save task to database
        var tmp = new Task({
            name: task.name,
            group: groupId,
            assignedUsers: task.assignedUsers,
            description: task.description,
            dueDate: task.dueDate,
            media: task.media,
            state: task.state
        });
        tmp = await tmp.save();
        await tmp.populate('assignedUsers', '_id name email picture');
        res.task = tmp;
    } catch (err) {
        console.log(err);
    }

    // notify other assigned users
    let sockets = getIO();
    tmp.assignedUsers.forEach(user => {
        if (sockets && sockets.userSocket[user._id.toString()]) {
            sockets.to(sockets.userSocket[user._id.toString()]).emit('taskAdded', { task: tmp });
        }
    });
    sendEmail(tmp.assignedUsers.map(value => { return { Name: value.name, Email: value.email } }), {
        subject: 'Task Assignment',
        textPart: `To whom it may concern,\n${req.user.name} assinged "${tmp.name}" task to you and its scheduled date to complete is ${tmp.dueDate}}.`,
        htmlPart: `To whom it may concern,<br><b>${req.user.name}</b> assinged <b>"${tmp.name}"</b> task to you and its scheduled date to complete is <b>${tmp.dueDate}</b>.`
    });
    // schedule reminder in worker thread
    process.REMINDER.postMessage({ date: task.dueDate, taskId: tmp._id.toString(), type: types.create });
    return res;
}

exports.changeTaskState = async ({ taskId, newStateId }, req) => {
    let res = { errors: [], successful: true };
    let task = await Task.findById(taskId, { _id: 1, assignedUsers: 1, state: 1, group: 1, name: 1 })
        .populate([
            { path: 'group', select: '_id roles states' },
            { path: 'assignedUsers', select: '_id name email' }
        ]);
    let member = await GroupMember.findOne({ user: req.user._id, group: task.group._id });
    let found = member.admin;

    // check if request sender is group member
    if (!member) {
        res.errors.push('Unauthorized access.')
        res.successful = false;
    }

    // search for new and old state IDs in permissions array of users role if he is not admin
    if (!found) {
        found = 0;
        task.group.roles.forEach(function (value) {
            if (value._id.toString() == member.role.toString()) {
                value.permissions.forEach(function (v) {
                    found += (v.toString() == newStateId || v.toString() == task.state.toString() ? 1 : 0);
                });
            }
        });

        if (found < 2) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
        }
    }

    if (!res.successful)
        return res;

    // check if user is assigned to this task or group admin
    let assigned = member.admin | Boolean(task.assignedUsers.find(value => member.user.toString() == value._id.toString()));
    if (!assigned) {
        res.errors.push('User must be assigned to this task to change its state.')
        res.successful = false;
        return res;
    }

    // notify other assigned users
    let sockets = getIO();
    task.assignedUsers.forEach(user => {
        if (sockets && sockets.userSocket[user._id.toString()]) {
            sockets.to(sockets.userSocket[user._id.toString()]).emit('taskStateChanged', { taskId: task._id, newStateId: newStateId, oldStateId: task.state });
        }
    });
    // get old and new state's names
    let oldState = task.group.states.find(value => value._id.toString() == task.state.toString()), newState = task.group.states.find(value => value._id.toString() == newStateId.toString());

    sendEmail(task.assignedUsers.map(value => { return { Name: value.name, Email: value.email } }), {
        subject: 'Task State Changed.',
        textPart: `To whom it might concern,\n${task.name} task's state has been changed from "${oldState} to "${newState}".`,
        htmlPart: `To whom it might concern,<br><b>${task.name}</b> task's state has been changed from <b>"${oldState}"</b> to <b>"${newState}"</b>.`
    });

    task.state = newStateId;
    task.save();
    return res;
}

exports.removeTask = async ({ taskId }, req) => {
    // check if member is group admin
    try {
        let task = await Task.findById(taskId);
        if (task) {
            let member = await GroupMember.findOne({ user: req.user._id, group: task.group, admin: true });
            if (!member) {
                return false;
            }

            // deleting task
            await Task.deleteOne({ _id: taskId });

            return true;
        }
    } catch (err) {
        console.log(err);
    }
    return false;
}

exports.modifyTask = async ({ task }, req) => {
    let res = { errors: [], successful: true };
    try {
        res.task = await Task.findById(task.id);
        // check that request sender is group admin
        if (res.task) {
            let member = await GroupMember.findOne({ user: req.user._id, admin: true, group: res.task.group });
            if (!member) {
                res.errors.push('user must be group admin to modify tasks.');
                res.successful = false;
                return res;
            }

            let group = await Group.findById(res.task.group, { states: 1 });
            if (group.states.findIndex(val => (val._id.toString() == task.state.toString())) == -1) {
                res.errors.push('Invalid state.');
                res.successful = false;
                return res;
            }

            // check if all assigned users are group members and filter them
            let sockets = getIO();
            if (task.assignedUsers) {
                let len = task.assignedUsers.length
                task.assignedUsers = await User.find({ name: { $in: task.assignedUsers } }, { _id: 1 })
                task.assignedUsers = await GroupMember.find({ user: { $in: task.assignedUsers }, group: res.task.group }).populate('user', '_id email name')
                task.assignedUsers.map(value => {
                    let u = value.user

                    if (sockets && sockets.userSocket[u._id.toString()]) {
                        sockets.to(sockets.userSocket[u._id.toString()]).emit('taskModification', { task: task });
                    }

                    sendEmail([{
                        Name: u.name,
                        Email: u.email
                    }], {
                        subject: 'Task Modification',
                        textPart: `To whom it may concern,\n${req.user.name} modified "${res.task.name}" task.`,
                        htmlPart: `To whom it may concern,<br><b>${req.user.name}<b> modified <b>"${res.task.name}"</b> task.`
                    });
                    return value.user._id;
                });
                if (len > task.assignedUsers.length)
                    res.errors.push('Some Users are not group members.');
            }
            //modify task data
            res.task.assignedUsers = task.assignedUsers || res.task.assignedUsers;
            res.task.name = task.name || res.task.name;
            res.task.media = task.media || res.task.media;
            res.task.dueDate = task.dueDate || res.task.dueDate;
            res.task.description = task.description || res.task.description;
            res.task.state = task.state || res.task.state;

            // schedule reminder in child process "reminder"
            process.REMINDER.postMessage({ date: res.task.dueDate, taskId: res.task._id.toString(), type: types.modify });
            await res.task.save();
            await res.task.populate('assignedUsers', 'name picture')
        }
        else {
            res.errors.push('Task not found.');
            res.successful = false;
        }
    } catch (err) {
        res.errors.push('Error occured.');
        res.successful = false;
        console.log(err);
    }
    return res;
}

exports.modifyGroupInfo = async ({ data }, req) => {
    let res = { status: { errors: [], successful: true } };
    // check that request sender is group admin
    let member = await GroupMember.findOne({ user: req.user._id, admin: true, group: data.id }, { user: 1 });
    if (!member) {
        res.status.errors.push('user must be an admin to change group info.');
        res.status.successful = false;
        return res;
    }

    // modify group data
    res.group = await Group.findById(data.id);
    if (res.group) {
        res.group.creator = res.group.creator;
        res.group.name = data.name || res.group.name;
        res.group.states = data.states || res.group.states;
        res.group = await res.group.save();
        await res.group.populate('creator', 'name picture');
    }
    else {
        res.status.errors.push('Group not found.');
        res.status.successful = false;
    }
    return res;
}

exports.createGroup = async ({ data }, req) => {
    let res = { status: { errors: [], successful: true } };
    let group = new Group({
        creator: req.user._id,
        name: data.name,
        // roles: data.roles,
        states: data.states || ['New', 'Done'],
        inviteCode: crypto.randomUUID().toString()
    });
    res.group = await group.save();
    let member = new GroupMember({ admin: true, group: res.group._id, user: req.user._id });
    member.save();
    await res.group.populate('creator', 'name picture');
    return res;
}

exports.deleteGroup = async ({ groupId }, req) => {

    // check if the request sender is the creator of the group before deleting it
    let group = await Group.findById(groupId);
    if (group && req.user._id.toString() == group.creator.toString()) {

        // send email to all group members to notify them
        GroupMember.find({ group: groupId }, { user: 1 })
            .populate('user', 'email name')
            .then(members => {
                sendEmail(members.map(value => { return { Name: value.user.name, Email: value.user.email } }), {
                    subject: 'Group Deletion',
                    textPart: `To whom it may concern,\n${req.user.name} deleted group "${group.name}" which has id of "${group._id}"`,
                    htmlPart: `To whom it may concern,<br><b>${req.user.name}</b> deleted group <b>"${group.name}"</b> which has id of <b>"${group._id}"</b>`
                });
            })
        await Group.deleteOne({_id: groupId});
        return true;
    }
    return false;
}

exports.addRole = async ({ groupId, role }, req) => {
    let res = { status: { errors: [], successful: true } };
    // check that request sender is group admin
    let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
    if (!member.admin) {
        res.status.errors.push('Unauthorized access.')
        res.status.successful = false;
        return res;
    }

    // get group and check if the states in permissions array are actual states in the group
    let group = await Group.findById(groupId);
    let found = true;
    role.permissions.forEach(value => found &= Boolean(group.states.find(state => state._id.toString() == value)));
    if (!found) {
        res.status.errors.push('Invalid state ID.');
        res.status.successful = false;
        return res;
    }

    // save role
    group.roles.push({
        name: role.name,
        color: {
            r: role.color.r,
            g: role.color.g,
            b: role.color.b
        },
        permissions: role.permissions
    });
    group = await group.save();
    res.group = await group.populate('creator', 'name picture');
    return res;
}

exports.removeRole = async ({ groupId, roleId }, req) => {
    // check that request sender is group admin
    let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
    if (!member.admin) {
        return false;
    }

    // remove group members role from groupMembers collection
    let group = await Group.findById(groupId);
    let members = await GroupMember.find({ role: roleId, group: groupId });
    members.forEach(value => {
        value.role = undefined;
        value.save();
    });

    // remove role
    group.roles = group.roles.filter(value => value._id.toString() != roleId);
    await group.save();
    return true;
}

exports.modifyRole = async ({ groupId, role }, req) => {
    let res = { errors: [], successful: true };
    // check that user provided role id or not
    if (!role.id) {
        res.errors.push('Missing role id.');
        res.successful = false;
        return res;
    }

    // check that request sender is group admin
    let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
    if (!member.admin) {
        res.errors.push('Unauthorized access.')
        res.successful = false;
        return res;
    }

    // get group and check if the states in permissions array are actual states in the group
    let group = await Group.findById(groupId);
    let found = true;
    role.permissions.forEach(value => found &= Boolean(group.states.find(state => state._id.toString() == value)));
    if (!found) {
        res.errors.push('Invalid state ID.');
        res.successful = false;
        return res;
    }

    // modify role
    group.roles = group.roles.map(value => {
        if (value._id.toString() == role.id) {
            return {
                name: role.name,
                color: {
                    r: role.color.r,
                    g: role.color.g,
                    b: role.color.b
                },
                permissions: role.permissions
            }
        }
        return value;
    });
    await group.save();
    return res;
}

exports.assignTaskToMember = async ({ groupId, taskId, memberName }, req) => {
    let res = { errors: [], successful: true };
    // check that request sender is group admin
    let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
    if (!member.admin) {
        res.errors.push('Unauthorized access.')
        res.successful = false;
        return res;
    }

    // check if member is in group
    let user = await User.findOne({ name: memberName }, { _id: 1, name: 1, email: 1 });
    member = await GroupMember.findOne({ user: user._id, group: groupId }, { user: 1 });
    if (!member) {
        res.errors.push('User not in group.');
        res.successful = false;
        return res;
    }

    let task = await Task.findById(taskId, { name: 1, assignedUsers: 1, dueDate: 1 });

    if(!task.assignedUsers.find(value => value.toString() == user._id.toString())) {
        // notify user that task has been assigned to him
        sendEmail([{ Name: user.name, Email: user.email }], {
            subject: `Task Assignment: ${task.name}-${task.dueDate}`,
            textPart: `Dear ${user.name},\n${req.user.name} assigned you to ${task.name} task which is scheduled to be completed by ${task.dueDate}.`,
            htmlPart: `Dear ${user.name},<br><b>${req.user.name}</b> assigned you to <b>${task.name}</b> task which is scheduled to be completed by <b>${task.dueDate}</b>.`
        });
        let sockets = getIO();
        if (sockets && sockets.userSocket[user._id.toString()]) {
            sockets.to(sockets.userSocket[user._id.toString()]).emit('taskAssigned', { admin: req.user.name, taskName: task.name, dueDate: task.dueDate });
        }

        // save user in assigned users in task collection
        task.assignedUsers.push(user._id);
        await task.save();
    }
    return res;
}

exports.addState = async ({ groupId, state }, req) => {
    let res = {status: { errors: [], successful: true }};
    try {
        // Check that user sending the request is an admin of the group
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            res.status.errors.push('Unauthorized access.')
            res.status.successful = false;
            return res;
        }
        // Update the group states array
        let group = await Group.findById(groupId, { states: 1 });
        group.states.push({ name: state });
        group = await group.save()
        res.state = group.states[group.states.length - 1];
    } catch(err) {
        console.log(err);
    }
    return res;
}

exports.removeState = async ({ groupId, stateId }, req) => {
    try {
        // Check that user sending the request is an admin of the group
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            return false;
        }
        // Modify the the group states list 
        let group = await Group.findById(groupId, { states: 1 });
        group.states = group.states.filter(value => value._id.toString() != stateId);
        // Save changes if there is at least on more state
        if (group.states.length) {
            // Move all Tasks in the removed state to the first state 
            let tasks = await Task.find({ group: groupId, state: stateId }, { state: 1 });
            tasks.forEach(value => {
                value.state = group.states[0];
                value.save();
            })
            await group.save();
            return true;
        }
    } catch(err) {
        console.log(err);
    }
    return false;
}

exports.modifyStateName = async ({ groupId, state }, req) => {
    let res = { errors: [], successful: true };
    try {
        // Check that user sending the request is an admin of the group
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
            return res;
        }
        // Modify state name if id is found 
        let group = await Group.findById(groupId, { states: 1 });
        group.states = group.states.map(value => value._id.toString() == state.id.toString() ? { _id: value._id, name: state.name } : value);
        await group.save();
    } catch(err) {
        console.log(err);
    }
    return res;
}

exports.createGroupInviteCode = async ({ groupId }, req) => {
    let res = { status: { errors: [], successful: true } };
    // check that the request sender is a group admin
    let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
    if (!member.admin) {
        res.status.errors.push('Unauthorized access.')
        res.status.successful = false;
        return res;
    }
    // modify the group code and return it
    let group = await Group.findById(groupId).populate('creator', 'name picture');
    group.inviteCode = crypto.randomUUID().toString();
    res.group = await group.save();
    return res;
}

exports.joinGroup = async ({ code }, req) => {
    let res = { status: { errors: [], successful: true } };
    let group = await Group.findOne({ inviteCode: code }).populate('creator', 'name picture');
    // check if there is a group having this code
    if (group) {
        // check that the request sender is not a member
        let member = await GroupMember.findOne({ user: req.user._id, group: group._id }, { user: 1 });
        if (!member) {
            // create member object and save it to the database
            member = new GroupMember({
                admin: false,
                group: group._id,
                user: req.user._id
            });
            await member.save();
        }
        res.group = group;
        return res;
    }
    res.status.errors.push('Invalid invite code.');
    res.status.successful = false;
    return res;
}

exports.addMember = async ({ groupId, name }, req) => {
    // check if request sender is group admin
    let member = await GroupMember.findOne({ user: req.user._id, admin: true, group: groupId }, { admin: 1 });
    if (!member.admin) {
        return false;
    }

    // save group member to database
    let user = await User.findOne({ name: name });
    if (!user || await GroupMember.findOne({ user: user._id, group: groupId }, { user: 1 })) {
        return false;
    }
    member = new GroupMember({
        admin: false,
        group: groupId,
        user: user._id
    });
    await member.save();
    return true;
}

exports.removeMember = async ({ groupId, name }, req) => {
    let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
    if (!member.admin || req.user.name == name) {
        return false;
    }
    let user = req.user.name == name ? req.user : await User.findOne({ name: name }, { _id: 1, email: 1, name: 1 });

    if (!user) {
        return false;
    }

    let group = await Group.findById(groupId);
    if (group.creator == user._id) {
        return false;
    }
    await GroupMember.findOneAndDelete({ user: user._id, group: groupId });
    sendEmail([{ Name: user.name, Email: user.email }], {
        subject: 'Removed From Group',
        textPart: `Dear ${user.name},\nYou have been removed from ${group.name} group by ${req.user.name}.`,
        htmlPart: `Dear ${user.name},<br>You have been removed from <b>${group.name}</b> group by <b>${req.user.name}</b>.`
    });
    let sockets = getIO();
    if (sockets && sockets.userSocket[user._id.toString()]) {
        sockets.to(sockets.userSocket[user._id.toString()]).emit('removedFromGroup', { groupName: group.name, groupId: group._id, by: req.user.name });
    }
    return true;
}

exports.changeMemberRole = async ({ groupId, name, role }, req) => {
    let res = { errors: [], successful: true };
    let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
    if (!member || !member.admin) {
        res.errors.push('Unauthorized access.')
        res.successful = false;
        return res;
    }
    let user = await User.findOne({ name: name }, { _id: 1, email: 1, name: 1 });
    member = await GroupMember.findOne({ user: user._id, group: groupId });
    if (!member) {
        res.errors.push('User not found.');
        res.successful = false;
        return res;
    }

    let group = await Group.findById(groupId, { _id: 1, name: 1, roles: 1 });
    let roleIdx = group.roles.findIndex(value => value._id.toString() == role);
    if (roleIdx == -1) {
        res.errors.push('role not found.')
        res.successful = false;
        return res;
    }

    sendEmail([{ Name: user.name, Email: user.email }], {
        subject: 'Role Changed',
        textPart: `Dear ${user.name},\nYour role has been changed to ${group.roles[roleIdx].name} by ${req.user.name}.`,
        htmlPart: `Dear ${user.name},<br>Your role has been changed to <b>${group.roles[roleIdx].name}</b> by <b>${req.user.name}</b>.`
    });
    let sockets = getIO();
    if (sockets && sockets.userSocket[user._id.toString()]) {
        sockets.to(sockets.userSocket[user._id.toString()]).emit('roleChanged', { groupName: group.name, groupId: group._id, by: req.user.name, newRole: role });
    }
    member.role = role;
    await member.save()
    return res;
}

exports.changePrivilege = async ({ groupId, name, admin }, req) => {
    let res = { errors: [], successful: true };

    // check if request sender is admin
    let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
    if (!member || !member.admin || req.user.name == name) {
        res.errors.push('Unauthorized access.')
        res.successful = false;
        return res;
    }

    // check if modified user is member
    let user = await User.findOne({ name: name }, { _id: 1, email: 1, name: 1 });
    member = await GroupMember.findOne({ user: user._id, group: groupId });
    if (!member) {
        res.errors.push('User not found.');
        res.successful = false;
        return res;
    }

    // check if modified user is the group creator
    let group = await Group.findById(groupId, { _id: 1, name: 1, creator: 1 });
    if (group.creator == user._id) {
        res.errors.push("Cannot change creator's privilege.");
        res.successful = false;
        return res;
    }

    // modify user and notify him
    member.admin = admin;
    await member.save();
    sendEmail([{ Name: user.name, Email: user.email }], {
        subject: 'Privilege changed',
        textPart: `Dear ${user.name},\nYour privilege has been changed in ${group.name} group by ${req.user.name}.`,
        htmlPart: `Dear ${user.name},<br>Your privilege has been changed in <b>${group.name}</b> group by <b>${req.user.name}</b>.`
    });
    let sockets = getIO();
    if (sockets && sockets.userSocket[user._id.toString()]) {
        sockets.to(sockets.userSocket[user._id.toString()]).emit('privilegeChanged', { groupName: group.name, groupId: group._id, by: req.user.name, admin: admin });
    }
    return res;
}

exports.searchGroups = async ({ name }, req) => {
    // if (req.user) {
    let groups = await Group.find({ name: { $regex: `^${name}.*` } }, { inviteCode: 0, roles: 0, states: 0 });
    return groups;
    // }
    // return [];
}

exports.getTasks = async ({ groupId, taskId }, req) => {
    if (/*req.user &&*/ (groupId || taskId)) {
        let tasks = groupId ? await Task.find({ group: groupId }, { reminderID: 0 }) : [await Task.findById(taskId, { reminderID: 0 })];
        return tasks;
    }
    // return [];
}


exports.getMyGroups = async (args, req) => {
    // if (req.user) {
    let groups = await GroupMember.find({ user: req.user._id }, { group: 1, admin: 1 }).populate('group');

    return groups.map(value => {
        if (value.admin)
            return value;
        delete value.group.inviteCode;
        return value;
    })
    // }
    // return [];
}
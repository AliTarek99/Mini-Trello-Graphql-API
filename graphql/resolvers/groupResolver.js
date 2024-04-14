const Task = require('../../models/tasks');
const Group = require('../../models/groups');
const GroupMember = require('../../models/groupMembers');
const { types } = require('../../util/remider');
const { sendEmail } = require('../../util/helper');
const User = require('../../models/users');
const Comment = require('../../models/comments');



exports.addComment = async ({ taskId, comment, notifyViaEmail }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        if (!comment.text && !comment.media) {
            res.errors.push('Bad request.')
            res.successful = false;
            return res;
        }
        let task = await Task.findById(taskId, { assignedUsers: 1, group: 1, name: 1 }).populate('assignedUsers', 'name email');

        if (notifyViaEmail) {
            task.assignedUsers = task.assignedUsers.map(value => {
                return { Name: value.name, Email: value.email };
            });
            sendEmail(task.assignedUsers, {
                subject: `Task Comments`,
                textPart: `${req.user.name} added a comment to task: ${task.name}\n${'Comment:' + comment.text || ''}`,
                htmlPart: `<b>${req.user.name}</b> added a comment to task: <b>${task.name}</b><br>${'Comment:' + comment.text || ''}`
            });
        }

        if (comment.mentions && comment.mentions.length) {
            let users = await User.find({ name: { $in: comment.mentions } }, { _id: 1 });
            var members = await GroupMember.find({ user: { $in: users }, group: task.group });
            let tmp = new Set(task.assignedUsers);
            members = members.filter(value => value.admin || tmp.has(value.user)).map(value => value.user);
        }

        let c = new Comment({
            media: comment.media || '',
            mentions: members || [],
            task: task._id,
            text: comment.text || '',
            user: req.user.name
        });
        c = await c.save();
        res.comment = c;
        return res;
    }

    res.errors.push('Unauthorized access.')
    res.successful = false;
    return res;
}

exports.addTask = async ({ task, groupId }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, admin: true, group: groupId });
        if (!member) {
            res.errors.push('user must be group admin to add tasks.');
            res.successful = false;
            return res;
        }

        task.assignedUsers = await task.assignedUsers.filter(async u => {
            if (!(await GroupMember.findOne({ group: groupId }).populate({ path: 'user', match: { name: u } }))) {
                return false;
            }
            return true;
        });

        let tmp = new Task({
            name: task.name,
            group: groupId,
            assignedUsers: task.assignedUsers,
            description: task.description,
            dueDate: task.dueDate,
            media: task.media,
            state: task.state
        });
        res.task = await tmp.save();
        process.REMINDER.stdin.resume();
        process.REMINDER.stdin.write(JSON.stringify({ date: task.dueDate, taskId: res.task._id.toString(), type: types.create }));
        process.REMINDER.stdin.end();
        return res;
    }
    res.errors.push('Unauthorized access.'), res.successful = false;
    return res;
}

exports.changeTaskState = async ({ taskId, newStateId }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let task = await Task.findById(taskId, { _id: 1, assignedUsers: 1, state: 1, group: 1 }).populate('group', '_id roles states');
        let member = await GroupMember.findOne({ user: req.user._id, group: task.group._id });
        let found = member.admin;

        if (!member) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
        }

        if (!found) {
            found = 0;
            task.group.roles.forEach(function (value) {
                if (value._id == member.role) {
                    value.permissions.forEach(function (value) {
                        found += (value.toString() == newStateId || value == task.state ? 1 : 0);
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

        task.state = newStateId;
        task.save();
        return res;
    }
    res.errors.push('Unauthorized access.')
    res.successful = false;
    return res;
}

exports.removeTask = async ({ taskId }, req) => {
    let tmp = await Task.findByIdAndDelete(taskId);
    if (tmp) {
        process.REMINDER.stdin.resume();
        process.REMINDER.stdin.write(JSON.stringify({ type: types.delete, taskId: tmp._id }));
        process.REMINDER.end();
        return true;
    }
    return false;
}

exports.modifyTask = async ({ task }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, admin: true, group: groupId });
        if (!member) {
            res.errors.push('user must be group admin to add tasks.');
            res.successful = false;
            return res;
        }

        res.task = await Task.findById(task._id);
        if (res.task) {
            task.assignedUsers = await task.assignedUsers.filter(async u => {
                if (!(await GroupMember.findOne({ group: res.task.group }).populate({ path: 'user', match: { name: u } }))) {
                    return false;
                }
                return true;
            });
            res.task.assignedUsers = task.assignedUsers || res.task.assignedUsers;
            res.task.name = task.name;
            res.task.media = task.media || res.task.media;
            res.task.dueDate = task.dueDate || res.task.dueDate;
            res.task.description = task.description || res.task.description;
            res.task.states = task.states || res.task.states;
            process.REMINDER.stdin.resume();
            process.REMINDER.stdin.write(JSON.stringify({ date: res.task.dueDate, taskId: res.task._id.toString(), type: types.modify }));
            process.REMINDER.stdin.end();
            await res.task.save();
        }
        else {
            res.errors.push('Group not found.');
            res.successful = false;
        }
        return res;
    }
    res.errors.push('Unauthorized access.'), res.successful = false;
    return res;
}

exports.modifyGroupInfo = async ({ data }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, admin: true, group: data._id });
        if (!member) {
            res.errors.push('user must be admin to change group info.');
            res.successful = false;
            return res;
        }
        res.group = await Group.findById(data._id);
        if (res.group) {
            res.group.creator = req.user._id;
            res.group.name = data.name;
            res.group.roles = data.roles || res.group.roles;
            res.group.states = data.states || res.group.states;
            await res.group.save();
        }
        else {
            res.errors.push('Group not found.');
            res.successful = false;
        }
        return res;
    }
    res.errors.push('Unauthorized access.'), res.successful = false;
    return res;
}

exports.createGroup = async ({ data }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {

        if (res.errors.length)
            return res;

        let group = new Group({
            creator: req.user._id,
            name: data.name,
            roles: data.roles,
            states: data.states || ['New', 'Done']
        });
        res.group = await group.save();
        return res;
    }
    res.errors.push('Unauthorized access.'), res.successful = false;
    return res;
}

exports.deleteGroup = async ({ groupId }, req) => {
    if (req.user) {
        let group = await Group.findById(groupId);
        if (req.user._id == group.creator) {
            await Group.findByIdAndDelete(groupId);
            return true;
        }
    }
    return false;
}

exports.addRole = async ({ groupId, role }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
            return res;
        }

        let group = await Group.findById(groupId);
        let found = true;
        role.permissions.forEach(value => found &= group.states.find(state => state._id.toString() == value));

        if (!found) {
            res.errors.push('Invalid state ID.');
            res.successful = false;
            return res;
        }
        group.roles.push({
            color: {
                r: role.color[0],
                g: role.color[1],
                b: role.color[2]
            },
            permissions: role.permissions
        });
        group = await group.save();
        res.role = group.roles[group.roles.length - 1];
        return res;
    }
    res.errors.push('Unauthorized access.');
    res.successful = false;
    return res;
}

exports.removeRole = async ({ groupId, roleId }, req) => {
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            return false;
        }
        let group = await Group.findById(groupId);
        let members = await GroupMember.find({ role: roleId, group: groupId });
        members.forEach(value => {
            value.role = undefined;
            value.save();
        });
        group.roles = group.roles.filter(value => value._id.toString() != roleId);
        await group.save();
        return true;
    }
    return false;
}

exports.modifyRole = async ({ groupId, role, notifyViaEmail }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        if (!role.id) {
            res.errors.push('Missing role id.');
            res.successful = false;
            return res;
        }

        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
            return res;
        }

        let group = await Group.findById(groupId);
        let found = true;
        role.permissions.forEach(value => found &= group.states.find(state => state._id.toString() == value));

        if (!found) {
            res.errors.push('Invalid state ID.');
            res.successful = false;
            return res;
        }
        group.roles.map(value => {
            if (value._id.toString() == role.id) {
                return {
                    color: {
                        r: role.color[0],
                        g: role.color[1],
                        b: role.color[2]
                    },
                    permissions: role.permissions
                }
            }
            return value;
        });
        await group.save();
        return res;
    }
    res.errors.push('Unauthorized access.');
    res.successful = false;
    return res;
}

exports.assignTaskToMember = async ({ groupId, taskId, memberName }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
            return res;
        }

        let user = await User.findOne({ name: memberName }, { _id: 1, name: 1});
        member = await GroupMember.findOne({ user: user._id, group: groupId }, { user: 1 });
        if (!member) {
            res.errors.push('User not in group.');
            res.successful = false;
            return res;
        }

        let task = await Task.findById(taskId, { name: 1, assignedUsers: 1, dueDate: 1 });

        sendEmail([{ Name: user.name, Email: user.email }], {
            subject: `Task Assignment: ${task.name}-${task.dueDate}`,
            textPart: `Dear ${user.name},\n${req.user.name} assigned you to ${task.name} task which is scheduled to be completed by ${task.dueDate}.`,
            htmlPart: `Dear ${user.name},<br><b>${req.user.name}</b> assigned you to <b>${task.name}</b> task which is scheduled to be completed by <b>${task.dueDate}</b>.`
        });

        task.assignedUsers.push(user._id);
        await task.save();
        return res;
    }
    res.errors.push('Unauthorized access.');
    res.successful = false;
    return res;
}

exports.addState = async ({ groupId, state }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
            return res;
        }

        let group = await Group.findById(groupId, { states: 1 });
        group.states.push({ name: state });
        group = await group.save()
        res.state = group.states[group.states.length - 1];
        return res;
    }
    res.errors.push('Unauthorized access.');
    res.successful = false;
    return res;
}

exports.removeState = async ({ groupId, stateId }, req) => {
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            return false;
        }

        let group = await Group.findById(groupId, { states: 1 });
        group.states = group.states.filter(value => value._id.toString() != stateId);
        if (group.states.length) {
            let tasks = await Task.find({ group: groupId, state: stateId }, { state: 1 });
            tasks.forEach(value => {
                value.state = group.states[0];
                value.save();
            })
            await group.save();
            return true;
        }
        return false;
    }
    return false;
}

exports.modifyStateName = async ({ groupId, state }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
            return res;
        }

        let group = await Group.findById(groupId, { states: 1 });
        group.states = group.states.map(value => value._id.toString() == state.id ? { _id: value._id, name: value.name } : value);
        await group.save();
        return res;
    }
    res.errors.push('Unauthorized access.');
    res.successful = false;
    return res;
}

exports.createGroupInviteCode = async ({ groupId }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
            return res;
        }

        let group = await Group.findById(groupId, { states: 1 });
    }
    res.errors.push('Unauthorized access.');
    res.successful = false;
    return res;
}

exports.joinGroup = async ({ code }, req) => {

}

exports.addMember = async ({ groupId, name }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
            return res;
        }

    }
    res.errors.push('Unauthorized access.');
    res.successful = false;
    return res;
}

exports.removeMember = async ({ groupId, name }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
            return res;
        }
    }
    res.errors.push('Unauthorized access.');
    res.successful = false;
    return res;
}

exports.changePrivilege = async ({ name, admin }, req) => {
    let res = { errors: [], successful: true };
    if (req.user) {
        let member = await GroupMember.findOne({ user: req.user._id, group: groupId }, { admin: 1 });
        if (!member.admin) {
            res.errors.push('Unauthorized access.')
            res.successful = false;
            return res;
        }
    }
    res.errors.push('Unauthorized access.');
    res.successful = false;
    return res;
}

exports.searchGroups = async ({ name }, req) => {

}

exports.getTasks = async ({ groupId, taskId }, req) => {

}

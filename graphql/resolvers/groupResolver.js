const Task = require('../../models/tasks');
const Group = require('../../models/groups');
const GroupMember = require('../../models/groupMembers');
const { types } = require('../../util/remider');



exports.addComment = async ({ taskId, comment, notifyViaEmail }, req) => {

}

exports.addTask = async ({ task, groupId }, req) => {
    let res = {errors: [], successful: true};
    if (req.user) {
        let member = await GroupMember.findOne({user: req.user._id, admin: true, group: groupId});
        if(!member) {
            res.errors.push('user must be group admin to add tasks.');
            res.successful = false;
            return res;
        }

        
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
        process.REMINDER.stdin.write(JSON.stringify({date: task.dueDate, taskId: res.task._id.toString(), type: types.create}));
        process.REMINDER.stdin.end();
        return res;
    }
    res.errors.push('Unauthorized access.'), res.successful = false;
    return res;
}

exports.changeTaskState = async ({ taskId, newStateId }, req) => {

}

exports.removeTask = async ({ taskId }, req) => {
    let tmp = await Task.findByIdAndDelete(taskId);
    if(tmp) {
        process.REMINDER.stdin.resume();
        process.REMINDER.stdin.write(JSON.stringify({type: types.delete, taskId: tmp._id}));
        process.REMINDER.end();
        return true;
    }
    return false;
}

exports.modifyTask = async ({ task }, req) => {
    let res = {errors: [], successful: true};
    if (req.user) {
        let member = await GroupMember.findOne({user: req.user._id, admin: true, group: groupId});
        if(!member) {
            res.errors.push('user must be group admin to add tasks.');
            res.successful = false;
            return res;
        }
        
        res.task = await Task.findById(task._id);
        if(res.task) {
            res.task.assignedUsers = task.assignedUsers || res.task.assignedUsers;
            res.task.name = task.name;
            res.task.media = task.media || res.task.media;
            res.task.dueDate = task.dueDate || res.task.dueDate;
            res.task.description = task.description || res.task.description;
            res.task.states = task.states || res.task.states;
            process.REMINDER.stdin.resume();
            process.REMINDER.stdin.write(JSON.stringify({date: res.task.dueDate, taskId: res.task._id.toString(), type: types.modify}));
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
    let res = {errors: [], successful: true};
    if (req.user) {
        let member = await GroupMember.findOne({user: req.user._id, admin: true, group: data._id});
        if(!member) {
            res.errors.push('user must be admin to change group info.');
            res.successful = false;
            return res;
        }
        res.group = await Group.findById(data._id);
        if(res.group) {
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
    let res = {errors: [], successful: true};
    if (req.user) {

        if(res.errors.length)
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

}

exports.removeRole = async ({ groupId, roleId }, req) => {

}

exports.modifyRole = async ({ groupId, data, notifyViaEmail }, req) => {

}

exports.assignTaskToMember = async ({ taskId, memberName }, req) => {

}

exports.addState = async ({ groupId, state }, req) => {

}

exports.removeState = async ({ groupId, stateId }, req) => {

}

exports.modifyStateName = async ({ groupId, state }, req) => {

}

exports.createGroupInviteCode = async ({ groupId }, req) => {

}

exports.joinGroup = async ({ code }, req) => {

}

exports.addMember = async ({ groupId, name }, req) => {

}

exports.removeMember = async ({ groupId, name }, req) => {

}

exports.changePrivilege = async ({ name, admin }, req) => {

}

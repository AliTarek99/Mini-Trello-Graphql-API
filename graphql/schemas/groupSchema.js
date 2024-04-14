const { buildSchema } = require('graphql');

module.exports = buildSchema(`

    type State {
        id: ID!
        name: String!
    }

    type Task {
        id: ID!
        name: String!
        description: String!
        groupId: ID!
        assignedUsers: [String]!
        dueDate: Date!
        media: String
        state: ID!
    }

    type Role {
        id: ID
        name: String!
        color: [Int]!
        permissions: [ID]!
    }

    input GroupInfo {
        id: ID
        name: String!
        states: [state]
        roles: [role]
        inviteCode: String
    }

    type User {
        picture: String
        name: String!
    }

    type Group {
        id: ID!
        name: String!
        creator: User
        states: [State]
        roles: [Role]
        inviteCode: String
    }

    type Comment {
        id: ID
        user: User
        media: String
        text: String
        mentions: [String]
    }

    type CommentResponse {
        status: Response!
        comment: Comment
    }

    type TaskResponse {
        status: Response!
        task: Task
    }

    type StateResponse {
        status: Response!
        state: State
    }

    type RoleResponse {
        status: Response!
        role: Role
    }

    type GroupResponse {
        status: Response!
        group: Group
    }

    type Response {
        errors: [String]!
        successful: Boolean!
    }

    type RootMutation {
        addComment(taskId: ID!, comment: Comment!, notifyViaEmail: Boolean): CommentResponse!

        addTask(task: Task!, groupId: ID!): TaskResponse!
        changeTaskState(taskId: ID!, newStateId: ID!): Response!
        removeTask(taskId: ID!): Boolean!
        modifyTask(task: Task!): Response!

        modifyGroupInfo(data: GroupInfo): GroupResponse!
        createGroup(data: GroupInfo): GroupResponse!
        deleteGroup(groupId: ID!): Boolean!

        addRole(groupId: ID!, role: Role!): GroupResponse!
        removeRole(groupId: ID!, roleId: ID!): Boolean!
        modifyRole(groupId: ID!, role: Role!): Response!

        assignTaskToMember(groupId: ID!, taskId: ID!, memberName: String!): Response!

        addState(groupId: ID!, state: String!): StateResponse!
        removeState(groupId: ID!,stateId: ID!): Boolean!
        modifyStateName(groupId: ID!, state: State!): Response!

        createGroupInviteCode(groupId: ID!): GroupResponse!
        joinGroup(code: String!): GroupResponse!

        addMember(groupId: ID!, name: String!): Boolean!
        removeMember(groupId: ID!, name: String!): Boolean!
        changePrivilege(groupId: ID!, name: String!, admin: Boolean!): Response!
        changeMemberRole(groupId: ID!, name: String!, role: ID!): Response!
    }

    type RootQuery {
        searchGroups(name: String!): [Group]
        getTasks(groupId: ID, taskId: ID): [Task]
        getMyGroups: [Group]
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`)
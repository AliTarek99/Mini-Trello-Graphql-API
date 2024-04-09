const { buildSchema } = require('graphql');

module.exports = buildSchema(`

    type State {
        id: ID!
        name: String!
    }

    type Task {
        id: ID!
        name: String!
        description: String
        groupId: ID!
        assignedUsers: [User]
        dueDate: Date!
        media: String
        state: ID!
    }

    type Role {
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
        picture: String!
        name: String!
    }

    type Group {
        id: ID!
        name: String!
        creator: User
        states: [state]
        roles: [role]
        inviteCode: String
    }

    type Comment {
        id: ID
        task: ID!
        username: String!
        media: String
        text: String
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

    type Comment {
        user: User
        text: String
        media: String
        mentions: [String]
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
        modifyRole(groupId: ID!, data: Role!, notifyViaEmail: Boolean): Response!

        assignTaskToMember(taskId: ID!, memberName: String!): Response!

        addState(groupId: ID!, state: State!): StateResponse!
        removeState(groupId: ID!,stateId: ID!): Boolean!
        modifyStateName(groupId: ID!, state: State!): Response!

        createGroupInviteCode(groupId: ID!): Response!
        joinGroup(code: String!): GroupResponse!

        addMember(groupId: ID!, name: String!): Boolean!
        removeMember(groupId: ID!, name: String!) Boolean!
        changePrivilege(name: String!, admin: Boolean!): Response!
    }

    type RootQuery {
        searchGroups(name: String!): [Group]
        getTasks(groupId: ID!, taskId: ID): [Task]
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`)
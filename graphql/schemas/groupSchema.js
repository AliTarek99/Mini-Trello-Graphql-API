const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    
    type State {
        id: ID!
        name: String!
    }

    input StateInput {
        name: String!
    }

    input ModifiedStateInput {
        id: ID
        name: String!
    }

    type Task {
        id: ID!
        name: String!
        description: String!
        group: ID!
        assignedUsers: [User]!
        dueDate: String!
        media: [String]
        state: ID!
    }

    input TaskInput {
        name: String!
        description: String!
        assignedUsers: [String]!
        dueDate: String!
        media: [String]
        state: ID!
    }

    input ModifiedTaskInput {
        id: ID
        name: String!
        description: String!
        assignedUsers: [String]!
        dueDate: String!
        media: [String]
        state: ID!
    }

    type Color {
        r: Int!
        g: Int!
        b: Int!
    }

    input InputColor {
        r: Int!
        g: Int!
        b: Int!
    }

    type Role {
        id: ID!
        name: String!
        color: Color!
        permissions: [ID]!
    }

    input RoleInput {
        name: String!
        color: InputColor!
        permissions: [ID]!
    }

    input ModifiedRoleInput {
        id: ID
        name: String!
        color: InputColor!
        permissions: [ID]!
    }

    input GroupInfo {
        name: String!
        states: [StateInput]
    }

    input ModifiedGroupInfo {
        id: ID!
        name: String
        states: [StateInput]
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
        id: ID!
        user: User!
        media: String
        text: String
        mentions: [String]
    }

    input CommentInput {
        id: ID
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
        addComment(taskId: ID!, comment: CommentInput!, notifyViaEmail: Boolean): CommentResponse!

        addTask(task: TaskInput!, groupId: ID!): TaskResponse!
        changeTaskState(taskId: ID!, newStateId: ID!): Response!
        removeTask(taskId: ID!): Boolean!
        modifyTask(task: ModifiedTaskInput!): Response!

        modifyGroupInfo(data: ModifiedGroupInfo!): GroupResponse!
        createGroup(data: GroupInfo!): GroupResponse!
        deleteGroup(groupId: ID!): Boolean!

        addRole(groupId: ID!, role: RoleInput!): GroupResponse!
        removeRole(groupId: ID!, roleId: ID!): Boolean!
        modifyRole(groupId: ID!, role: ModifiedRoleInput!): Response!

        assignTaskToMember(groupId: ID!, taskId: ID!, memberName: String!): Response!

        addState(groupId: ID!, state: String!): StateResponse!
        removeState(groupId: ID!,stateId: ID!): Boolean!
        modifyStateName(groupId: ID!, state: ModifiedStateInput!): Response!

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
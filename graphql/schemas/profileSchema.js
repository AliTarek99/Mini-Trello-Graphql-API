const { buildSchema } = require('graphql');

module.exports = buildSchema(`

    type User {
        name: String!
        email: String!
        friends: [SearchUser]
        friendRequests: [SearchUser]
        picture: String
        phoneNumber: String
    }

    input UserInfo {
        name: String
        oldPassword: String
        newPassword: String
        picture: String
        phoneNumber: String
    }

    type SearchUser {
        name: String!
        picture: String
        friends: [SearchUser]
        sentRequest: Boolean
        inFriendRequests: Boolean
        inFriendsList: Boolean
    }

    type Response {
        errors: [String]!
        successful: Boolean!
    }

    type RootMutation {
        sendFriendRequest(name: String!): Boolean!
        manageFriendRequest(name: String!, accept: Boolean!): Boolean!
        removeFriend(name: String!): Boolean!
        updateUserInfo(data: UserInfo): Response!
    }

    type RootQuery {
        searchUsers(name: String!): [SearchUser]
        getUserProfile(name: String, userId: String): SearchUser
        getPersonalProfile(userId: String, email: String): User
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
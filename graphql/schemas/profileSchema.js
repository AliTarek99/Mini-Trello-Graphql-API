const { buildSchema } = require('graphql');

const schema = buildSchema(`

    type User {
        name: String!
        email: String!
        friends: [SearchUser]
        friendRequests: [SearchUser]
        password: String
        picture: String
        phoneNumber: String
    }

    input UserInfo {
        name: String!
        oldPassword: String
        newPassword: String
        picture: String
        phoneNumber: String
    }

    type SearchUser {
        name: String!
        picture: String
        friends: [SearchUser]
    }

    type RootMutation {
        addFriend(name: String!): Boolean!
        updateUserInfo(data: UserInfo): Boolean!
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
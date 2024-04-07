const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    input loginData {
        email: String
        name: String
        password: String!
    }

    input signupData {
        email: String!
        name: String!
        password: String!
        phoneNumber: String
    }

    type User {
        name: String!
        _id: ID!
        email: String
        phoneNumber: String
        picture: String
        friends: [User]
        friendRequests: [User]
        verified: Boolean!
    }

    type Response {
        errors: [String]!
        user: User
        successful: Boolean!
    }

    type RootMutation {
        login(data: loginData!): Response!
        verifyUser(code: String!): Response!
        signup(data: signupData!): Response!
        sendResetPasswordEmail(email: String!): String!
        resetPasswordCode(code: String!): Boolean!
        resetPassword(code: String!, password: String): Response!
    }

    schema {
        mutation: RootMutation
    }
`);
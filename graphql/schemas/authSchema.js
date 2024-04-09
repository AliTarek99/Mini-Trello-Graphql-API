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
        token: String
    }

    type RootMutation {
        login(data: loginData!): Response!
        verifyUser(email:String!, code: String!): Boolean!
        signup(data: signupData!): Response!
        sendResetPasswordEmail(email: String!): String!
        resetPasswordCode(email:String!, code: String!): Boolean!
        resetPassword(email: String!, code: String!, password: String!): Response!
    }

    type RootQuery {
        c: String!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
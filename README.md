# Overview
This GraphQl API uses NodeJS with Express framework and MongoDB with Mongoose for the ODM. The main objective of this API is to allow teams to create groups, set tasks, define the states that the task will go through, and define the roles of members and permissions for each role.

# Use Case Diagram
This use case diagram shows the features of the API.

![Mini Trello api use case](https://github.com/AliTarek99/Mini-Trello-Graphql-API/assets/120846112/6431bab7-03b5-49b4-9bc0-bd925563e4d4)

Note: Task reminder is implemented using the worker threads package to schedule reminder jobs to try to avoid affecting the performance of the server.

# Database Schema
This schema diagram shows the collections in the database and their fields.

![image](https://github.com/AliTarek99/Mini-Trello-Graphql-API/assets/120846112/03f74949-9045-4f17-aa09-05fc674a66d1) Required fields.

![image](https://github.com/AliTarek99/Mini-Trello-Graphql-API/assets/120846112/67bcf62a-2859-40c4-a20c-240ef0edfcf9) Unique fields.

![image](https://github.com/AliTarek99/Mini-Trello-Graphql-API/assets/120846112/2698904a-479a-4697-9876-85cb5787ef94) Indexed fields.

Note: All the _id fields are indexed by default.

![image](https://github.com/AliTarek99/Mini-Trello-Graphql-API/assets/120846112/81afae4f-5731-4298-ab0c-9d3b948bd00a)

# GraphQl Schemas

You can find graphql schemas <a href="https://github.com/AliTarek99/Mini-Trello-Graphql-API/tree/master/graphql/schemas">here</a>

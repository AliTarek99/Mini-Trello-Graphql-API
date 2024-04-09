const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const authSchema = require('./graphql/schemas/authSchema');
const authResolver = require('./graphql/resolvers/authResolver');
const groupSchema = require('./graphql/schemas/groupSchema');
const groupResolver = require('./graphql/resolvers/groupResolver');
const profileSchema = require('./graphql/schemas/profileSchema');
const profileResolver = require('./graphql/resolvers/profileResolver');
const { graphqlHTTP } = require('express-graphql');
const { init } = require('./models/users');
const getUser = require('../../util/helper').getUser;

const dburi = 'mongodb+srv://alitarek:512003@cluster0.yt1qvle.mongodb.net/Mini-Trello?retryWrites=true&w=majority';
const app = express();

app.use('/profile/data/profilePictures', express.static(path.join('data', 'profilePictures')));
app.use('/groups/data/media', express.static(path.join('data', 'media')));


app.use('/graphql', 
  graphqlHTTP({ schema: authSchema, rootValue: authResolver  }),
  getUser,
  graphqlHTTP({ schema: groupSchema, rootValue: groupResolver }), 
  graphqlHTTP({ schema: profileSchema, rootValue: profileResolver  })
);


mongoose.connect(dburi).then((value) => {
  let server = app.listen(3000);
  init(server);
}).catch(err => {
  console.log(err);
});

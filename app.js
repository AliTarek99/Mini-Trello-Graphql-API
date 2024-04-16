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
const { spawn } = require('child_process');
const io = require('./util/sockets');
const { getUser, errorhandler, fileUpload, getJwtPayload } = require('./util/helper');
const multer = require('multer');

process.JWT_PRIVATE_KEY = ';jkljsd./423wq1341@#ja;sq';

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    if (req.originalUrl.split('/')[2] == 'profile') {
      cb(null, path.join('data', 'profilePictures'));
    }
    else if (req.originalUrl.split('/')[2] == 'group') {
      cb(null, path.join('data', 'media'));
    }
  },
  filename: async function (req, file, cb) {
    req.payload = getJwtPayload(req);
    if (req.originalUrl.split('/')[2] == 'profile') {
      if (req.payload.userId) {
        let dest = req.payload.userId + '-' + file.filename;
        cb(null, dest);
      }
      cb(new Error('unauthorized upload.'), '');
    }
    else if (req.originalUrl.split('/')[2] == 'group') {
      if (req.payload.userId) {
        let dest = new Date().getTime() + '-' + req.payload.userId + '-' + file.filename;
        cb(null, dest);
      }
      cb(new Error('unauthorized upload.'), '');
    }
    cb(new Error('Invalid Path.'));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype == 'image/png' || file.mimetype == 'image/jpg' ||
      file.mimetype == 'image/jpeg' || file.mimetype == 'image/mp4') {
      cb(null, true);
    }
    cb(new Error('Invalid file.'), false);
  }
})

const dburi = 'mongodb+srv://alitarek:512003@cluster0.yt1qvle.mongodb.net/Mini-Trello?retryWrites=true&w=majority';
const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use('/profile/data/profilePictures', express.static(path.join('data', 'profilePictures')));
app.use('/groups/data/media', express.static(path.join('data', 'media')));

app.use('/api/uploadFile', getUser, upload.single('file'), fileUpload);



app.use('/graphql/auth', graphqlHTTP({
  schema: authSchema,
  rootValue: authResolver,
  customFormatErrorFn: errorhandler
}));

app.use('/graphql/profile', getUser, graphqlHTTP({ 
  schema: profileSchema, 
  rootValue: profileResolver,
  customFormatErrorFn: errorhandler 
}));

app.use('/graphql/group', getUser, graphqlHTTP({ 
  schema: groupSchema, 
  rootValue: groupResolver,
  customFormatErrorFn: errorhandler 
}));

process.REMINDER = spawn('node', ['./util/reminder.js']);

app.use(errorhandler);

mongoose.connect(dburi).then((value) => {
  let server = app.listen(3000);
  io.init(server);
  io.getIO().on('connection', io.onConnection);
}).catch(err => {
  console.log(err);
});

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
const groupMembers = require('./models/groupMembers');
const { Worker } = require('worker_threads');
process.REMINDER = new Worker("./util/reminder.js");

process.env.JWT_PRIVATE_KEY = ';jkljsd./423wq1341@#ja;sq';

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    let err = new Error();
    err.originalError = true;
    err.set = true;
    if(!req.body.dest) {
      err.message = 'Missing dest.';
      return cb(err);
    }
    if (req.body.dest == 'profile') {
      return cb(null, path.join('data', 'profilePictures'));
    }
    else if (req.body.dest == 'group') {
      return cb(null, path.join('data', 'media'));
    }
  },
  filename: async function (req, file, cb) {
    let err = new Error();
    err.originalError = true;
    err.set = true;
    if(!req.body.dest) {
      err.message = 'Missing dest.';
      return cb(err);
    }
    req.payload = getJwtPayload(req);
    if (req.body.dest == 'profile') {
      if (req.payload.userId) {
        let dest = req.payload.userId + '-' + file.originalname;
        return cb(null, dest);
      }
      err.message = 'unauthorized upload.';
      return cb(err);
    }
    else if (req.body.dest == 'group') {
      if (req.payload.userId && req.body.groupId && await groupMembers.findOne({group: req.body.groupId, user: req.payload.userId})) {
        let dest = new Date().getTime() + '-' + req.body.groupId + '.' + file.mimetype.split('/')[1];
        return cb(null, dest);
      }
      err.message = 'unauthorized upload.';
      return cb(err);
    }
    err.message = 'Invalid path.';
      return cb(err);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype == 'image/png' || file.mimetype == 'image/jpg' ||
      file.mimetype == 'image/jpeg' || file.mimetype == 'image/mp4') {
      return cb(null, true);
    }
    let err = new Error();
    err.originalError = true;
    err.set = true;
    err.message = 'Invalid file.';
    return cb(err, false);
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
app.use('/groups/data/media', getUser, async (req, res, next) => {
  let member = await groupMembers.findOne({group: req.originalUrl.split('-')[1].split('.')[0], user: req.user._id});
  if(member)
    return next();
  let err = new Error('Unauthorized access!');
  err.set = true;
  err.originalError = true;
  next(err);
}, express.static(path.join('data', 'media')));

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


app.use(errorhandler);

mongoose.connect(dburi).then((value) => {
  let server = app.listen(3000);
  io.init(server);
  io.getIO().on('connection', io.onConnection);
}).catch(err => {
  console.log(err);
});

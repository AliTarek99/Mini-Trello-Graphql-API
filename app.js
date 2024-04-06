const app = require('express')();
const mongoose = require('mongoose');

const dburi = 'mongodb+srv://alitarek:512003@cluster0.yt1qvle.mongodb.net/Mini-Trello?retryWrites=true&w=majority';



mongoose.connect(dburi).then(value => {
    app.listen(3000);
}).catch(err => {
    console.log(err);
})

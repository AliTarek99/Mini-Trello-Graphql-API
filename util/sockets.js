const getJwtPayload = require('./helper').getJwtPayload;
let io;

exports.init = server => {
    io = require('socket.io')(server);
    io.userSocket = new Map();
    io.socketToUser = new Map();
    return io;
}
exports.getIO = () => {
    return io;
}

exports.onConnection = socket => {
    socket.on('addUser', stream => {
        if(stream.token) {
            let data = getJwtPayload({Authorization: stream.token});
            io.userSocket[data.userId] = socket.id;
            io.socketToUser[socket.id] = data.userId;
        }
    });
    socket.on('disconnect', () => {
        io.userSocket.delete(io.socketToUser[socket.id]);
        io.socketToUser.delete(socket.id);
    });
}
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public'); //sets up the path to the 'public' folder

app.use(express.static(publicDirectoryPath)); //sets up express tp serve static files from '/public' folder

io.on('connection', (socket) => {
    console.log('New websocket connection established');

    //note options refers to 
    socket.on('join', ({ username, room }, callback) => { //note: the call back function is supplied in 'chat.js' file inf uction socket.emit('join', {username, room}, (error)=>{});
        //try to add a user to a room
        const { error, user } = addUser({ id: socket.id, username, room });
        
        if(error) {
            return callback(error);
        }

        //socket.io library has native support for creating rooms that can be used in a chat application for instance
        socket.join(user.room); 

        //sends message only to the client that generated the socket
        socket.emit('message', generateMessage('admin', 'You\'re welcome!'));

        //sends message to all connected clients except the client that generated the socket
        socket.join(user.room); 
        socket.broadcast.to(user.room).emit('message', generateMessage('admin', `${user.username} has joined`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback(); 
        
    });

    socket.on('transmitMessage', (chatMessage, callback) => {
        const filter = new Filter();

        if(filter.isProfane(chatMessage)) {
            return callback('Profanity not allowed');
        }

        const user = getUser(socket.id);
        if(user) {
            io.to(user.room).emit('message', generateMessage(user.username, chatMessage)); //sends chat message to all connected clients
            callback();
        }
    });

    socket.on('transmitLocation', (locationData, callback) => {
        const user = getUser(socket.id);

        if(!locationData) {
            return console.log("Location not shared");
        }

        const location = `https://google.com/maps?q=${locationData.lat},${locationData.long}`;

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, user.location));
        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        //console.log('User Removed: ', user);

        if(user) {
            socket.broadcast.to(user[0].room).emit('message', generateMessage('admin', `${user[0].username} has left`)); //sends message to all connected clients    
            io.to(user.room).emit('roomData', {
                room: user[0].room,
                users: getUsersInRoom(user[0].room)
            });

            //console.log('users: ', users);
            console.log('People left in room after one person left: ', getUsersInRoom(user[0].room));
        }
    });
});


//PLAYGROUND PURPOSES 
//let count = 0;
//
//this function handles communication to and for clients connected to this server
// io.on('connection', (socket) => {
//     console.log('New Websocket connection established');
    
//     //emits 'count' to the specific connection to this server
//     socket.emit('CountUpdated', count);


//     socket.on('increment', () => {
//         count++;
//         //socket.emit('CountUpdated', count); //this emits message to a specific connection (just one);

//         //this emits 'count' to all connections to the server 
//         //once the 'increment' event is fired by any client connect to this server
//         //the 'count' data is immediately sent to all clients currently connected to the server;
//         io.emit('CountUpdated', count); 
//     });
// });

server.listen(port, () => {
    console.log(`CORS-unenabled server is up on port ${port}`);
});
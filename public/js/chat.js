//CLIENT SIDE

//setup socket.io connection to the server
const socket = io(); 

//HTML Elements
const $messageForm = document.getElementById('chat-message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormSendBtn = $messageForm.querySelector('button');
const $sendLocationBtn = document.getElementById('send-location');
const $messages = document.getElementById('messages');

//Templates
const messageTemplate = document.getElementById('message-template').innerHTML;
const urlTemplate = document.getElementById('location-url-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

//Options
//Note: 'qs' (query string) is an npm module used for parsing query strings into objects
//'location' is a global object provided the browser
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
    //get new message element
    const $newMessage = $messages.lastElementChild;

    //Height of the new message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    //visible height - height we can see on the message-section of the chat window
    const visibleHeight = $messages.offsetHeight

    //Height of messages container
    const containerHeight = $messages.scrollHeight;

    // How far have I scrolled the messages
    const scrollOffset = $messages.scrollTop + visibleHeight;
    
    if(Math.round(containerHeight - newMessageHeight - 1) <= Math.round(scrollOffset)){
        $messages.scrollTop = $messages.scrollHeight;
    }
}

//receive message from server
socket.on('message', (message) => {
    console.log('message', message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('HH:mm')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

//receive location url (message) from server
socket.on('locationMessage', (location) => {
    //console.log('location username:', location.username);
    const html = Mustache.render(urlTemplate, {
        username: location.username,
        location: location.url,
        createdAt: moment(location.createdAt).format('HH:mm')
    });

    $messages.insertAdjacentHTML('beforeend', html);
    //autoscroll();
});

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });

    document.querySelector('#sidebar').innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    //disable form once 'send' button has been clicked and geodata is being fetched
    $messageFormSendBtn.setAttribute('disabled',  'disabled');
    const chatMessage = e.target.elements.message.value; // or const messageInput = document.getElementById('chat-message');
   
    socket.emit('transmitMessage', chatMessage, (error) => {
        //re-enable form once 'send' button has been clicked and geodata is being fetched
        $messageFormSendBtn.removeAttribute('disabled');
        $messageFormInput.value='';
        $messageFormInput.focus();
        
        if(error) {
            return console.log(error);
        }

        console.log('Message delivered');
    });
});

$sendLocationBtn.addEventListener('click', () => {
    if(!navigator.geolocation) {
        return alert('Geolocation support missing in your browser');
    }

    $sendLocationBtn.setAttribute('disabled', 'disabled');

    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('transmitLocation', {
            lat: position.coords.latitude,
            long: position.coords.longitude
        }, (error) => {
            if(error) {
                return console.log(error);
            }
            $sendLocationBtn.removeAttribute('disabled');
            console.log('Location shared');
        });     
    });
});

socket.emit('join', { username, room }, (err) => {
    if(err) {
        alert(err);
        //'location' is a browser-provided global project
        //this redirects back to the home page 
        location.href='/';
    }
});


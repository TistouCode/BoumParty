const socket = io();

socket.on('message', (msg) => {
    console.log('fehefu')
    const li = document.createElement('li');
    li.textContent = msg;
    document.getElementById('messages').appendChild(li);
});

function sendMessage() {
    const input = document.getElementById('messageInput');
    socket.emit('message', input.value);
    input.value = '';
}

function join(){
    console.log("neuille")
    let iPseudo = document.getElementById('pseudo');
    let pseudo = iPseudo.value;
    if(pseudo){
        console.log("jiefjuoejo")
        socket.emit('new-user', pseudo);
    }
}

socket.on('user-list', (listUser) => {
    const ul = document.getElementById('messages');
    ul.innerHTML = '';
    listUser.forEach((user) => {
        const li = document.createElement('li');
        li.textContent = user;
        ul.appendChild(li);
    });
});
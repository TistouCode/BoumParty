// Récupérer le gameId depuis l'URL
const gameId = window.location.pathname.split('/')[1];
const token = window.location.pathname.split('/')[2];

const socket = io(
    {
        query: {
            gameId: gameId,
            token: token
        }
    }
);

console.log("HHHHHH")

let tabPlayer = document.getElementById('tabPlayer');
let userList = document.getElementById('userList');
socket.on('user-list', (players) => {
    // console.log('Vous avez rejoint la partie en tant que :', pseudo);
    console.log(players)
    players.forEach((player) => {
        if(player[1].connected === true){
                console.log(player[0] + " est connecté")
                let liNewPlayer = document.createElement('li')
                liNewPlayer.textContent = player[0];
                userList.appendChild(liNewPlayer);
        }
    });



    // players.forEach((player) => {
    //     let liNewPlayer = document.createElement('li')
    //     liNewPlayer.textContent = player;
    //     tabPlayer.appendChild(liNewPlayer);
    // })
    // let liNewPlayer = document.createElement('li')
    // liNewPlayer.textContent = pseudo;
    // tabPlayer.appendChild(liNewPlayer);

});
//
// socket.on('message', (msg) => {
//     const li = document.createElement('li');
//     li.textContent = msg;
//     document.getElementById('messages').appendChild(li);
// });
//
// function sendMessage() {
//     const input = document.getElementById('messageInput');
//     socket.emit('message', input.value);
//     input.value = '';
// }
//
// function join(){
//     console.log("neuille")
//     let iPseudo = document.getElementById('pseudo');
//     let pseudo = iPseudo.value;
//     if(pseudo){
//         console.log("jiefjuoejo")
//         socket.emit('new-user', pseudo);
//     }
// }
//
// socket.on('user-list', (listUser) => {
//     const ul = document.getElementById('messages');
//     ul.innerHTML = '';
//     listUser.forEach((user) => {
//         const li = document.createElement('li');
//         li.textContent = user;
//         ul.appendChild(li);
//     });
// });
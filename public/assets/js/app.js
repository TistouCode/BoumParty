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

let tabUsers = []
socket.on('user-list', (players) => {
    // console.log('Vous avez rejoint la partie en tant que :', pseudo);
    console.log(players)
    players.forEach((player) => {
        if(player[1].connected === true && !tabUsers.includes(player[0])) {
                tabUsers.push(player[0])
                console.log(player[0] + " est connecté")
                console.log(tabUsers)

                let liNewPlayer = document.createElement('li')
                liNewPlayer.classList.add('player')
                liNewPlayer.id = player[1].token;
                liNewPlayer.textContent = player[0];
                userList.appendChild(liNewPlayer);
        }
        if(player[1].connected === false && tabUsers.includes(player[0])) {
            console.log("Le joueur " + player[0] + " s'est déconnecté")
            let liNewPlayer = document.getElementById(player[1].token);
            console.log(liNewPlayer)
            tabUsers = tabUsers.filter(e => e !== player[0])
            liNewPlayer.remove();
            // if(liNewPlayer !== null && tabUsers.includes(player[0])) {
            //     tabUsers.remove(player[0])
            //     liNewPlayer.remove();
            // }

        }
    });
});

socket.on('game-start', () => {
    console.log('La partie commence !');
});


let inputProposition = document.getElementById('inputProposition');
inputProposition.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        alert('Vous avez appuyé sur Entrée !');
        let proposition = inputProposition.value;
        socket.emit('proposition', proposition);
    }
});

socket.on('actual-player', (playerToken) => {
    console.log("Actual Player Token:", playerToken);
    // Réinitialiser la couleur de tous les joueurs
    document.querySelectorAll('.player').forEach(player => {
        player.style.color = "black";
    });
    let actualPlayer = document.getElementById(playerToken);
    if (actualPlayer) {
        actualPlayer.style.color = "red";
    }

    if(playerToken === token) {
        inputProposition.disabled = false;
        actualPlayer.style.color = "red";
    }else{
        inputProposition.disabled = true;
    }
})

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
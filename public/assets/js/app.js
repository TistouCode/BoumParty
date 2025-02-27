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

let divPlayer = document.getElementById('divPlayer');
let userList = document.getElementById('userList');

let tabUsers = []

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

socket.on('user-list', (players) => {
    console.log("Liste des joueurs mise à jour :", players);

    let playerListElement = document.getElementById("userList");
    playerListElement.innerHTML = ""; // On vide la liste avant de la recharger

    players.forEach(player => {
        let li = document.createElement("li");
        li.textContent = player[0]; // Nom du joueur
        li.id = player[1].token;    // On met le token en id pour identifier chaque joueur
        li.classList.add("player", "p-2", "rounded-lg");

        // Si le joueur est actif, il reste rouge
        if (player[1].token === currentActualPlayerToken) {
            li.classList.add("text-red-500", "font-bold");
        }

        // Si le joueur est déconnecté, on le rend transparent
        if (!player[1].connected) {
            li.classList.add("opacity-70");
        }

        playerListElement.appendChild(li);
    });
});

// Stocker le joueur actif
let currentActualPlayerToken = null;
socket.on('actual-player', (playerToken) => {
    console.log("TOKEN reçu :", playerToken);
    currentActualPlayerToken = playerToken;
    updateActualPlayer(playerToken);
});

function updateActualPlayer(playerToken) {
    let players = document.querySelectorAll('.player');

    players.forEach(player => {
        player.classList.remove("text-red-500", "font-bold");
    });

    let actualPlayer = document.getElementById(playerToken);
    if(playerToken === token) {
        inputProposition.disabled = false;
    }else{
        inputProposition.disabled = true;
    }
    if (actualPlayer) {

        actualPlayer.classList.add("text-red-500", "font-bold");
    }
}


let sequence = document.getElementById('sequence');

socket.on('sequence', (seq) => {
    console.log("Séquence reçue :", seq);
    sequence.textContent = seq;
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
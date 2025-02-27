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


let divPlayer = document.getElementById('divPlayer');
let userList = document.getElementById('userList');

let tabUsers = []

socket.on('game-start', () => {
    console.log('La partie commence !');
});



let inputProposition = document.getElementById('inputProposition');
inputProposition.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        let proposition = inputProposition.value;
        socket.emit('proposition', proposition);
        inputProposition.value = '';
    }
});


socket.on('word', (word) => {
    console.log('Mot reçu :', word);
    let playerElement = document.getElementById(token);
    playerElement.children[1].textContent = word;
})


socket.on('user-list', (players) => {
    console.log("Liste des joueurs mise à jour :", players);

    let playerListElement = document.getElementById("userList");
    playerListElement.innerHTML = ""; // On vide la liste avant de la recharger

    players.forEach(player => {
        let li = document.createElement("li");
        li.textContent = player[0]; // Nom du joueur
        li.id = player[1].token;    // On met le token en id pour identifier chaque joueur
        li.classList.add("player", "p-2", "rounded-lg");
        console.log(player)

        // Affichage des vies sous forme de cœurs
        let heartList = document.createElement("ul");
        heartList.classList.add("flex", "space-x-1"); // On ajoute de l'espace entre les cœurs

        // Afficher 3 cœurs, certains vides si le joueur a perdu des vies
        let lives = player[1].life;
        for (let i = 0; i < lives; i++) {
            let heart = document.createElement("li");
            heart.textContent = i < lives ? "❤️" : "🤍"; // Cœur plein si la vie est encore là, sinon cœur vide
            heart.classList.add("text-xl"); // Agrandir les cœurs
            heartList.appendChild(heart);
            console.log("LIVES : ", lives)
        }

        let proposition = document.createElement("p");
        // Ajouter la liste des cœurs à chaque joueur
        li.appendChild(heartList);
        li.appendChild(proposition);

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


// Signal reçu lorsqu'un joueur a perdu une vie
socket.on('boum', (player)=>{
    let playerElement = document.getElementById(player.token);
    console.log("PLAYER ELEMENT", playerElement.children)
    playerElement.children[0].lastElementChild.remove()
    playerElement.children[1].textContent = player.actualWord
})


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

socket.on('timer', (time) => {

    let timer = document.getElementById('timer');
    timer.textContent = time;
})

socket.on('player-death', (player) => {
    console.log("Joueur mort :", player);
    let playerElement = document.getElementById(player.token);
    playerElement.classList.add("opacity-20");
})


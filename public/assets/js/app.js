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

// Signal reçu lorsqu'un mot est validé
socket.on('word', (word) => {
    console.log('Mot reçu :', word);
    let proposition = word[0];
    let validWord = word[1];
    let playerToken = word[2];
    console.log("PLAYER WHO WRITE IS : ", playerToken)
    let playerElementWhoWriteTheProposition = document.getElementById(token);
    let playerPropositionElement = document.getElementById(`${playerToken}-proposition`);
    if(validWord===true){ // Si le mot est correct
        console.log("MOT VALIDE")
        playerPropositionElement.textContent = proposition;
        playerPropositionElement.classList.remove("text-red-500")
        playerPropositionElement.classList.add("text-green-500")
    }else if(validWord === false){ // Si le mot est incorrect
        console.log("MOT INVALIDE")
        playerPropositionElement.textContent = proposition;
        playerPropositionElement.classList.remove("text-red-500")
        playerPropositionElement.classList.add("text-red-500")
    }
})

socket.on('user-list', (players) => {
    let playerListElement = document.getElementById("userList");
    playerListElement.innerHTML = ""; // On vide la liste avant de la recharger

    players.forEach(player => {
        let playerElt = document.createElement("li");
        playerElt.id = player[1].token;    // On met le token en id pour identifier chaque joueur
        playerElt.classList.add("player", "p-2", "rounded-lg");

        let playerName = document.createElement("span");
        playerName.id = `${player[1].token}-name`;
        playerName.textContent = player[0];


        // Affichage des vies sous forme de cœurs
        let heartList = document.createElement("ul");
        heartList.classList.add("flex", "space-x-1"); // On ajoute de l'espace entre les cœurs
        heartList.id = `${player[1].token}-lives`;
        // Afficher 3 cœurs, certains vides si le joueur a perdu des vies
        let lives = player[1].life;
        for (let i = 0; i < lives; i++) {
            let heart = document.createElement("li");
            heart.textContent = i < lives ? "❤️" : "🤍"; // Cœur plein si la vie est encore là, sinon cœur vide
            heart.classList.add("text-xl"); // Agrandir les cœurs
            heartList.appendChild(heart);
        }

        let proposition = document.createElement("p");
        proposition.id = `${player[1].token}-proposition`;
        // Ajouter la liste des cœurs à chaque joueur
        playerElt.appendChild(playerName);
        playerElt.appendChild(heartList);
        playerElt.appendChild(proposition);

        // Si le joueur est actif, il reste rouge
        if (player[1].token === currentActualPlayerToken) {
            playerName.classList.add("text-red-500", "font-bold");
        }

        // Si le joueur est déconnecté, on le rend transparent
        if (!player[1].connected) {
            playerElt.classList.add("opacity-70");
        }

        playerListElement.appendChild(playerElt);
    });
});


// Signal reçu lorsqu'un joueur a perdu une vie
socket.on('boum', (player)=>{
    let playerElement = document.getElementById(player.token);
    console.log("PLAYER ELEMENT", playerElement.children)
    let heartList = document.getElementById(`${player.token}-lives`);
    let propositionPlayer = document.getElementById(`${player.token}-proposition`);
    let playerName = document.getElementById(`${player.token}-name`);
    heartList.lastElementChild.remove();
    playerName.classList.remove("text-red-500", "font-bold");

    propositionPlayer.textContent = player.actualWord;
    // playerElement.children[0].lastElementChild.remove()
    // playerElement.children[1].textContent = player.actualWord
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
    let playerName = document.getElementById(`${playerToken}-name`);
    players.forEach(player => {
        // On enlève le style rouge et gras à tous les joueurs
        document.getElementById(`${player.id}-name`).classList.remove("text-red-500", "font-bold");
    });
    let actualPlayer = document.getElementById(playerToken);
    if(playerToken === token) {
        inputProposition.disabled = false;
    }else{
        inputProposition.disabled = true;
    }
    if (actualPlayer) {
        playerName.classList.add("text-red-500", "font-bold");
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

socket.on('game-over', (winner) => {
    console.log("Partie terminée ! Le gagnant est :", winner);
    let winnerElement = document.getElementById(winner.token);
    winnerElement.classList.add("text-green-500", "font-bold");
    inputProposition.disabled = true;
});
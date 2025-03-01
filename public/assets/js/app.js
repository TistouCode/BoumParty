// Fichier app.js

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
        playerElt.classList.add(
            "player",
            "player-card",
            "rounded-xl",
            "p-4",
            "flex",
            "flex-col",
            "items-center",
            "w-32"
        );
        playerElt.style = "background-color: var(--dark-light)";

        // Créer l'avatar (cercle avec initiale)
        let playerAvatar = document.createElement("div");
        playerAvatar.classList.add("w-14", "h-14", "rounded-full", "flex", "items-center", "justify-center", "text-xl", "font-bold", "mb-2");
        playerAvatar.style.backgroundColor = "var(--primary)";
        playerAvatar.textContent = player[0].charAt(0).toUpperCase(); // Première lettre du nom

        let playerName = document.createElement("span");
        playerName.id = `${player[1].token}-name`;
        playerName.textContent = player[0];
        playerName.classList.add(
            "font-medium"
        )
        playerName.style = "color: var(--text-secondary)";

        // Affichage des vies sous forme de cœurs
        let heartList = document.createElement("ul");
        heartList.classList.add("flex", "space-x-1", "my-2"); // On ajoute de l'espace entre les cœurs
        heartList.id = `${player[1].token}-lives`;
        // Afficher les cœurs en fonction des vies restantes
        let lives = player[1].life;
        for (let i = 0; i < lives; i++) {
            let heart = document.createElement("li");
            heart.textContent = "❤️";
            heart.classList.add("text-sm");
            heartList.appendChild(heart);
        }

        let proposition = document.createElement("p");
        proposition.id = `${player[1].token}-proposition`;
        proposition.classList.add("text-center", "mt-1", "text-sm", "w-full", "overflow-hidden", "text-ellipsis");

        // Ajouter tous les éléments à la carte du joueur
        playerElt.appendChild(playerAvatar);
        playerElt.appendChild(playerName);
        playerElt.appendChild(heartList);
        playerElt.appendChild(proposition);

        // Si le joueur est actif
        if (player[1].token === currentActualPlayerToken) {
            playerName.classList.add("text-red-500", "font-bold");
            playerElt.classList.add("active-player"); // Ajoute l'animation
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

    // Supprimer l'animation du joueur qui vient de perdre
    playerElement.classList.remove("active-player");

    propositionPlayer.textContent = player.actualWord;
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
        // On enlève l'animation de tous les joueurs
        player.classList.remove("active-player");
    });

    let actualPlayer = document.getElementById(playerToken);

    if(playerToken === token) {
        inputProposition.disabled = false;
    } else {
        inputProposition.disabled = true;
    }

    if (actualPlayer) {
        playerName.classList.add("text-red-500", "font-bold");
        actualPlayer.classList.add("active-player"); // Ajoute l'animation au joueur actif
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
    playerElement.classList.remove("active-player"); // S'assurer que le joueur mort n'a pas l'animation
})

socket.on('game-over', (winner) => {
    console.log("Partie terminée ! Le gagnant est :", winner);
    let winnerElement = document.getElementById(winner.token);
    winnerElement.classList.add("text-green-500", "font-bold");
    winnerElement.classList.remove("active-player"); // Retirer l'animation du gagnant

    // Créer un message de victoire
    let victoryMessage = document.createElement("div");
    victoryMessage.classList.add("absolute", "top-0", "left-0", "w-full", "h-full", "flex", "justify-center", "items-center", "z-20");
    victoryMessage.style.backgroundColor = "rgba(26, 26, 46, 0.8)";

    let messageContent = document.createElement("div");
    messageContent.classList.add("text-4xl", "font-bold", "p-8", "rounded-xl", "text-center");
    messageContent.style.color = "var(--primary-light)";
    messageContent.innerHTML = `🎉 ${document.getElementById(`${winner.token}-name`).textContent} a gagné ! 🎉`;

    victoryMessage.appendChild(messageContent);
    document.getElementById("divPlayer").appendChild(victoryMessage);

    inputProposition.disabled = true;
});

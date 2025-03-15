// Fichier app.js

// Récupérer le gameId depuis l'URL
const gameId = window.location.pathname.split('/').at(-2);
const token = window.location.pathname.split('/').at(-1);

// Connexion au serveur Socket.IO en envoyant le gameId
const socket = io(
    {
        query: {
            gameId: gameId,
            token: token
        },
        // path: `/${window.location.pathname.split('/').at(1)}/socket.io`
    }
);

let divPlayer = document.getElementById('divPlayer');
let userList = document.getElementById('userList');
let tabUsers = []
let timer = document.getElementById('timer');

const volumeSlider = document.getElementById("volumeSlider");
const volumeIcon = document.getElementById("volumeIcon");
const volumePercentage = document.getElementById("volumePercentage");

// Fonction pour mettre à jour le volume de tous les médias
function updateVolume(volume) {
    document.querySelectorAll("audio, video").forEach(media => {
        media.volume = volume;
    });

    volumePercentage.textContent = Math.round(volume * 100) + "%";
    console.log(volume)
    // Changer l’icône en fonction du volume
    if (volume == 0) {
        volumeIcon.textContent = "🔇"; // Muet
    } else if (volume < 0.5) {
        volumeIcon.textContent = "🔉"; // Volume bas
    } else {
        volumeIcon.textContent = "🔊"; // Volume normal
    }
}

// Écouteur sur la barre de volume
volumeSlider.addEventListener("input", () => {
    updateVolume(volumeSlider.value);
});

// Appliquer le volume au chargement de la page
updateVolume(volumeSlider.value);


socket.on('game-start', () => {
    console.log('La partie commence !');
    timer.classList.add('hidden');
});

let inputProposition = document.getElementById('inputProposition');
inputProposition.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        let proposition = inputProposition.value;
        socket.emit('proposition', proposition);
        inputProposition.value = '';
    }
    console.log("event : ", event.key)
    socket.emit('typing', event.key)


});

socket.on('typingKey', (data ) => { // data = [playerUuid, key]
    console.log("TYPING : ", data[0])
    let playerUuid = data[0];
    let key = data[1];
    let propositionPlayerInLive = document.getElementById(`${playerUuid}-proposition`);
    console.log(propositionPlayerInLive)
    console.log("UUID / ", playerUuid)
    propositionPlayerInLive.textContent += key;
})

socket.on('pre-game-timer', (timeLeft) => {
    timer.textContent = timeLeft;
});



// Signal reçu lorsqu'un mot est validé
socket.on('word', (word) => {
    console.log('Mot reçu :', word);
    let proposition = word[0];
    let validWord = word[1];
    let playerUuid = word[2];
    console.log("PLAYER WHO WRITE IS : ", playerUuid)
    let playerElementWhoWriteTheProposition = document.getElementById(playerUuid);
    let playerPropositionElement = document.getElementById(`${playerUuid}-proposition`);
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
        playerElt.id = player[1].uuid;    // On met le uuid en id pour identifier chaque joueur
        playerElt.classList.add(
            "player",
            "player-card",
            "rounded-xl",
            "p-2",
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
        playerName.id = `${player[1].uuid}-name`;
        playerName.textContent = player[0];
        playerName.classList.add(
            "font-medium"
        )
        playerName.style = "color: var(--text-secondary)";

        // Affichage des vies sous forme de cœurs
        let heartList = document.createElement("ul");
        heartList.classList.add("flex", "space-x-1", "my-2"); // On ajoute de l'espace entre les cœurs
        heartList.id = `${player[1].uuid}-lives`;
        // Afficher les cœurs en fonction des vies restantes
        let lives = player[1].life;
        for (let i = 0; i < lives; i++) {
            let heart = document.createElement("li");
            heart.textContent = "❤️";
            heart.classList.add("text-sm");
            heartList.appendChild(heart);
        }

        let proposition = document.createElement("p");
        proposition.id = `${player[1].uuid}-proposition`;
        proposition.classList.add("text-center", "mt-1", "text-sm", "w-full", "overflow-hidden", "text-ellipsis");

        // Ajouter tous les éléments à la carte du joueur
        playerElt.appendChild(playerAvatar);
        playerElt.appendChild(playerName);
        playerElt.appendChild(heartList);
        playerElt.appendChild(proposition);

        // Si le joueur est actif
        if (player[1].uuid === currentActualPlayerUuid) {
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
    const bombExplosionAudio = document.getElementById("bombExplosionAudio");
    bombExplosionAudio.play();
    let playerElement = document.getElementById(player.uuid);
    console.log("PLAYER ELEMENT", playerElement.children)
    let heartList = document.getElementById(`${player.uuid}-lives`);
    let propositionPlayer = document.getElementById(`${player.uuid}-proposition`);
    let playerName = document.getElementById(`${player.uuid}-name`);
    heartList.lastElementChild.remove();
    playerName.classList.remove("text-red-500", "font-bold");

    // Supprimer l'animation du joueur qui vient de perdre
    playerElement.classList.remove("active-player");

    propositionPlayer.textContent = player.actualWord;
})


// Stocker le joueur actif
let currentActualPlayerUuid = null;
socket.on('actual-player', (playerUuid) => {
    updateActualPlayer(playerUuid);
});

function updateActualPlayer(playerUuid) {
    let players = document.querySelectorAll('.player');
    let playerName = document.getElementById(`${playerUuid}-name`);
    console.log("PLAYERUUID", playerUuid)
    players.forEach(player => {
        // On enlève le style rouge et gras à tous les joueurs
        document.getElementById(`${player.id}-name`).classList.remove("text-red-500", "font-bold");
        // On enlève l'animation de tous les joueurs
        player.classList.remove("active-player");
    });

    let actualPlayer = document.getElementById(playerUuid);

    if (actualPlayer) {
        playerName.classList.add("text-red-500", "font-bold");
        actualPlayer.classList.add("active-player"); // Ajoute l'animation au joueur actif
    }
}


socket.on('you-are-current-player', (player) => {
    console.log("Vous êtes le joueur actif !");
    inputProposition.disabled = false;
    inputProposition.focus();
    console.log("YOU ARE CURRENT : ", player)
    currentActualPlayerUuid = player.uuid;
    updateActualPlayer(player.uuid);
})

socket.on('you-are-not-current-player', (player) => {
    console.log("Vous êtes pas le joueur actif !");
    inputProposition.value = '';
    inputProposition.disabled = true;
})


let sequence = document.getElementById('sequence');

socket.on('sequence', (seq) => {
    console.log("Séquence reçue :", seq);
    sequence.textContent = seq;
})

socket.on('timer', (time) => {
    timer.textContent = time;
})

socket.on('player-death', (player) => {
    console.log("Joueur mort :", player);
    let playerElement = document.getElementById(player.uuid);
    playerElement.classList.add("opacity-20");
    playerElement.classList.remove("active-player"); // S'assurer que le joueur mort n'a pas l'animation
})

socket.on('game-over', (winner) => {
    console.log("Partie terminée ! Le gagnant est :", winner);
    let winnerElement = document.getElementById(winner.uuid);
    winnerElement.classList.add("text-green-500", "font-bold");
    winnerElement.classList.remove("active-player"); // Retirer l'animation du gagnant

    // Créer un message de victoire
    let victoryMessage = document.createElement("div");
    victoryMessage.classList.add("absolute", "top-0", "left-0", "w-full", "h-full", "flex", "justify-center", "items-center", "z-20");
    victoryMessage.style.backgroundColor = "rgba(26, 26, 46, 0.8)";

    let messageContent = document.createElement("div");
    messageContent.classList.add("text-4xl", "font-bold", "p-8", "rounded-xl", "text-center");
    messageContent.style.color = "var(--primary-light)";
    messageContent.innerHTML = `🎉 ${document.getElementById(`${winner.uuid}-name`).textContent} a gagné ! 🎉`;

    victoryMessage.appendChild(messageContent);
    document.getElementById("divPlayer").appendChild(victoryMessage);

    inputProposition.disabled = true;
});

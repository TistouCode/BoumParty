// server.js - Serveur principal pour le jeu Bomb Party
const express = require('express');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const Boum = require('../public/game/game.js');


const { fileURLToPath } = require('url');
const dirname = path.dirname;

// Chargement du dictionnaire de mots français
const dictionary = fs.readFileSync('dictionary-fr.txt', 'utf8').split('\n');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);



app.use(express.urlencoded({ extended: true })); // Pour traiter les formulaires HTML
app.use(express.json()); // Pour traiter le JSON (si besoin)



// Configuration pour servir les fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));

// Si vous avez besoin d'accéder spécifiquement au dossier src pour output.css
app.use('/src', express.static(path.join(__dirname, '../src')));


// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Route pour la page de jeu
const games = new Map();



app.post('/:gameId/init', express.json(), (req, res) => {

    const gameId = req.params.gameId;
    const settings = req.body.settings;
    const players = req.body.players;
    // console.log(gameId)
    // console.log(players);
    // console.log(settings)
    try{

        games.set(gameId, new Boum(gameId, settings.bombDuration, settings.lifePerPlayer, players, false));
        res.status(200).json({
            success: true,
            message: "Game created"
        });
    }catch (e) {
        res.status(500).json({
            success: false,
            message: e.message
        });
    }

    // console.log(games.get(gameId));
    // console.log("score : ", games.get(gameId).scores);


});

app.get('/:gameId/:token', express.json(), (req, res) => {
    const gameId = req.params.gameId;
    const token = req.params.token;

    console.log("app.get / gameId : ", gameId);
    console.log("app.get / token : ", token);
    console.log("games : ", games.get(gameId));
    if(games.has(gameId)){
        console.log("game found")
        let playerFound = false;
        let playerUuid = '';
        games.get(gameId)._scores.forEach((playerData, playerName) => {
            if (playerData.token === token) {
                playerFound = true;
                playerUuid = token;
            }
        });
        if (playerFound) {
            console.log("player found")
            res.sendFile(path.join(__dirname, '../public', 'game.html'));
        }
        else {
            // Rediriger vers une page 403 si le token n'est pas trouvé
            res.redirect('/403');
        }
    }else{
        res.status(404).json({
            success: false,
            message: "Game not found"
        })
    }

});



io.on('connection', (socket) => {

    console.log('Un utilisateur s\'est connecté');
    const gameId = socket.handshake.query.gameId;
    const token = socket.handshake.query.token;


    console.log("gameId: ", gameId)
    console.log("token : ", token);
    if(!games.has(gameId)){
        console.log("game not found")
        return;
    }


    let currentGame = games.get(gameId);
    let pseudonyme = '';

    // Récupération du pseudonyme du joueur
    currentGame._scores.forEach((playerData, playerName) => {
        if (playerData.token === token) {
            pseudonyme = playerName;
            currentGame._scores.get(playerName).connected = true;
        }
    });
    // console.log("SCORE : ", currentGame._scores)

    socket.join(gameId);
    socket.username = pseudonyme;
    socket.emit('join', pseudonyme);

    io.to(gameId).emit('user-list', Array.from(currentGame._scores));

    // Envoyer immédiatement l'état du joueur actuel au nouvel utilisateur
    if (currentGame._actualPlayer) {
        socket.emit('actual-player', currentGame._actualPlayer.token);
        socket.emit('sequence', currentGame._currentSequence);
        // socket.emit('timer', currentGame._bombDuration);
    }

    // Lancer la partie uniquement si elle n'est pas en cours
    currentGame.startGame(io, gameId);

    // Envoyer l'état actuel au nouvel arrivant
    // socket.emit('actual-player', currentGame._actualPlayer.token);
    //



    // // Lancement de la partie
    // if(!currentGame._inGame){
    //
    //
    //     currentGame._inGame = true;
    //     console.log("DEBUT DE LA PARTIE")
    //     currentGame.drawActualPlayer();
    //     currentGame._actualPlayer.play = true;
    //     console.log("actualPlayer : ",  currentGame._actualPlayer);
    //     io.to(gameId).emit('game-start');
    //     io.to(gameId).emit('actual-player',  currentGame._actualPlayer.token);
    //     console.log("TOKEN : ",  currentGame._actualPlayer.token)
    //
    // }
    // // Éviter plusieurs setInterval
    // if (!currentGame.intervalRunning) {
    //     currentGame.intervalRunning = true;
    //     currentGame.interval = setInterval(() => {
    //         currentGame.drawActualPlayer();
    //         io.to(gameId).emit('actual-player', currentGame._actualPlayer.token);
    //     }, 3000);
    // }
    //


    // Envoie la séquence de lettres à tous les clients
    // games.get(gameId)._scores.forEach((playerData, playerName) => {
    //
    // }





    socket.on('message', (msg) => {
        console.log('Message reçu:', msg);
        io.emit('message', [msg, socket.id]); // Envoie le message à tous les clients
    });

    // Rejoindre la room de cette partie

    // Gérer la déconnexion
    socket.on('disconnect', () => {
        console.log(`${pseudonyme} s'est déconnecté`);

        // Marquer le joueur comme déconnecté
        if (currentGame._scores.has(pseudonyme)) {
            currentGame._scores.get(pseudonyme).connected = false;
        }

        // Informer les autres joueurs
        io.to(gameId).emit('user-list', Array.from(currentGame._scores));

        // NE PAS CHANGER DE JOUEUR ACTIF
        console.log("Le joueur reste actif même après sa déconnexion.");
    });



});


// Fonction pour tirer un joueur au hasard
function tirageAuHasardJoueur(map) {
    // Convertir la Map en tableau de clés
    const joueursCles = Array.from(map.keys());

    // Choisir un index aléatoire
    const indexHasard = Math.floor(Math.random() * joueursCles.length);

    // Obtenir la clé du joueur choisi
    const joueurChoisi = joueursCles[indexHasard];

    // Retourner la valeur (l'objet joueur)
    return map.get(joueurChoisi);
}



// Vérifie si un mot contient la séquence et est valide
function isValidWord(word, sequence, usedWords) {
    word = word.toLowerCase().trim();
    // Vérifier si le mot contient la séquence
    if (!word.includes(sequence.toLowerCase())) return false;
    // Vérifier si le mot est dans le dictionnaire
    if (!dictionary.includes(word)) return false;
    // Vérifier si le mot a déjà été utilisé
    if (usedWords.includes(word)) return false;
    return true;
}







// Démarrage du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Bomb Party démarré sur le port ${PORT}`);
});


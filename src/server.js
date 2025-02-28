// server.js - Serveur principal pour le jeu Bomb Party
const express = require('express');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const Boum = require('../public/game/game.js'); // Importer la classe Boum

const { fileURLToPath } = require('url'); // Pour obtenir le chemin du fichier
const dirname = path.dirname; // Pour obtenir le répertoire du fichier

// Chargement du dictionnaire de mots français
const dictionary = fs.readFileSync('dictionary-fr.txt', 'utf8').split('\n');

const app = express(); // Créer une application Express
const server = http.createServer(app); // Créer un serveur HTTP
const io = socketIo(server); // Créer une instance de Socket.IO



app.use(express.urlencoded({ extended: true })); // Pour traiter les formulaires HTML
app.use(express.json()); // Pour traiter le JSON (si besoin)



// Configuration pour servir les fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));

app.use('/src', express.static(path.join(__dirname, '../src')));




// Route pour la page de jeu
const games = new Map();



app.post('/:gameId/init', express.json(), (req, res) => {

    const gameId = req.params.gameId;
    const settings = req.body.settings;
    const players = req.body.players;
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
});

app.get('/:gameId/:token', express.json(), (req, res) => {
    const gameId = req.params.gameId;
    const token = req.params.token;

    if(games.has(gameId)){
        let playerFound = false;
        let playerUuid = '';
        games.get(gameId)._scores.forEach((playerData, playerName) => {
            if (playerData.token === token) {
                playerFound = true;
                playerUuid = token;
            }
        });
        if (playerFound) {
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

    socket.join(gameId);
    socket.username = pseudonyme;
    socket.emit('join', pseudonyme);

    io.to(gameId).emit('user-list', Array.from(currentGame._scores));

    // Envoyer immédiatement l'état du joueur actuel au nouvel utilisateur
    if (currentGame._actualPlayer) {
        socket.emit('actual-player', currentGame._actualPlayer.token);
        socket.emit('sequence', currentGame._currentSequence);
        socket.emit('timer', currentGame._timeLeft);
        socket.emit('word', currentGame._actualPlayer.actualWord);
        // socket.emit('timer', currentGame._bombDuration);
    }

    // Lancer la partie uniquement si elle n'est pas en cours
    currentGame.startGame(io, gameId);
    // Envoyer le mot à tous les clients

    // Gérer les propositions de mots
    socket.on('proposition', (proposition) => {
        console.log('Proposition reçue:', proposition);

        currentGame._actualPlayer.actualWord = proposition;
        let playerWhoWriteTheProposition = currentGame._actualPlayer;
        let validWord = false;
        // Vérifier si le mot est valide
        if (currentGame.isValidWord(proposition, currentGame._currentSequence, currentGame._usedWords)) {
            console.log('Mot valide !');

            // Ajouter le mot à la liste des mots utilisés
            currentGame._usedWords.push(proposition);
            currentGame._timeLeft += 2;
            // Ajouter le mot au joueur actif
            // currentGame._scores.get(currentGame._actualPlayer.username).words.push(proposition);
            validWord = true;
            // Changer de joueur
            currentGame.switchPlayer(io, gameId);
        } else {
            console.log('Mot invalide !');
        }
        console.log("JE RENVOIE A l'USER : ", [proposition, validWord, playerWhoWriteTheProposition.token])
        io.to(gameId).emit('word', [proposition, validWord, playerWhoWriteTheProposition.token]);
    })

    // socket.on('message', (msg) => {
    //     console.log('Message reçu:', msg);
    //     io.emit('message', [msg, socket.id]); // Envoie le message à tous les clients
    // });

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



// Démarrage du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Bomb Party démarré sur le port ${PORT}`);
});


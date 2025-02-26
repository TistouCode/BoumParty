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
app.use(express.static(path.join('public')));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour la page de jeu
const games = new Map();

io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté');
    const token = socket.handshake.query.token;
    const gameId = socket.handshake.query.gameId;
    console.log("token : ", token);
    console.log("gameId: ", gameId)
    socket.on('message', (msg) => {
        console.log('Message reçu:', msg);
        io.emit('message', [msg, socket.id]); // Envoie le message à tous les clients
    });

    socket.on('disconnect', () => {
        console.log('Un utilisateur s\'est déconnecté');
    });


});

app.post('/:gameId/init', express.json(), (req, res) => {

    const gameId = req.params.gameId;
    const settings = req.body.settings;
    const players = req.body.players;
    console.log(gameId)
    console.log(players);
    console.log(settings)
    try{

        games.set(gameId, new Boum(gameId, settings.timerDuration, settings.lifePerPlayer, players));
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

    console.log(games.get(gameId));
    console.log("score : ", games.get(gameId).scores);


});

app.get('/:gameId/:token', express.json(), (req, res) => {
    const gameId = req.params.gameId;
    const token = req.params.token;
    // Vérifier si la partie existe
    if (!games.has(gameId)) {
        res.redirect('/404');
        return;
    }

    // Vérifier si le token est valide en parcourant les joueurs
    let playerFound = false;
    let playerUuid = '';
    games.get(gameId)._scores.forEach((playerData, playerName) => {
        console.log(playerData)
        if (playerData.token === token) {
            playerFound = true;
            playerUuid = token;
        }
    });
    if (playerFound) {
        console.log("player found")
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    }
    else {
        // Rediriger vers une page 403 si le token n'est pas trouvé
        res.redirect('/403');
    }
});





// Génère une séquence de lettres aléatoire (2-3 lettres)
function generateSequence() {
    const vowels = 'aeiouy';
    const consonants = 'bcdfghjklmnpqrstvwxz';

    // Différentes stratégies pour générer des séquences jouables
    const strategies = [
        // Consonne + Voyelle
        () => {
            return consonants.charAt(Math.floor(Math.random() * consonants.length)) +
                vowels.charAt(Math.floor(Math.random() * vowels.length));
        },
        // Voyelle + Consonne
        () => {
            return vowels.charAt(Math.floor(Math.random() * vowels.length)) +
                consonants.charAt(Math.floor(Math.random() * consonants.length));
        },
        // Consonne + Voyelle + Consonne
        () => {
            return consonants.charAt(Math.floor(Math.random() * consonants.length)) +
                vowels.charAt(Math.floor(Math.random() * vowels.length)) +
                consonants.charAt(Math.floor(Math.random() * consonants.length));
        }
    ];

    // Choisir une stratégie aléatoire
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    return strategy();
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


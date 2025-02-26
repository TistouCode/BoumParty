// server.js - Serveur principal pour le jeu Bomb Party
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');


// Chargement du dictionnaire de mots français
const dictionary = fs.readFileSync('dictionary-fr.txt', 'utf8').split('\n');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);



app.use(express.urlencoded({ extended: true })); // Pour traiter les formulaires HTML
app.use(express.json()); // Pour traiter le JSON (si besoin)


// Configuration pour servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour la page de jeu
const games = new Map();

io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté');

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
    const data = req.body;
    console.log(data);
    games.set('data', data);

    res.status(200).send({ data: data });
});

app.get('/:gameId/:token', express.json(), (req, res) => {
    const gameId = req.params.gameId;
    const token = req.params.token;
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


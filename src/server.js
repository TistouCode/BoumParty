// server.js - Serveur principal pour le jeu BoumParty
// server.js - Serveur principal pour le jeu BoumParty
import express from 'express';
import fs from 'fs';
import config from '../config.json' with { type: 'json' };

import http from 'http';
import { Server as socketIo } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { Boum } from '../public/game/game.js'; // Importer la classe Boum

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); // Créer une application Express
const server = http.createServer(app); // Créer un serveur HTTP
const io = new socketIo(server); // Créer une instance de Socket.IO

import frenchWords from 'an-array-of-french-words/index.json' with {type: 'json'};

app.use(express.urlencoded({ extended: true })); // Pour traiter les formulaires HTML
app.use(express.json()); // Pour traiter le JSON (si besoin)

// Configuration pour servir les fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));
app.use('/src', express.static(path.join(__dirname, '../src')));


// Configuration pour servir les fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));

app.use('/src', express.static(path.join(__dirname, '../src')));



const games = new Map();

// Constantes uniques pour l'ensemble des parties
const MIN_PLAYERS = 1;
const MAX_PLAYERS = 10;

app.post('/:gameId/init', express.json(), (req, res) => {

    const gameId = req.params.gameId;
    const settings = req.body.settings;
    const players = req.body.players;
    const gameToken = req.body.token;


    if (players.length > MAX_PLAYERS) {
        res.status(409).json({
            success: false,
            message: 'Trop de joueurs pour la partie'
        });
        return;
    }
    if (players.length < MIN_PLAYERS) {
        res.status(409).json({
            success: false,
            message: 'Pas assez de joueurs pour la partie'
        });
        return;
    }
    try{
        games.set(gameId, new Boum(gameId, settings.bombDuration, settings.lifePerPlayer, players, false, gameToken));

        res.status(200).json({
            success: true,
            message: "Partie initialisée avec succès"
        });
    }catch (e) {
        res.status(500).json({
            success: false,
            message: e.message
        });
    }
});

// Route d'erreur 404 (page introuvable)
app.get('/404', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', '404.html'));
});

// Route d'erreur 403 (accès interdit)
app.get('/403', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', '403.html'));
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
    const gameId = socket.handshake.query.gameId;
    const token = socket.handshake.query.token;

    if (!games.has(gameId)) {
        return;
    }


    let currentGame = games.get(gameId);
    let pseudonyme = '';

    // Récupération du pseudonyme du joueur
    currentGame._scores.forEach((playerData, playerName) => {
        if (playerData.token === token) {
            pseudonyme = playerName;
            currentGame._scores.get(playerName).connected = true;
            currentGame._scores.get(playerName).socketId = socket.id;
        }
    });

    socket.join(gameId);
    socket.username = pseudonyme;
    socket.emit('join', pseudonyme);



    io.to(gameId).emit('user-list', {
        tabPlayers: Array.from(currentGame._scores),
        inGame: currentGame._inGame
    });


    // Envoyer immédiatement l'état du joueur actuel au nouvel utilisateur
    if (currentGame._actualPlayer) {
        console.log("actual-player")
        socket.emit('actual-player', currentGame._actualPlayer.uuid);
        socket.emit('sequence', currentGame._currentSequence);
        // socket.emit('timer', currentGame._timeLeft);
        socket.emit('word', currentGame._actualPlayer.actualWord);
        // socket.emit('timer', currentGame._bombDuration);
    }

    // Lancer la partie uniquement si elle n'est pas en cours
    currentGame.startGame(io, gameId);

    // Gérer les propositions de mots
    socket.on('proposition', async (proposition) => {
        // //console.log('Proposition reçue:', proposition);

        currentGame._actualPlayer.actualWord = proposition;
        let playerWhoWriteTheProposition = currentGame._actualPlayer;
        let validWord = false;

        // Vérifier si le mot est valide
        currentGame._actualPlayer._alreadyPutAProposition = true;
        // resProposition = [bool, natureWord, URlWord]
        let resProposition = await currentGame.isValidWord(proposition, currentGame._currentSequence, currentGame._usedWords, io, gameId);
        if (resProposition[0]) {

            // Ajouter le mot à la liste des mots utilisés
            currentGame._usedWords.push(proposition);
            currentGame._timeLeft += 3;
            // Ajouter le mot au joueur actif
            validWord = true;
            // Changer de joueur
            // //console.log("JE RENVOIE A l'USER : ", [proposition, validWord, playerWhoWriteTheProposition.uuid, resProposition[1], resProposition[2]])
            io.to(gameId).emit('word', [proposition, validWord, playerWhoWriteTheProposition.uuid, resProposition[1], resProposition[2]]);
            currentGame.switchPlayer(io, gameId);

        } else {
            // //console.log('Mot invalide !');
            validWord = false
            // //console.log("JE RENVOIE A l'USER : ", [proposition, validWord, playerWhoWriteTheProposition.uuid])
            io.to(gameId).emit('word', [proposition, validWord, playerWhoWriteTheProposition.uuid]);
        }

    })

    socket.on('typing', (key) => {
        io.to(gameId).emit('typingKey', {
            playerUuid: currentGame._actualPlayer.uuid,
            key: key,
            alreadyPutAProposition: currentGame._actualPlayer._alreadyPutAProposition
        });
    })

    socket.on('infoAboutAlreadyPutAProposition', (alreadyPutAProposition) => {
      currentGame._actualPlayer._alreadyPutAProposition = alreadyPutAProposition;
    })

    // Gérer la déconnexion
    socket.on('disconnect', () => {
        // //console.log(`${pseudonyme} s'est déconnecté`);

        // Marquer le joueur comme déconnecté
        if (currentGame._scores.has(pseudonyme)) {
            currentGame._scores.get(pseudonyme).connected = false;
        }

        // Informer les autres joueurs
        io.to(gameId).emit('user-list', {
            tabPlayers: Array.from(currentGame._scores),
            inGame: currentGame._inGame

        });

        // NE PAS CHANGER DE JOUEUR ACTIF
        //console.log("Le joueur reste actif même après sa déconnexion.");
    });
    socket.on('game-over-delete-game', ()=>{
        games.delete(gameId);
        console.log("Partie Supprimer")
    })
});



// Démarrage du serveur
const PORT = config.PORT;
server.listen(PORT, () => {
    ////console.log(`Serveur Bomb Party démarré sur le port ${PORT}`);
});


import fs from 'fs';
import config from '../../config.json' with {type: 'json'};
import frenchWords from 'an-array-of-french-words/index.json' with {type: 'json'};

let indexJoueur = Math.floor(Math.random() * 1000) % 3;

// Fichier game.js

/**
 * @brief Classe représentant une partie de Boum Party
 * @details Cette classe gère le déroulement d'une partie de Boum Party
 */

export class Boum {

    /**
     * @brief Constructeur de la classe Boum
     * @param id Identifiant de la partie
     * @param bombDuration Durée de la bombe (en secondes)
     * @param lifePerPlayer Nombre de vies par joueur
     * @param players Liste des joueurs
     * @param inGame Indique si la partie est en cours
     * @param gameToken Token de la partie
     */
    constructor(id, bombDuration = 5, lifePerPlayer = 3, players = [], inGame = false, gameToken) {
        this._id = id;
        this._scores = new Map();
        this._bombDuration = bombDuration;
        this._lifePerPlayer = lifePerPlayer;
        this._inGame = inGame; // Indique si la partie est en cours
        this._actualPlayer = null; // Joueur actuel
        this._interval = null; // Stocke le setInterval
        this._intervalRunning = false; // Vérifie si le timer tourne
        this._currentSequence = null; // Séquence actuelle
        this._usedWords = []; // Mots déjà utilisés
        this._timeLeft = 0; // Temps restant pour le joueur actuel
        this._gameToken = gameToken; // Token de la partie
        this._currentPlayerSocketId = null;
        // Initialisation des joueurs
        players.forEach(player => this.addPlayer(player));
    }

    get scores() {
        return this._scores;
    }

    set scores(value) {
        this._scores = value;
    }

    /**
     * @brief Ajoute un joueur à la partie
     * @param player Joueur à ajouter
     */
    addPlayer(player) {
        this._scores.set(player.username, {
            uuid: player.uuid,
            token: player.token,
            score: 0,
            life: this._lifePerPlayer,
            play: false,
            connected: false,
            live: true,
            actualWord: '',
        });
    }

    /**
     * @brief Définit le premier joueur de la partie
     * @details Le premier joueur est choisi aléatoirement parmi les joueurs en vie
     */
    defineFirstPlayer() {
        let alivePlayers = Array.from(this._scores.values()).filter(player => player.live === true);
        let indexJoueur = Math.floor(Math.random() * 1000) % alivePlayers.length;
        let firstPlayer = alivePlayers[indexJoueur];
        this._actualPlayer = firstPlayer;
    }

    /**
     * @brief Tire un joueur au hasard
     * @details Tire un joueur au hasard parmi les joueurs en vie
     */
    drawActualPlayer() {
        // Filtrer les joueurs qui sont encore en vie
        let alivePlayers = Array.from(this._scores.values()).filter(player => player.live === true);
        indexJoueur++;
        // Si il y a des joueurs vivants
        if (alivePlayers.length > 0) {
            // Tirer au hasard un joueur parmi les vivants
            let actualPlayer = alivePlayers[indexJoueur % alivePlayers.length];
            this._actualPlayer = actualPlayer;
            return actualPlayer;
        } else {
            console.log("Aucun joueur en vie !");
            return null; // Retourne null si aucun joueur n'est vivant
        }
    }

    /**
     * @brief Change de joueur et informe les clients
     * @param io Objet de communication avec Socket.IO
     * @param gameId Identifiant de la partie
     */
    switchPlayer(io, gameId) {
        this.drawActualPlayer();
        this._currentSequence = this.generateSequence();
        io.to(gameId).emit('sequence', this._currentSequence);

        if (this._currentPlayerSocketId != null) {
            io.to(this._currentPlayerSocketId).emit('you-are-not-current-player', this._actualPlayer.uuid);
        }
        io.to(gameId).emit('actual-player', this._actualPlayer.uuid);

        this._currentPlayerSocketId = this._actualPlayer.socketId
        console.log("Joueur actuel :", this._currentPlayerSocketId);
        io.to(this._currentPlayerSocketId).emit('you-are-current-player', this._actualPlayer.uuid);
    }

    /**
     * @brief Démarre la partie si elle n'est pas déjà en cours
     * @param io Objet de communication avec Socket.IO
     * @param gameId Identifiant de la partie
     * @details Cette méthode démarre la partie si elle n'est pas déjà en cours
     */
    startGame(io, gameId) {
        if (!this._inGame) {
            this._inGame = true;
            console.log("DÉBUT DE LA PARTIE");

            // Start the pre-game timer
            this.startPreGameTimer(io, gameId);
        } else {
            console.log("PARTIE DÉJÀ EN COURS");
        }
    }

    /**
     * @brief Démarre le timer pour le pré-jeu
     * @param io Objet de communication avec Socket.IO
     * @param gameId Identifiant de la partie
     * @details Cette méthode démarre un timer de 10 secondes avant le début de la partie
     */
    startPreGameTimer(io, gameId) {
        let preGameTimeLeft = 10;
        const preGameInterval = setInterval(() => {
            io.to(gameId).emit('pre-game-timer', preGameTimeLeft);
            preGameTimeLeft--;

            if (preGameTimeLeft < 0) {
                clearInterval(preGameInterval);

                this.defineFirstPlayer()
                this.switchPlayer(io, gameId);
                this._actualPlayer.play = true;
                io.to(gameId).emit('game-start');
                io.to(gameId).emit('actual-player', this._actualPlayer.uuid);

                this.startTimer(io, gameId);
            }
        }, 1000);
    }

    /**
     * @brief Démarre le timer pour changer de joueur
     * @param io Objet de communication avec Socket.IO
     * @param gameId Identifiant de la partie
     * @details Cette méthode démarre un timer de 5 secondes pour changer de joueur
     */
    startTimer(io, gameId) {
        if (!this._intervalRunning) {
            this._intervalRunning = true;
            this._timeLeft = this._bombDuration;
            this._interval = setInterval(() => {

                this._timeLeft--;

                // CHRONO
                io.to(gameId).emit('timer', this._timeLeft);
                if (this._timeLeft === 0) {
                    this._actualPlayer.life--;
                    if (this._actualPlayer.life <= 0) {
                        // Supprimer le joueur de _scores par son username
                        this._actualPlayer.live = false;
                        io.to(gameId).emit('player-death', this._actualPlayer);

                        // Vérifie s'il ne reste qu'un seul joueur en vie
                        let alivePlayers = Array.from(this._scores.values()).filter(player => player.live === true);
                        if (alivePlayers.length === 1) {
                            io.to(gameId).emit('boum', this._actualPlayer);
                            this.endGame(io, gameId);
                            return; // Stoppe l'exécution du timer
                        }
                    }
                    io.to(gameId).emit('boum', this._actualPlayer);
                    this.switchPlayer(io, gameId);
                    this._timeLeft = this._bombDuration;
                    io.to(gameId).emit('sequence', this._currentSequence);
                }
            }, 1000);
        }


    }

    /**
     * @brief Arrête le jeu et le timer
     * @param io Objet de communication avec Socket.IO
     * @param gameId Identifiant de la partie
     * @details Cette méthode arrête le jeu et le timer
     */
    async endGame(io, gameId) {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
            this._intervalRunning = false;
        }
        let alivePlayers = Array.from(this._scores.values()).filter(player => player.live === true);
        let results = {}
        let winner = alivePlayers[0]
        let winnerUuid = winner.uuid;
        let isWinner = false;
        this._scores.forEach(player => {
            if (player.uuid == winnerUuid) {
                isWinner = true;
            } else {
                isWinner = false;
            }
            results[player.uuid] = {
                token: player.token,
                winner: isWinner,
            }
        });
        this._inGame = false;
        io.to(gameId).emit('game-over', winner); // Envoie le gagnant
        try {
            let request = new FormData();
            request.append('token', this._gameToken);
            request.append('results', JSON.stringify(results));

            const response = await fetch(`${config.URL_COMUS}/game/${this._id}/end`, {
                method: 'POST',
                body: request
            });

            const responseText = await response.text();
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (error) {
                throw new Error(`Invalid JSON response: ${responseText}`);
            }

            if (!responseData.success) {
                throw new Error(responseData.message);
            }

            console.log(`Résultat de la partie ${this._id} envoyé au serveur de Comus Party avec succès`);
            setTimeout(() => {
                io.to(gameId).emit('redirect', {
                    url: `${config.URL_COMUS}`,
                });
            }, 5000)
            return true;
        } catch (error) {
            console.error(`Erreur lors de l'envoi du résultat de la partie ${this._id} au serveur de Comus Party:`, error);
            return false;
        }
    }

    /**
     * @brief Génère une séquence de lettres aléatoire
     * @details Cette méthode génère une séquence de lettres aléatoire
     * @returns {string}
     */
    generateSequence() {
        const commonVowels = 'aeiou';
        const commonConsonants = 'bcdfghjklmnpqrst';

        // Bigrammes courants en français
        const frequentBigrams = ['ou', 'on', 'ai', 'en', 'an', 'et', 'er', 'in'];

        // Stratégies simplifiées
        const strategies = [
            // Utiliser un bigramme fréquent
            () => frequentBigrams[Math.floor(Math.random() * frequentBigrams.length)],

            // Consonne + Voyelle (fréquent)
            () => commonConsonants.charAt(Math.floor(Math.random() * commonConsonants.length)) +
                commonVowels.charAt(Math.floor(Math.random() * commonVowels.length)),

            // Consonne + Voyelle + Consonne (mais avec des lettres courantes)
            () => commonConsonants.charAt(Math.floor(Math.random() * commonConsonants.length)) +
                commonVowels.charAt(Math.floor(Math.random() * commonVowels.length)) +
                commonConsonants.charAt(Math.floor(Math.random() * commonConsonants.length))
        ];

        // Choisir une stratégie aléatoire
        const strategy = strategies[Math.floor(Math.random() * strategies.length)];
        return strategy();
    }

    /**
     * @brief Vérifie si un mot est valide
     * @details Cette méthode vérifie si un mot est valide
     * @param word Mot à vérifier
     * @param sequence Séquence à respecter
     * @param usedWords Mots déjà utilisés
     * @returns {Promise<(boolean|*)[]|boolean>} Renvoie true si le mot est valide, false sinon
     */
    async isValidWord(word, sequence, usedWords) {
        word = word.toLowerCase().trim();
        // Vérifier si le mot contient la séquence
        if (sequence) {
            if (word.includes(sequence.toLowerCase()) === false) {
                return false;
            }
        }

        let dataVerifMot = await this.verifierMot(word);
        if (dataVerifMot[0] === false || dataVerifMot === false) {
            return false
        }

        // Vérifier si le mot a déjà été utilisé
        if (usedWords.includes(word)) {
            return false;
        }
        return [true, dataVerifMot[1], dataVerifMot[2]]
    }

    /**
     * @brief Vérifie si un mot est correct
     * @details Cette méthode vérifie si un mot est correct en consultant le dictionnaire de l'Académie française
     * @param mot Mot à vérifier
     * @returns {Promise<(boolean|*)[]|boolean>} Renvoie true si le mot est correct, false sinon
     */

    async verifierMot(mot) {

        console.log("HAHAHAHAHAHHAHAH")

        // URL du dictionnaire de l'Académie française (page de recherche)
        const url = "https://www.dictionnaire-academie.fr/search";

        // Construction des données du formulaire
        const formData = new URLSearchParams();
        formData.append('term', mot);
        formData.append('options', '1'); // 9e édition du dictionnaire

        // Configuration de la requête POST
        const options = {
            method: 'POST',
            headers: new Headers({
                'Accept': 'application/json',
            }),
            body: formData,
            // Ne pas définir Content-Type pour FormData (le navigateur le fait automatiquement)
        };
        // Envoi de la requête
        const response = await fetch(url, options);
        const responseData = await response.json();
        if (responseData.result.length > 0) {
            const result = responseData.result[0];
            let scoreBrut = result.score;
            if (scoreBrut > 0.95) {
                return [true, result.nature, result.url];
            }
        }
        if (frenchWords.includes(mot)) {
            return true
        } else {
            return false
        }
    }
}


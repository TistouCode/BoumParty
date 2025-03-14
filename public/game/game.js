import fs from 'fs';
import config from '../../config.json' with {type: 'json'};


let indexJoueur =  Math.floor(Math.random() * 1000) % 3;
// Fichier game.js
export class Boum {
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

    defineFirstPlayer(){
        let alivePlayers = Array.from(this._scores.values()).filter(player => player.live === true);
        let indexJoueur =  Math.floor(Math.random() * 1000) % alivePlayers.length;
        let firstPlayer = alivePlayers[indexJoueur];
        this._actualPlayer = firstPlayer;
    }
    /**
     * @brief Tire un joueur au hasard
     */
    drawActualPlayer() {
        // Filtrer les joueurs qui sont encore en vie
        let alivePlayers = Array.from(this._scores.values()).filter(player => player.live === true);
        indexJoueur++;
        // Si il y a des joueurs vivants
        if (alivePlayers.length > 0) {
            // Tirer au hasard un joueur parmi les vivants
            let actualPlayer = alivePlayers[indexJoueur%alivePlayers.length];
            this._actualPlayer = actualPlayer;
            return actualPlayer;
        } else {
            console.log("Aucun joueur en vie !");
            return null; // Retourne null si aucun joueur n'est vivant
        }
    }

    switchPlayer(io, gameId) {
        this.drawActualPlayer();
        this._currentSequence = this.generateSequence();
        io.to(gameId).emit('sequence', this._currentSequence);

        if (this._currentPlayerSocketId != null) {
            io.to(this._currentPlayerSocketId).emit('you-are-not-current-player', this._actualPlayer);
        }
        io.to(gameId).emit('actual-player', this._actualPlayer.uuid);

        this._currentPlayerSocketId = this._actualPlayer.socketId
        console.log("Joueur actuel :", this._currentPlayerSocketId);
        io.to(this._currentPlayerSocketId).emit('you-are-current-player', this._actualPlayer);
    }

    /**
     * @brief Démarre la partie si elle n'est pas déjà en cours
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


    startPreGameTimer(io, gameId) {
        let preGameTimeLeft = 3;
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
                    console.log("BOUM")
                    this._actualPlayer.life--;
                    if (this._actualPlayer.life <= 0) {
                        console.log("LE JOUEUR EST MORT : ", this._actualPlayer);
                        // Supprimer le joueur de _scores par son username
                        this._actualPlayer.live = false;
                        io.to(gameId).emit('player-death', this._actualPlayer);

                        // Vérifie s'il ne reste qu'un seul joueur en vie
                        let alivePlayers = Array.from(this._scores.values()).filter(player => player.live === true);
                        if (alivePlayers.length === 1) {
                            console.log("FIN DE LA PARTIE");

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
     * @brief Change de joueur et informe les clients
     */

    /**
     * @brief Arrête le jeu et le timer
     */
    async endGame(io, gameId) {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
            this._intervalRunning = false;
        }
        let alivePlayers = Array.from(this._scores.values()).filter(player => player.live === true);
        console.log(alivePlayers)
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
        console.log(results);
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
            return true;
        } catch (error) {
            console.error(`Erreur lors de l'envoi du résultat de la partie ${this._id} au serveur de Comus Party:`, error);
            return false;
        }
    }

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

    async isValidWord(word, sequence, usedWords) {
        word = word.toLowerCase().trim();
        // Vérifier si le mot contient la séquence
        if (sequence) {
            if (word.includes(sequence.toLowerCase()) === false) {
                return false;
            }
        }

        if (await this.verifierMot(word) === false) {
            console.log("verifierMot BON");
            return false;
        }
        // Vérifier si le mot a déjà été utilisé
        if (usedWords.includes(word)) {
            return false;
        }
        console.log("LE MOT EST CORRECT");
        return true;
    }

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

        // if (!response.ok) {
        //     throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
        // }

        const responseData = await response.json();
        console.log("ResponseData : ", responseData)
        console.log("TAILLE Res : ", responseData.result.length)
        if (responseData.result.length > 0) {
            const result = responseData.result[0];

            console.log("Resultat : ", result)
            console.log("SCOREBrut : ", result.score)
            let scoreBrut = result.score;
            let scoreWord = parseInt(scoreBrut, 10);
            console.log("SCOREparse : ", scoreWord)
            if (scoreBrut > 0.95) {
                console.log("Le mot est bon")
                return true;
            } else {
                console.log("Le mot est mauvais")
                return false;
            }
        }else{
            console.log("Le mot est pas bon")
            return false
        }
        // if (contentType && contentType.includes('application/json')) {
        //     // Si la réponse est JSON
        //     resultat = await response.json();
        // }
        // console.log("Resultat : ", resultat)
        // return resultat;


    }
}


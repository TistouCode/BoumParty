class Boum {
    constructor(id, bombDuration = 2, lifePerPlayer = 3, players = [], inGame = false) {
        this._id = id;
        this._scores = new Map();
        this._bombDuration = bombDuration;
        this._lifePerPlayer = lifePerPlayer;
        this._inGame = inGame; // Indique si la partie est en cours
        this._actualPlayer = null; // Joueur actuel
        this._interval = null; // Stocke le setInterval
        this._intervalRunning = false; // Vérifie si le timer tourne
        this._currentSequence = null; // Séquence actuelle

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
            connected: false
        });
    }

    /**
     * @brief Tire un joueur au hasard
     */
    drawActualPlayer() {
        let players = Array.from(this._scores.values());
        let actualPlayer = players[Math.floor(Math.random() * players.length)];
        this._actualPlayer = actualPlayer;
        return actualPlayer;
    }

    /**
     * @brief Démarre la partie si elle n'est pas déjà en cours
     */
    startGame(io, gameId) {
        if (!this._inGame) {
            this._inGame = true;
            console.log("DÉBUT DE LA PARTIE");

            this.drawActualPlayer();
            this._actualPlayer.play = true;
            io.to(gameId).emit('game-start');
            io.to(gameId).emit('actual-player', this._actualPlayer.token);

            this.startTimer(io, gameId);
        } else {
            console.log("PARTIE DÉJÀ EN COURS");
        }
    }

    /**
     * @brief Démarre le timer pour changer de joueur
     */
    startTimer(io, gameId) {
        if (!this._intervalRunning) {
            this._intervalRunning = true;
            this._interval = setInterval(() => {
                this.switchPlayer(io, gameId);
                this._currentSequence = this.generateSequence();
                io.to(gameId).emit('sequence', this._currentSequence);
            }, this._bombDuration*1000);
        }
    }

    /**
     * @brief Change de joueur et informe les clients
     */
    switchPlayer(io, gameId) {
        this.drawActualPlayer();
        io.to(gameId).emit('actual-player', this._actualPlayer.token);
    }

    /**
     * @brief Arrête le jeu et le timer
     */
    stopGame() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
            this._intervalRunning = false;
        }
        this._inGame = false;
    }

    generateSequence() {
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

}

module.exports = Boum;

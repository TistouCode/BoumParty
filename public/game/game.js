
/**
 * @brief Classe Quiz
 * @details Classe permettant de gérer une partie de quiz
 */
export class Boum {

    /**
     * @brief Constructeur de la classe Boum
     * @param id Identifiant de la partie
     * @param nbRounds Nombre de manches
     * @param duration Durée d'une manche
     * @param players Liste des joueurs
     */
    constructor(id, nbRounds = 5, duration = 30, players = []) {
        this._id = id;                          // Identifiant de la partie
        this._currentRound = 0;                 // Numéro de la manche actuelle
        this._currentPersonality = null;        // Personnalité de la manche actuelle
        this._isRoundActive = false;            // Indique si une manche est en cours
        this._nbRounds = nbRounds;               // Nombre de manches
        this._usedPersonalities = new Set();    // Personnalités déjà utilisées au cours de la partie
        this._scores = new Map();               // Scores et autres informations à propos des participants
        this._roundDuration = duration;         // Durée d'une manche
        this._timeLeft = duration;              // Temps restant dans la manche actuelle

        // Initialisation des joueurs
        players.forEach(player => this.addPlayer(player));
    }

    get currentRound() {
        return this._currentRound;
    }

    set currentRound(value) {
        this._currentRound = value;
    }

    get scores() {
        return this._scores;
    }

    set scores(value) {
        this._scores = value;
    }

    get currentPersonality() {
        return this._currentPersonality;
    }

    set currentPersonality(value) {
        this._currentPersonality = value;
    }

    get isRoundActive() {
        return this._isRoundActive;
    }

    set isRoundActive(value) {
        this._isRoundActive = value;
    }

    get timeLeft() {
        return this._timeLeft;
    }

    set timeLeft(value) {
        this._timeLeft = value;
    }

    get roundDuration() {
        return this._roundDuration;
    }

    set roundDuration(value) {
        this._roundDuration = value
    }

    /**
     * @brief Ajoute un joueur à la partie
     * @param player Joueur à ajouter
     */
    addPlayer(player) {
        this._scores.set(player.username, {
            uuid: player.uuid,      // Identifiant unique du joueur
            token: player.token,    // Token unique pour identifier le joueur dans la partie
            score: 0,               // Score du joueur
            connected: false        // Indique si le joueur est connecté
        });
    }
}
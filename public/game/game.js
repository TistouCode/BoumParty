
/**
 * @brief Classe Quiz
 * @details Classe permettant de gérer une partie de quiz
 */
class Boum {

    /**
     * @brief Constructeur de la classe Boum
     * @param id Identifiant de la partie
     * @param nbRounds Nombre de manches
     * @param duration Durée d'une manche
     * @param players Liste des joueurs
     */
    constructor(id, bombDuration = 6, lifePerPlayer = 3, players = []) {
        this._id = id;                          // Identifiant de la partie
        this._scores = new Map();
        this._timerDuration = bombDuration;
        this._lifePerPlayer = lifePerPlayer;
        this._inGame = false;                   // Indique si la partie est en cours
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
            uuid: player.uuid,      // Identifiant unique du joueur
            token: player.token,    // Token unique pour identifier le joueur dans la partie
            score: 0,               // Score du joueur
            life: this._lifePerPlayer, // Nombre de vies rest
            play: false,          // Indique si le joueur a déjà joué
            connected: false        // Indique si le joueur est connecté
        });
    }
}
module.exports = Boum;
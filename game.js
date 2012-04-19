function Games(){
    this.players = {};
    this.runningGames = {};
    this.openGames = {};
    this.join = function(data){
        if(Object.keys(this.openGames).length){
            gameToJoin = Object.keys(this.openGames)[0];
        } else {
            gameToJoin = this.create();
        }
        this.openGames[gameToJoin]['players'].push(data.playerId);
        var gameStart = this.openGames[gameToJoin]['players'].length                         
                     >= this.openGames[gameToJoin]['numPlayers'];
        if(gameStart){
            this.start(gameToJoin);
        }
        this.players[data.playerId] = gameToJoin;

        return {"game": this.openGames[gameToJoin]['players'], 
                "room": gameToJoin,
                "start": gameStart};
    }
    this.create = function(){
        var randomId = (Math.random() + "").slice(2);
        this.openGames[randomId] = {'players':[], 'numPlayers': 2};
        return randomId;
    }
    this.start = function(gameId){
        this.runningGames[gameId] = this.openGames[gameId];
        delete this.openGames[gameId];
    }
    this.move = function(data){
        return data.direction;
    }
}

exports.games = new Games;

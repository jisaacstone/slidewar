function Games(){
    this.players = {};
    this.allGames = [];
    this.openGames = {};
    this.join = function(data){
        if(Object.keys(this.openGames).length){
            gameToJoin = Object.keys(this.openGames)[0];
        } else {
            gameToJoin = this.create();
        }
        this.openGames[gameToJoin]['players'].push(data.playerId);
        this.players[data.playerId] = gameToJoin;

        return {"game": this.openGames[gameToJoin]['players'], "room": gameToJoin};
    }
    this.create = function(){
        var randomId = (Math.random() + "").slice(2);
        this.openGames[randomId] = {'players':[]};
        this.allGames.push(randomId);
        return randomId;
    }

}

exports.games = new Games;

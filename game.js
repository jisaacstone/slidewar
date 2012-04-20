function Games(){
    this.players = {};
    this.runningGames = {};
    this.openGames = {};
    this.defaultSettings = {
        numPlayers: 2,
        tiles: [
            "one",      
        ],
    };
    this.join = function(data){
        if(Object.keys(this.openGames).length){
            gameToJoin = Object.keys(this.openGames)[0];
        } else {
            gameToJoin = this.create({});
        }
        this.openGames[gameToJoin].players.push(data.playerId);
        var gameStart = this.openGames[gameToJoin].players.length                         
                     >= this.openGames[gameToJoin].settings.numPlayers;

        if(gameStart){
            this.runningGames[gameToJoin] = this.openGames[gameToJoin];
            delete this.openGames[gameToJoin];
        }

        this.players[data.playerId] = gameToJoin;

        return {gameId: gameToJoin, 
                room: gameToJoin,
                start: gameStart};
    }
    this.create = function(data){
        var settings = 'settings' in data ? data.settings : this.defaultSettings;
        var randomId = (Math.random() + "").slice(2);
        this.openGames[randomId] = new Game(randomId, settings); 
        return randomId;
    }
    this.start = function(gameId){
        return this.runningGames[gameId].start();
    }
}

function Game(id, settings){
    this.id = id;
    this.settings = settings;
    this.players = [];
    this.playerTiles = {};
    this.tiles = {};
    this.move = function(data){                                                 
        return data.direction;                                                  
    }                                                                           
    this.activate = function(data){                                             
                                                                                
    }    
    this.start = function(){
        for(var playerId in this.players){
            this.playerTiles[playerId] = []
            for(var tileClass in this.settings.tiles){
                var tileId = (Math.random() + "").slice(2);
                this.tiles[tileId] = new Tile(tileId, playerId, tileClass);
                this.playerTiles[playerId].push(this.tiles[tileId]);
            }        
        }
        return this.playerTiles;
    }
}

function Tile(id, owner, tileClass){
    this.id = id;
    this.owner = owner;
    this.tileClass = tileClass;
}

exports.games = new Games;

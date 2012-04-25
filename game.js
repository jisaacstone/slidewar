function Games(){
    this.players = {};
    this.runningGames = {};
    this.openGames = {};
    this.defaultSettings = {
        numPlayers: 2,
        width: 5,
        height: 5,
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
        this.grid = new Grid(this.map);
        return this.runningGames[gameId].start();
    }
}

function Game(id, settings){
    this.id = id;
    this.settings = settings;
    this.players = [];
    this.playerTiles = {};
    this.tiles = {};
    this.map = defaultMap;

    this.start = function(){
        var tileData = [];
        for(var i in this.players){
            var playerId = this.players[i];
            this.playerTiles[playerId] = [];
            for(var j in this.settings.tiles){
                var tileClass = this.settings.tiles[j];
                var tileId = (Math.random() + "").slice(2);
                this.tiles[tileId] = new Tile(tileId, playerId, tileClass);
                this.tiles[tileId].x = -1 + (i * (this.settings.width+2)); 
                this.tiles[tileId].y = +j;
                this.playerTiles[playerId].push(this.tiles[tileId]);
                tileData.push({id: tileId, x: this.tiles[tileId].x, y: this.tiles[tileId].y});
            }        
        }
        return [tileData, this.playerTiles];
    }

    this.activate = function(data){                                             
        var tile = this.tiles[data.tileId];
        if(tile.owner != data.playerId){
            throw new Error("attempting to activate unowned tile!");
        }
        if ( ! tile.active){
            tile.active = true;
            for(var i in this.players) {
                console.log(this.players[i]);
                if(this.players[i] === data.playerId) {
                    var startPos = this.map.start[i];
                }
            }
            console.log(startPos);
            if(this.isOpen(startPos.x, startPos.y)){
                tile.x = startPos.x;
                tile.y = startPos.y;

                return {
                    tile: data.tileId,
                    method: "activate",
                    args: startPos
                };
            }
        }
        return false;
    }    

    this.move = function(data){                                                 
        var tile = this.tiles[data.tileId];
        if(tile.owner != data.playerId){
            throw new Error("attempting to move unowned tile!");
        }
        var axis = move.axis[data.direction];
        console.log(tile[axis]);
        do {
            tile[axis] += move.sign[data.direction];
        }
        while(this.isOpen(tile.x, tile.y))
        tile[axis] -= move.sign[data.direction]; 
        console.log(tile[axis]);
        return {
            tile: data.tileId,
            method: "move",
            args: {
                attribute: move.attribute[data.direction],
                change: tile[axis],
                time: 1000,
            }
        };
    }                                                                           

    this.isOpen = function(x, y){
        if(x < 0 || y < 0 || x >= this.map.width || y >= this.map.height){
            console.log("out of bounds");
            return false;
        }
        if(this.map.map[y][x] === 1){
            console.log("map not open");
            return false;
        }
        for(var tile in this.tiles){
            var selfFound = false;
            if(this.tiles[tile].x == x && this.tiles[tile].y == y){
                if(selfFound){
                    return false;
                }
                sefFound = true;
            }
        }
        return true;
    }

}

function Tile(id, owner, tileClass){
    this.id = id;
    this.owner = owner;
    this.tileClass = tileClass;
    this.active = false;
    this.width = 60;
    this.height = 90;
    this.x = 0;
    this.y = 0;
}

var defaultMap = {                                                                
    map: [                                                                      
        [1,1,0,0,0,1,1],                                                        
        [1,0,0,0,0,0,1],                                                        
        [0,0,0,0,0,0,0],                                                        
        [0,0,0,1,0,0,0],                                                        
        [0,0,0,0,0,0,0],                                                        
        [1,0,0,0,0,0,1],                                                        
        [1,1,0,0,0,1,1]                                                         
    ],                                                                          
    width: 6,                                                                   
    height: 6,                                                                  
    start: [
        {x: 3, y: 1},
        {x: 3, y: 5}
    ]
}       


var move = {
    sign: {
        up: +1,
        down: -1,
        left: -1,
        right: +1
    },
    axis: {
        up: "y",
        down: "y",
        left: "x",
        right: "x"
    },
    attribute: {
        up: "bottom",
        down: "bottom",
        left: "left",
        right: "left"
    }
}
        

exports.games = new Games;

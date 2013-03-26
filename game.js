var __ = require('underscore');

function Games(){
    this.players = {};
    this.runningGames = {};
    this.openGames = {};
    this.defaultSettings = {
        numPlayers: 2,
        tiles: tilesRPSF,
    };

    this.join = function(data){
        var create = false;
        var gameToJoin = false;

        if(data.create || ! (Object.keys(this.openGames).length)){
            gameToJoin = this.create({});
            create = true;
        } else {
            if(data.gameId){
                if(data.gameId in this.openGames){
                    gameToJoin = this.openGames[gameId];
                } else {
                    return false;
                }
            } else {
                gameToJoin = Object.keys(this.openGames)[0];
            }
        }
        this.openGames[gameToJoin].players.push(data.playerId);
        var gameStart = this.openGames[gameToJoin].players.length
                     >= this.openGames[gameToJoin].settings.numPlayers;

        if(gameStart){
            this.runningGames[gameToJoin] = this.openGames[gameToJoin];
            delete this.openGames[gameToJoin];
            this.runningGames[gameToJoin].state = "running";
        }

        this.players[data.playerId] = gameToJoin;

        return {gameId: gameToJoin, 
                room: gameToJoin,
                start: gameStart,
                create: create};
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
    this.activeTiles = {};
    this.map = defaultMap;
    this.loss = lossRPSF;
    this.queue = [];
    this.state = "open";
    this.winner = false;

    this.start = function(){
        var tileData = [];
        for(var i in this.players){
            var playerId = this.players[i];
            this.playerTiles[playerId] = [];
            for(var j in this.settings.tiles){
                var tileClass = this.settings.tiles[j];
                var tileId = (Math.random() + "").slice(2);
                this.tiles[tileId] = new Tile(tileId, playerId, tileClass);
                this.tiles[tileId].x = -1 + (i * (this.map.width+1)); 
                this.tiles[tileId].y = +j;
                this.playerTiles[playerId].push(this.tiles[tileId]);
                tileData.push({
                    id: tileId, 
                    x: this.tiles[tileId].x, 
                    y: this.tiles[tileId].y
                });
            }        
        }
        return [tileData, this.playerTiles];
    }

    this.activate = function(data){                                             
        var tile = this.tiles[data.tileId];
        if(tile.owner != data.playerId){
            throw new Error("attempting to activate unowned tile!");
        }
        if ( ! (tile.id in this.activeTiles)){
            var playerIndex = __.values(this.players).indexOf(data.playerId);
            var startPos = this.map.start[playerIndex];
            if(this.isOpen(startPos.x, startPos.y, tile.id)){
                this.activeTiles[tile.id] = tile;
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
        var battle = false;
        var tile = this.tiles[data.tileId];
        if(tile.owner != data.playerId || ! (tile.id in this.activeTiles)){
            throw new Error("attempting to move unowned tile!");
        }
        var axis = move.axis[data.direction];
        var tileStart = tile[axis];
        var actions = {};

        do {
            tile[axis] += move.sign[data.direction];
            var action = this.isAction(tile.x, tile.y, tile.id);
            if(action){
                __.extend(actions, action);
                if(action.stop){
                    tile[axis] += move.sign[data.direction];
                    break;
                }
            }
        } while(this.isOpen(tile.x, tile.y, tile.id))
        tile[axis] -= move.sign[data.direction]; 
        
        var distance = Math.abs(tile[axis] - tileStart)

        if(distance > 0){
            return {
                tile: data.tileId,
                method: "move",
                args: {
                    attribute: move.attribute[data.direction],
                    change: tile[axis],
                    time: 200 * distance,
                    actions: __.isEmpty(actions) ? false : actions,
                }
            };
        }
    }                                                                           

    this.isOpen = function(x, y, tileId){
        if(x < 0 || y < 0 || x >= this.map.width || y >= this.map.height){
            return false;
        }
        if(this.map.map[y][x] === 1){
            return false;
        }
        for(var i in this.activeTiles){
            var tile = this.activeTiles[i];
            if(tile.x == x && tile.y == y){
                if(tile.id != tileId){
                    return false;
                }
            }
        }
        return true;
    }

    this.isAction = function(x, y, tileId){

        // out of bounds test
        if(x < 0 || y < 0 || x >= this.map.width || y >= this.map.height){      
            return false;                                                       
        }                                                                       

        var allActions = {};
        var game = this; // because of __.each !
        // collision with an enemy tile
        var collision = __.filter(__.values(game.tiles), function(testTile){
            if(__.indexOf(__.values(game.activeTiles), testTile) > -1
            && testTile.owner != game.tiles[tileId].owner
            && testTile.x == x && testTile.y == y) {
                return true;
            }
            return false;
        });

        if(collision.length){
            var battle = game.fightBattle({                                      
                a: game.tiles[tileId],                                      
                d: collision[0]                                             
            });
            __.extend(
                allActions, 
                battle,
                {stop: true}
            );
        }

        // map-based actions
        if( ! (this.map.map[y][x] in [0,1])){
            __.extend(
                allActions, 
                this.act(tileId, this.map.actions[this.map.map[y][x]])
            );
        }
        return __.isEmpty(allActions) ? false : allActions;
    };

    this.fightBattle = function(combatants){
        losses = [];
        actions = [];
        if(this.loss.attack[combatants.a.tileClass].indexOf(combatants.d.tileClass) > -1){
            combatants.a.active = false;
            delete this.activeTiles[combatants.a.id];
            losses.push({
                tileId: combatants.a.id,
                tileClass: combatants.a.tileClass,
                tileIndex: this.playerTiles[combatants.a.owner].indexOf(combatants.a)
            });
            if(this.loss.action[combatants.a.tileClass]){
                var action = this.loss.action[combatants.a.tileClass];
                actions.push(this.act(combatants.a.id, action));
            };
        }
        if(this.loss.defense[combatants.d.tileClass].indexOf(combatants.a.tileClass) > -1){
            combatants.d.active = false;
            delete this.activeTiles[combatants.d.id];
            losses.push({
                tileId: combatants.d.id,
                tileClass: combatants.d.tileClass,
                tileIndex: this.playerTiles[combatants.d.owner].indexOf(combatants.d)
            });
            if(this.loss.action[combatants.d.tileClass]){
                var action = this.loss.action[combatants.d.tileClass];
                actions.push(this.act(combatants.d.id, action));
            };
        }
        return {losses: losses, actions: actions, reveal: combatants};
    };

    this.act = function(tileId, action){
        if( ! action){
            return false;
        }
        if(action == "win"){
            this.state = "over";
            this.winner = this.tiles[tileId].owner;
            return ["win", this.winner];
        }
        if(action["type"] == "static"){
            return action;
        }
        if(action["type"] == "baseAttack"){
            for(var i in this.players){
                if(this.map.start[i].x == this.tiles[tileId].x
                && this.map.start[i].y == this.tiles[tileId].y){
                    if( ! (this.players[i] == this.tiles[tileId].owner)
                    && this.flagInBase(this.players[i])){
                        return {actions: [["win", this.players[i]]], stop: true}
                    } else {
                        return {stop: true};
                    }
                }
            }
        }
        return false;        
    };

    this.flagInBase = function(player){
        for(var i in this.playerTiles[player]){
            var tile = this.playerTiles[player][i];
            if(tile.tileClass == "flag"){
                if( ! (tile.id in this.activeTiles)){
                    return true;
                }
            }
        }
        return false;
    }
}

function Tile(id, owner, tileClass){
    this.id = id;
    this.owner = owner;
    this.tileClass = tileClass;
    this.width = 60;
    this.height = 90;
    this.x = 0;
    this.y = 0;
}

var defaultMap = {                                                                
    map: [                                                                      
        [ 1 , 1 , 0 , 0 , 0 , 1 , 1 ],
        [ 1 , 0 , 0 ,'b', 0 , 0 , 1 ],
        [ 0 , 0 , 0 ,'s', 0 , 0 , 0 ],
        [ 0 , 0 ,'s', 1 ,'s', 0 , 0 ],
        [ 0 , 0 , 0 ,'s', 0 , 0 , 0 ],
        [ 1 , 0 , 0 ,'b', 0 , 0 , 1 ],
        [ 1 , 1 , 0 , 0 , 0 , 1 , 1 ]
    ],                                                                          
    width: 7,                                                                   
    height: 7,                                                                  
    start: [
        {x: 3, y: 1},
        {x: 3, y: 5}
    ],
    actions: {
        s: {
            type: "static",
            stop: true,
        },
        b: {
            type: "baseAttack",
            stop: true,
        },
    }
};       

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
};

var tilesRPSF = [
    "rock", "rock", "paper", "paper", "scissors", "scissors", "flag",
]
var lossRPSF = {
    attack: {
        rock: ["rock", "paper"],
        paper: ["paper", "scissors"],
        scissors: ["scissors", "rock"],
        flag: ["rock", "paper", "scissors"],
    },
    defense: {
        rock: ["rock", "paper"],
        paper: ["paper", "scissors"],
        scissors: ["scissors", "rock"],
        flag: ["rock", "paper", "scissors"],
    },
    action: {
        flag: "win",
    }
}

var tilesStratego = [
    "one", "two", "three", "three", "spy", "flag", "bomb",
]
var lossStratego = {
    attack: {
        one: ["bomb", "one"],
        two: ["bomb", "one", "two"],
        three: ["one", "two", "three"],
        spy: ["bomb"],
        bomb: ["one", "two", "three", "spy", "flag", "bomb"],
        flag: ["one", "two", "three", "spy", "bomb"],
    }, 
    defense: {
        one: ["bomb", "one"],
        two: ["bomb", "one", "two"],
        three: ["one", "two", "three"],
        spy: ["one", "two", "three", "spy", "flag", "bomb"],
        bomb: ["three", "bomb"],
        flag: ["one", "two", "three", "spy", "flag", "bomb"],
    },
    action: {
        flag: "win",
    }
};

exports.games = new Games;

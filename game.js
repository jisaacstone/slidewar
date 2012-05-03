var __ = require('underscore');

function Games(){
    this.players = {};
    this.runningGames = {};
    this.openGames = {};
    this.defaultSettings = {
        numPlayers: 2,
        tiles: [
            "one",      
            "two",
            "three", "three",
            "flag",
            "bomb",
            "spy",
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
            this.runningGames[gameToJoin].state = "running";
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
    this.activeTiles = {};
    this.map = defaultMap;
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
        console.log(this.playerTiles);
        return [tileData, this.playerTiles];
    }

    this.activate = function(data){                                             
        var tile = this.tiles[data.tileId];
        if(tile.owner != data.playerId){
            throw new Error("attempting to activate unowned tile!");
        }
        if ( ! (tile.id in __.keys(this.activeTiles))){
            var playerIndex = __.values(this.players).indexOf(data.playerId);
            var startPos = this.map.start[playerIndex];
            console.log(tile.tileClass);
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
        console.log(tile[axis]);
        do {
            tile[axis] += move.sign[data.direction];
            var action = this.isAction(tile.x, tile.y, tile.id);
            if(action){
                console.log(action);
                if(action.battle){
                    battle = action.battle;
                }
                if(action.stop){
                    tile[axis] += move.sign[data.direction];
                    break;
                }
            }
        }
        while(this.isOpen(tile.x, tile.y, tile.id))
        tile[axis] -= move.sign[data.direction]; 
        console.log(tile[axis]);
        return {
            tile: data.tileId,
            method: "move",
            args: {
                attribute: move.attribute[data.direction],
                change: tile[axis],
                time: 1000,
                battle: battle,
            }
        };
    }                                                                           

    this.isOpen = function(x, y, tileId){
        if(x < 0 || y < 0 || x >= this.map.width || y >= this.map.height){
            console.log("out of bounds");
            return false;
        }
        if(this.map.map[y][x] === 1){
            console.log("map not open");
            return false;
        }
        for(var i in this.activeTiles){
            var tile = this.activeTiles[i];
            if(tile.x == x && tile.y == y){
                if(tile.id != tileId){
                    console.log("tile found");
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
        console.log(collision);

        if(collision.length){
            console.log("BATTLE");
            return {
                battle: game.fightBattle({
                    a: game.tiles[tileId],
                    d: collision[0]
                }),
                stop: true,
            };
        }

        // map-based actions
        if( ! (this.map.map[y][x] in [0,1])){
            return this.act(tileId, this.map.actions[this.map.map[y][x]]);
        }
        return false;
    };

    this.fightBattle = function(combatants){
        losses = [];
        actions = [];
        if(loss.attack[combatants.a.tileClass].indexOf(combatants.d.tileClass) > -1){
            combatants.a.active = false;
            delete this.activeTiles[combatants.a.id];
            losses.push({
                tileId: combatants.a.id,
                tileClass: combatants.a.tileClass,
                tileIndex: this.playerTiles[combatants.a.owner].indexOf(combatants.a)
            });
            if(loss.action[combatants.a.tileClass]){
                var action = loss.action[combatants.a.tileClass];
                actions.push(this.act(combatants.a.id, action));
            };
        }
        if(loss.defense[combatants.d.tileClass].indexOf(combatants.a.tileClass) > -1){
            combatants.d.active = false;
            delete this.activeTiles[combatants.d.id];
            losses.push({
                tileId: combatants.d.id,
                tileClass: combatants.d.tileClass,
                tileIndex: this.playerTiles[combatants.d.owner].indexOf(combatants.d)
            });
            console.log(this.playerTiles[combatants.d.owner].length)
            if(loss.action[combatants.d.tileClass]){
                var action = loss.action[combatants.d.tileClass];
                actions.push(this.act(combatants.d.id, action));
            };
        }
        return {losses: losses, actions: actions};
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
                    console.log("player", i, this.flagInBase(this.players[i]));
                    if( ! (this.players[i] == this.tiles[tileId].owner)
                    && this.flagInBase(this.players[i])){
                        return {battle: {actions: [["win", this.players[i]]]}, stop: true}
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

var loss = {
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

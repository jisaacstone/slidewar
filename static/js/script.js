
$(document).ready(function() {   

    var socket = io.connect();
    var game = false;

    $('#joinGame').bind('click', function() {
        socket.emit('join', {playerId: socket.socket.sessionid});
        $(this).hide();
    });
    $('#openGames button').live("click", function(e){
        socket.emit('join', {
            gameId: $(e).data('game'),
            playerId: socket.socket.sessionid,
        });
    });

    socket.on('serverMessage', function(data){
        $('#reciever').append('<li>' + data + '</li>');  
    });

    socket.on('newGame', function(data){
        if(game && game.running){
            return;
        }
        $('#openGames').append('<li><span>' + data + '</span>' +
            '<button data-game="' + data +'">join</button></li>');
    });

    socket.on('gameStart', function(data){
        game = new Game(data, socket.socket.sessionid);
        $('#openGames').hide();
    });

    socket.on('gameUpdate', function(data){
        if(game){
            data = JSON.parse(data);
            if(data.tile){
                game.tiles[data.tile][data.method](data.args);
            } else {
                game[data.method](data.args);
            }
        }
    });

    $(".yours").live("click", function(e){
        if(game && game.running){
            var o = JSON.stringify({                              
                playerId: socket.socket.sessionid,                                  
                method: "activate",                                                 
                gameId: game.id,                                                    
                args: {                                                             
                    tileId: $(this).attr('id'),                                     
                },                                                                  
            });
            socket.emit('gameUpdate', o);
        }
    });

    clicked = false;

    $('.gameContainer').mousemove(function(e){
        mouse_x = e.pageX;
        mouse_y = e.pageY;        
        return false;
    });

    $('.yours.active').live("mousedown", function(e){
        start_x = mouse_x;
        start_y = mouse_y;        
        clicked = e;
        return false;
    });

    $('.gameContainer').mouseup(function(){
        if(clicked && game && game.running){
            direction = "";
            diff_x = start_x - mouse_x;
            diff_y = start_y - mouse_y;
            if(Math.abs(diff_x) > 3 || Math.abs(diff_y) > 3){
                if(diff_y){
                    moved = Math.abs(diff_x/diff_y);
                } else {
                    moved = Math.abs(diff_x);
                }
                if (moved > 3) {
                    direction = diff_x > 0 ? "left" : "right";
                }
                else if (moved < 0.3) {
                    direction = diff_y > 0 ? "up": "down";
                }
                if(direction){
                    socket.emit("gameUpdate", JSON.stringify({
                        gameId: game.id,
                        playerId: socket.socket.sessionid,
                        method: "move",
                        args: {
                            tileId: $(clicked.target).attr("id"),
                            direction: direction,
                        }
                    }));
                }
            }
            clicked = false;
        }
        return false;
    });

    $('.gameContainer').mouseleave(function(){
        if(clicked && game){
            $(this).mouseup();
        }
    });
});

function Game(id, player) {
    this.id = id;
    this.player = player;
    this.tiles = {};
    this.blockHeight = 90;
    this.blockWidth = 60;
    this.running = true;
    this.settings = {
        bottom: this.blockHeight,
        left: this.blockWidth
    }

    this.createTile = function(tileId, position){
        this.tiles[tileId] = new Tile(tileId, this);
        this.tiles[tileId].create();
        this.tiles[tileId].moveTo(position);
    }

    this.startGame = function(args){
        this.playerNum = args.playerNum;
        console.log(this.playerNum);
        for(var i in args.tiles){
            var tile = args.tiles[i];
            this.createTile(tile.id, {
                bottom: (tile.y * this.blockHeight) + "px",
                left: -1 * this.blockWidth 
            });
        }
        for(var i in args.yourTiles){
            var tile = args.yourTiles[i];
            this.tiles[tile.id].assignToYou(tile.tileClass); 
        }
    }

    this.makeTeam = function(tiles){
        for(var tile in args.tiles){
            this.tiles[args.tiles[tile]].addClass(".yours");
        }
    }
}

function Tile(id, game) {
    this.id = id;
    this.game = game;

    this.create = function(){
        var newTile = $("<div />").addClass("tile").attr("id", this.id);
        $('.gameContainer').append(newTile);
    }

    this.assignToYou = function(tileClass){
        $("#" + this.id).addClass('yours').addClass(tileClass);
    }

    this.activate = function(data){
        $("#" + this.id).addClass('active');
        this.moveTo({
            left: (data.x * this.game.blockWidth) + "px",
            bottom: (data.y * this.game.blockHeight) + "px"
        });
    }

    this.move = function(data){
        var animateCss = {}
        animateCss[data.attribute] = (
            data.change * this.game.settings[data.attribute]
        ) + "px";
        $("#" + this.id).animate(animateCss, data.time, "linear", function(){
            if($(this).hasClass('killed')){
                $(this).removeAttr('style');
            }
        });
        if(data.battle){
            var player = this.game.player;
            setTimeout(function(){
                for(var i in data.battle.losses){
                    var tile = game.tiles[data.battle.losses[i].tileId];
                    tile.kill(data.battle.losses[i]);
                }
                for(var i in data.battle.reveal){
                    var tile = game.tiles[data.battle.reveal[i].id];
                    tile.reveal(data.battle.reveal[i].tileClass);
                }
                for(var i in data.battle.actions){
                    var action = data.battle.actions[i][0];
                    var actionData = data.battle.actions[i][1];
                    if(action == "win"){
                        var message = actionData == player ? "lose" : "win!";
                        $('#reciever').append('<li>GAME OVER: you ' + message + '</li>');  
                        $('div').die();
                        game.running = false;
                    }
                }
            }, data.time);
        }
    }

    this.moveTo = function(pos){
        console.log(pos);
        $("#" + this.id).css(pos);
    }

    this.kill = function(data){
        if( ! ($("#" + this.id).hasClass('yours'))){
            $("#" + this.id).removeAttr('style').addClass("killed")
                .addClass("index_"+data.tileIndex);
        }
        else {
            $("#" + this.id).remove();
        }   
    };

    this.reveal = function(tileClass){
        $("#" + this.id).addClass(tileClass);
    }
}



/* Author: YOUR MAME HERE
*/

$(document).ready(function() {   

    var socket = io.connect();
    var game = false;

    $('#joinGame').bind('click', function() {
         socket.emit('join', {playerId: socket.socket.sessionid});
         $(this).hide();
    });

    socket.on('serverMessage', function(data){
        $('#reciever').append('<li>' + data + '</li>');  
    });

    socket.on('gameStart', function(data){
        game = new Game(data.id);
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
        socket.emit('gameUpdate', JSON.stringify({
            playerId: socket.socket.sessionid,
            method: "activate",
            args: {
                tile: $(this).data('id')
            }
        }));
    });

    clicked = false;
    $('.gameContainer').mousemove(function(e){
        mouse_x = e.pageX;
        mouse_y = e.pageY;        
        return false;
    });
    $('.tile .alive').live("mousedown", function(e){
        start_x = mouse_x;
        start_y = mouse_y;        
        clicked = e;
        return false;
    });
    $('.gameContainer').mouseup(function(){
        if(clicked && game){
            direction = "";
            diff_x = start_x - mouse_x;
            diff_y = start_y - mouse_y;
            clicked = false;
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
                    console.log(direction);
                    socket.emit("move", JSON.stringify({
                        gameId: game.id,
                        playerId: socket.socket.sessionid,
                        tile: $(clicked).data("id"),
                        direction: direction
                    }));
                }
            }
        }
        return false;
    });
    $('.gameContainer').mouseleave(function(){
        if(clicked && game){
            $(this).mouseup();
        }
    });
});

function Game(id) {
    this.id = id;
    this.tiles = {};
    this.createTile = function(tileId){
        this.tiles[tileId] = new Tile(tileId);
        this.tiles[tileId].create();
    }
    this.startGame = function(args){
        for(var tile in args.tiles){
            this.createTile(tile);
        }
        for(var id in args.yourTiles){
            this.tiles[id].assignToYou(args.yourTiles[id].tileClass); 
        }
    }
    this.makeTeam = function(tiles){
        for(var tile in args.tiles){
            this.tiles[args.tiles[tile]].addClass(".yours");
        }
    }
}

function Tile(id) {
    this.id = id;
    this.create = function(){
        var newTile = $("<div />").addClass("tile");
        $('.gameContainer').append(newTile);
    }
    this.assignToYou = function(tileClass){
        $(this).addClass('yours').addClass(tileClass);
    }
}

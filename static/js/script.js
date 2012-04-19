/* Author: YOUR MAME HERE
*/

$(document).ready(function() {   

    var socket = io.connect();
    var game = false;

    $('#sender').bind('click', function() {
         socket.emit('join', {playerId: socket.socket.sessionid});
    });

    $('.clicky').bind('click', function(el) {
        socket.emit('message', 
            {playerId: socket.socket.sessionid,
            'message': $(this).css('background-color')});
    });

    socket.on('serverMessage', function(data){
        $('#reciever').append('<li>' + data + '</li>');  
    });

    socket.on('gameStart', function(data){
        game = new Game(data.id);
    });

    socket.on('gameUpdate', function(data){
        if(game){
            if(data.tile){
                game.tiles[data.tile][data.method](data.args);
            } else {
                game[data.method](data.args);
            }
        }
    });

    clicked = false;
    $('.gameContainer').mousemove(function(e){
        mouse_x = e.pageX;
        mouse_y = e.pageY;        
    });
    $('.tile').mousedown(function(e){
        start_x = mouse_x;
        start_y = mouse_y;        
        clicked = e;
    });
    $('.gameContainer').mouseup(function(){
        if(clicked && game){
            direction = "";
            stop_x = mouse_x;
            stop_y = mouse_y;
            clicked = false;
            if(start_y != stop_y){
                moved = (start_x - stop_x)/(start_y - stop_y);
            } else {
                moved = start_x - stop_x;
            }
            if (moved > 3) {
                direction = start_x > stop_x ? "left": "right";
            }
            else if (moved < 0.3) {
                direction = start_y > stop_y ? "up": "down";
            }
            if(direction){
                socket.emit("move",
                    {gameId: game.id,
                    playerId: socket.socket.sessionid,
                    tile: $(clicked).data("id"),
                    direction: direction});
            }
        }
    });
    
});

function Game(id) {
    this.id = id;
    this.tiles = {};
    this.createTile = function(args){
        this.tiles[args.tileId] = new Tile(args.tileId, args.tileClass);
        this.tiles[args.tileId].create(args.createArgs);
    }
    this.startGame = function(args){
        for(var tile in args.tiles){
            this.createTile(tile.args);
        }
    }
}

function Tile(id, tileClass) {
    this.id = args.id;
    this.tileClass = args.tileClass;
    this.create = function(args){
        var newTile = $("<div />").css(args.css)
            .addClass(this.tileClass).addClass("tile");
        $('.gameContainer').append(newTile);
    }
}

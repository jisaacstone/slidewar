//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , io = require('socket.io')
    , game = require('./game')
    , port = (process.env.NODEPORT || 8081);

//Setup Express
var server = express.createServer();
server.configure(function(){
    server.set('views', __dirname + '/views');
    server.set('view options', { layout: false });
    server.use(connect.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({ secret: "nobody-4-7-8-time"}));
    server.use(connect.static(__dirname + '/static'));
    server.use(server.router);
});

//setup the errors
server.error(function(err, req, res, next){
    if (err instanceof NotFound) {
        res.render('404.jade', { locals: { 
                  title : '404 - Not Found'
                 ,description: ''
                 ,author: ''
                 ,analyticssiteid: 'XXXXXXX' 
                },status: 404 });
    } else {
        res.render('500.jade', { locals: { 
                  title : 'The Server Encountered an Error'
                 ,description: ''
                 ,author: ''
                 ,analyticssiteid: 'XXXXXXX'
                 ,error: err 
                },status: 500 });
    }
});
server.listen( port);

//Setup Socket.IO
var io = io.listen(server);
io.sockets.on('connection', function(socket){
  for(var gameId in game.games.openGames){
    socket.emit('newGame', gameId);
  }

  socket.on('message', function(data){
    if( ! (data.playerId in game.games.players)){
        socket.emit('serverMessage', 'Join a Game First!');
        return
    }
    io.sockets.in(game.games.players[data.playerId]).emit(
        'serverMessage',
        data.message);
  });

  socket.on('join', function(data){
    gameData = game.games.join(data);
    socket.join(gameData.gameId);
    if(gameData.create){
        io.sockets.emit('newGame', gameData.gameId);
    }
    if(gameData.start){
        io.sockets.in(gameData.gameId).emit('gameStart', gameData.gameId);
        var currentGame = game.games.runningGames[gameData.gameId];
        startData = currentGame.start();
        for(var playerId in startData[1]){
            io.sockets.sockets[playerId].emit('gameUpdate', 
                JSON.stringify({
                method: 'startGame',
                args: {
                    tiles: startData[0],
                    yourTiles: startData[1][playerId],
                    playerNum: Object.keys(startData[1]).indexOf(playerId),
                } 
            }));
        }
    }
  });

  socket.on('gameUpdate', function(data){
    data = JSON.parse(data);
    var gameId = game.games.players[data.playerId];
    data.args["playerId"] = data.playerId;
    //try {
        var result = game.games.runningGames[gameId][data.method](data.args);
    //} 
    //catch (err) {
    //    console.trace(err);
    //    return;
    //}
    if(result){
        var delay = ("time" in result.args ? result.args.time : 0) + 10;
        var queue = game.games.runningGames[gameId].queue;
        console.log(queue, queue[0]);
        if(queue.length){
            var waitFor = Math.max(0, 
                (
                    queue[0]._idleStart.getTime() 
                    + queue[0]._idleTimeout
                ) - Date.now()
            );
        } else {
            var waitFor = 0;
        }
        setTimeout(function(){
            io.sockets.in(gameData.gameId).emit(
                'gameUpdate',                       
                JSON.stringify(result)                                                    
            ); 
        }, waitFor);
        queue[0] = (setTimeout(function(){}, waitFor + delay));
    }
  });

  socket.on('disconnect', function(){
    console.log('Client Disconnected.', this.id, game.games.players);
    // Remove disconnected client from games
    var gameId = game.games.players[this.id];
    var allGames = [game.games.runningGames, game.games.openGames];
    for(var i in allGames){
        var obj = allGames[i];
        if(obj[gameId]){
            var index = obj[gameId].players.indexOf(this.id);
            if(index > -1){
                obj[gameId].players.splice(index, 1);
            }
        }
    }
    delete game.games.players[this.id];
  });
});

///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

server.get('/', function(req,res){
  res.render('index.jade', {
    locals : { 
              title : 'Your Page Title'
             ,description: 'Your Page Description'
             ,author: 'Your Name'
             ,analyticssiteid: 'XXXXXXX' 
            }
  });
});


//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
    throw new NotFound;
});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}


console.log('Listening on http://0.0.0.0:' + port );

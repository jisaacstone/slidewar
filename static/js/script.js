/* Author: YOUR NAME HERE
*/

$(document).ready(function() {   

    var socket = io.connect();

    $('#sender').bind('click', function() {
         socket.emit('join', {playerId: socket.socket.sessionid});
    });

    $('.clicky').bind('click', function(el) {
        socket.emit('message', 
            {playerId: socket.socket.sessionid,
            'message': $(this).css('background-color')});
    });

    socket.on('server_message', function(data){
        $('#reciever').append('<li>' + data + '</li>');  
    });
});

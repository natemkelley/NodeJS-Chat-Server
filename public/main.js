//Init Variables
var $window = $(window);
var chatroomSelection = null;
var $chatPage = $('.chat.page'); // The chatroom page
var $messages = $('.messages'); // Messages area
var $inputMessage = $('.inputMessage'); // Input message input box
var $loginPage = $('.login.page');
var $chatroomPage = $('.chatroom.page');
var $usernameInput = $('.usernameInput');
var $adminpanel = $('.adminpanel');
var username;
var lastTypingTime;
var timer;
var typing = false;
var $currentInput = null;
var FADE_TIME = 150; // ms
var TYPING_TIMER_LENGTH = 1800000; // 30 minutes in ms
var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

//Document ready
$(function () {

    //create socket
    $('.chatroombtn').click(function chooseChatroom() {
        var chatroomChoice = null;
        userChoice = $(this).attr('id');

        console.log("userChoice= " + userChoice);

        if (userChoice == "chatroom1") {
            chatroomChoice = '/chatRoom1';
        } else if (userChoice == "chatroom2") {
            chatroomChoice = '/chatRoom2';
        }

        initChatServer(chatroomChoice);
        $chatroomPage.fadeOut();
        $loginPage.show();
        $currentInput = $usernameInput.focus();
    });
});

function initChatServer(chatRoom) {
    //init socket
    var socket = io(chatRoom);

    //The chat page
    var connected = false;

    // Sets the client's username
    function setUsername() {
        username = cleanInput($usernameInput.val().trim());
        // If the username is valid
        if (username) {
            $loginPage.fadeOut();
            $chatPage.show();
            $loginPage.off('click');
            $currentInput = $inputMessage.focus();

            // Tell the server your username
            socket.emit('add user', username);
        }
    }

    function addParticipantsMessage(data) {
        var message = '';
        if (chatRoom == "/chatRoom1") {
            if (data.chat1_numUsers === 1) {
                message += "there's 1 participant";
            } else {
                message += "there are " + data.chat1_numUsers + " participants";
            }
        } else {
            if (data.chat2_numUsers === 1) {
                message += "there's 1 participant in chat room 2";
            } else {
                message += "there are " + data.chat2_numUsers + " participants";
            }
        }


        log(message);
    }

    // Sends a chat message
    function sendMessage() {
        var message = $inputMessage.val();
        // Prevent markup from being injected into the message
        message = cleanInput(message);
        // if there is a non-empty message and a socket connection
        if (message && connected) {
            $inputMessage.val('');
            addChatMessage({
                username: username,
                message: message
            });
            // tell server to execute 'new message' and send along one parameter
            socket.emit('new message', message);
        }
    }

    //Get Users
    function getUsers() {
        console.log('get users function');
        if (connected) {
            console.log('get users is connected');
            socket.emit('get users');
        }
    }

    // Log a message
    function log(message, options) {
        var $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    }

    // Adds the visual chat message to the message list
    function addChatMessage(data, options) {

        var $usernameDiv = $('<span class="username"/>')
            .text(data.username)
            .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody">')
            .text(data.message);

        var $messageDiv = $('<li class="message"/>')
            .data('username', data.username)
            .append($usernameDiv, $messageBodyDiv);

        addMessageElement($messageDiv, options);
    }

    // el - The element to add as a message
    // options.fade - If the element should fade-in (default = true)
    // options.prepend - If the element should prepend
    //   all other messages (default = false)
    function addMessageElement(el, options) {
        var $el = $(el);

        // Setup default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // Apply options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    // Prevents input from having injected markup
    function cleanInput(input) {
        return $('<div/>').text(input).html();
    }

    // Gets the color of a username through our hash function
    function getUsernameColor(username) {
        // Compute hash code
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // Calculate color
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }

    function updateTyping() {
        if (connected) {
            if (!typing) {
                typing = true;
            }

            if (typing) {
                clearTimeout(timer); //cancel the previous timer.
                timer = null;
                typing = false;

                timer = setTimeout(function () {
                    alert("You are being disconnected");
                    socket.disconnect();
                    $chatPage.fadeOut();
                }, TYPING_TIMER_LENGTH);
            }
        }
    }

    $inputMessage.on('input', function () {
        updateTyping();
    });

    // Keyboard events
    $window.keydown(function (event) {
        // Auto-focus the current input when a key is typed
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }
        // When the client hits ENTER on their keyboard
        if (event.which === 13) {
            if (username) {
                sendMessage();
            } else {
                setUsername();
            }
        }
    });


    // Focus input when clicking anywhere on login page
    $loginPage.click(function () {
        $currentInput.focus();
    });

    // Focus input when clicking on the message input's border
    $inputMessage.click(function () {
        $inputMessage.focus();
    });

    //Get current users
    $adminpanel.click(function () {
        console.log('admin panel');
        getUsers();
    });


    //****************Socket events*****************
    // Whenever the server emits 'login', log the login message
    socket.on('login', function (data) {
        connected = true;
        // Display the welcome message
        var message = "Welcome to Nate's Chat ";
        log(message, {
            prepend: true
        });
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'new message', update the chat body
    socket.on('new message', function (data) {
        addChatMessage(data);
    });

    // get user
    socket.on('get users', function (data) {
        log(data.username);
    });

    // Whenever the server emits 'user joined', log it in the chat body
    socket.on('user joined', function (data) {
        log(data.username + ' joined');
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'user left', log it in the chat body
    socket.on('user left', function (data) {
        log(data.username + ' left');
        addParticipantsMessage(data);
    });

    socket.on('disconnect', function () {
        log('you have been disconnected');
    });

    socket.on('reconnect', function () {
        log('you have been reconnected');
        if (username) {
            socket.emit('add user', username);
        }
    });

    socket.on('reconnect_error', function () {
        log('attempt to reconnect has failed');
    });

};

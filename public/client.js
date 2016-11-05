var socket = io('/' + window.location.host + window.location.pathname);

// Main canvas
var canvas = document.getElementById('players');
var ctx = canvas.getContext('2d');
// Background canvas
var bgcanvas = document.getElementById('background');
var bg = bgcanvas.getContext('2d');


// Load default sprite
var DefaultAvatar = new Image();
DefaultAvatar.src = 'images/avatars/default-avatar.png';

// Load default TileSheet
var TileSheet = new Image();
TileSheet.src = '/images/tiles/tileset.png';

var defaultTilesheets = ['caves.png', 'house.png', 'sand.png', 'snow.png', 'tileset.png'];

var player = {};
socket.on('connect', function() {
    console.log('%cConnected to channel: ' + window.location.host + window.location.pathname, 'background: #000000; color: #00FF00;');
    player = {
        dir: {
            right: false,
            left: false,
            up: false,
            down: false
        },
        id: socket.id,
        updatePos: function() {
            if (this.info) {
                socket.emit('position', {
                    x: this.info.x,
                    y: this.info.y,
                    frameY: this.info.frame.y
                });
            }
        }
    };
});

var world = {
    width: 500,
    height: 500,
    screenWidth: Math.floor(window.innerWidth / 2),
    screenHeight: Math.floor(window.innerHeight / 2),
    grid: 3,
    tiles: {},
    objects: [],
    spawn: [0, 0],
    TileSheets: []
};

var ONLINE = { // All data on other users
    Pend: function(id, att, data) { // Pend data for future use
        if (!this.Penned[id]) {
            this.Penned[id] = {};
        }
        this.Penned[id][att] = data;
    },
    Penned: {},
    getid: function(nick) {
        for (var i in ONLINE.players) {
            if (nick === ONLINE.players[i].nick) {
                return i;
            }
        }
    },
    players: {}
};

var game_loop;
var animate_loop;
var pinPoint_loop;

function init() {
    // Set bgcanvas size
    bgcanvas.width = window.innerWidth;
    bgcanvas.height = window.innerHeight;
    // Set main canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Draw Map
	mapControl.drawTiles();
    // Send position to server
    player.updatePos();

    // Start game loop
    clearInterval(game_loop);
    game_loop = setInterval(paint, 1000 / 40);
    clearInterval(animate_loop);
    animate_loop = setInterval(animate, 5000 / 30);
    clearInterval(pinPoint_loop);
    pinPoint_loop = setInterval(pinPoint, 1000);
}

function stop_loop() {
    clearInterval(game_loop);
    clearInterval(animate_loop);
    clearInterval(pinPoint_loop);
}

function start_loop() {
    game_loop = setInterval(paint, 1000 / 40);
    animate_loop = setInterval(animate, 5000 / 30);
    pinPoint_loop = setInterval(pinPoint, 1000);
}

//
// The main game loop
//

function paint() {
    ctx.clearRect(0, 0, world.width, world.height);
    if (player.dir.left || player.dir.right || player.dir.up || player.dir.down) {
        var p = player.info; // Control players movement
        if (player.dir.left) {
            if (collision(p, 'left')) {
                p.x--;
            }
            if (p.frame.maxY > 1) {
                p.frame.y = 2;
            }
        } else if (player.dir.right) {
            if (collision(p, 'right')) {
                p.x++;
            }
            if (p.frame.maxY > 2) {
                p.frame.y = 3;
            }
        }
        if (player.dir.up) {
            if (collision(p,'up')) {
                p.y--;
            }
            if (p.frame.maxY > 0) {
                p.frame.y = 1;
            }
        } else if (player.dir.down) {
            if (collision(p,'down')) {
                p.y++;
            }
            p.frame.y = 0;
        }
        player.updatePos(); // Send posistion to server
        mapControl.drawTiles();
    }

    var all = [];
    var keys = Object.keys(ONLINE.players);
    for (var i = 0; i < keys.length; i++) {
        var Player = ONLINE.players[keys[i]];
        if (Player.y >= 0 && Player.frame) {
            Player.index = Player.y + (Player.frame.h / 3);
            all.push(Player);
        }
    }

    all = all.concat(world.objects);

    all = all.sort(function(a, b) {
        return a.index - b.index;
    });

    for (var i in all) { // Draw all Objects And Players
        var user = all[i];
        if (user && user.frame && (user.nick != player.info.nick)) {
            if (user.x > user.tx) {
                user.x--;
                if (user.frame.maxY > 1) {
                    user.frame.y = 2;
                }
            } else if (user.x < user.tx) {
                user.x++;
                if (user.frame.maxY > 2) {
                    user.frame.y = 3;
                }
            }
            if (user.y > user.ty) {
                user.y--;
                if (user.frame.maxY) {
                    user.frame.y = 1;
                }
            } else if (user.y < user.ty) {
                user.y++;
                user.frame.y = 0;
            }
        }
        Draw(user);
    }
}

// Collision
function collision(player, dir) {
    var xPos = player.x * world.grid;
    var yPos = player.y * world.grid;

    for (var i = 0; i < world.objects.length; i++) {
        var object = world.objects[i];
        var body = {
            LeftfootX: xPos + 1,
            RightfootX: (xPos + player.frame.w) - 1,
            bottomY: (yPos + player.frame.h)
        }

        switch (dir) {
            case 'right':
                body.RightfootX += 3;
                if (object.collision.bottom >= body.bottomY) { // Object is under player feet, move collision to center of body
                    body.bottomY -= 3;
                }
                break;
            case 'left':
                body.LeftfootX -= 3;
                if (object.collision.bottom >= body.bottomY) { // Object is under player feet, move collision to center of body
                    body.bottomY -= 3;
                }
                break;
            case 'up':
                if (object.collision.bottom <= body.bottomY) { // Object is above player feet, move collison up a little
                    body.bottomY -= 10;
                } else { // Object is under player feet, move collision to head
                    body.bottomY -= player.frame.h;
                }
                break;
        }
        if (body.RightfootX > object.collision.left && body.LeftfootX < object.collision.right && body.bottomY >= object.collision.top && body.bottomY <= object.collision.bottom) {
            return false;
        }
    }
	switch (dir) {
		case 'right':
			xPos += player.frame.w;
				break;
		case 'left':
			xPos--;
				break;
		case 'up':
			yPos--;
				break;
		case 'down':
			(yPos += player.frame.h);
	}
    if (xPos >= 0 && xPos <= world.width - 5 && yPos >= 0 && yPos <= world.height) {
        return true;
    } else { // Touching side of map
        return false;
    }
}

// Draws given player
function Draw(user) {
    var Pleft; // How far from the left of the screen to draw
    var Ptop; // How far from the top of the screen to draw
    if (user.nick == player.info.nick) {
        Pleft = world.screenWidth;
        Ptop = world.screenHeight; // Because you are always centered, draw half screen width and half screen height
        if (player.info.x * 3 < Pleft) {
            Pleft = player.info.x * 3;
        }
        if (player.info.y * 3 < Ptop) { // Unless you are less than half the screens width or height, in this case draw actual position
            Ptop = player.info.y * 3;
        }
    } else {
        /* In this game your position on screen doesn't change, you stay centered on the screen, everything elses screen position changes based on your map position
        So we subtract users position on the map by your position (which causes their position on screen to change) to make it appear that you are moving
        But really they are moving (away/towards) you */
        Pleft = user.x * 3;
        Ptop = user.y * 3; // Draw user position
        if (player.info.x * 3 > world.screenWidth) {
            Pleft -= (player.info.x * 3) - world.screenWidth;//unless your x or y is more than half of screens width or height
        } 
        if (player.info.y * 3 > world.screenHeight) {
            Ptop -= (player.info.y * 3) - world.screenHeight;//than subtract users position by your position
        }
    }

    if (user.nick) {
        // Draw nick
        ctx.font = "12pt Droid Sans";
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = "1";
        var width = ctx.measureText(user.nick).width;
        ctx.strokeText(user.nick, Pleft - (width / 2) + (user.frame.w / 2), Ptop - 5);
        ctx.fillText(user.nick, Pleft - (width / 2) + (user.frame.w / 2), Ptop - 5);
        if (user.messages[0]) {
            var maxWidth = 300; // Sets message bubble Max width.
            var spacing = 0; // To account for different bubble heights.
            for (var i = user.messages.length - 1; i >= /* 0 */ ((user.messages.length - 6) > 0 ? (user.messages.length - 6) : 0); i--) { // Handle breaklines and Wraplines.
                var lines = []; // All eventual lines
                var breakLines = user.messages[i].text.substr(1, 500).split("\n"); // Slpit the text to breaklines, every breakline to words to be wraplines, finally, every word to characters to wrap long words.
                for (var j = 0; j < breakLines.length; j++) {
                    var wrapLines = []; // All lines generated by wrapping.
                    var lastLine = ""; // The words left after a line reaches max width
                    var words = breakLines[j].split(" "); // Words in a single breakline
                    for (var k = 0; k < words.length; k++) {
                        var testLine = lastLine + words[k];
                        var testWidth = ctx.measureText(testLine).width;
                        if (testWidth > maxWidth) {
                            if (lastLine === "") {
                                var lastWord = "";
                                for (var r = 0; r < testLine.length; r++) {
                                    var testWord = lastWord + testLine[r];
                                    var testWidthWord = ctx.measureText(testWord).width;
                                    if (testWidthWord > maxWidth) {
                                        wrapLines.push(testWord);
                                        lastWord = "";
                                    } else {
                                        lastWord = testWord;
                                    }
                                }
                                if (lastWord !== "" && lastWord !== " ") {
                                    words.splice(k + 1, 0, lastWord);
                                }
                            } else {
                                wrapLines.push(lastLine); //was testline
                                lastLine = "";
                                k--;
                            }
                        } else {
                            lastLine = testLine + " ";
                        }
                    }
                    if (lastLine !== "" && lastLine !== " ") {
                        lastLine = lastLine.substr(0, lastLine.length - 1);
                        wrapLines.push(lastLine);
                    }
                    lines.push.apply(lines, wrapLines);
                }
                var l;
                var longest = 0;
                for (var j = 0; j < lines.length; j++) {
                    l = ctx.measureText(lines[j]).width;
                    if (l > longest) {
                        longest = l;
                    }
                }
                var width = longest + 30;
                var height = 30 + 20 * (lines.length - 1);
                var yy = Ptop - 64 - spacing - 20 * (lines.length - 1);
                spacing += height + 5;
                var last = i === user.messages.length - 1 ? true : false;
                drawBubble(ctx, Pleft - (width / 2) + (user.frame.w / 2), yy, width, height , 10, lines, last, user.messages[i].color);
            }
        }
        ctx.drawImage(user.avy, (user.frame.x * user.frame.w), (user.frame.y * user.frame.h), user.frame.w, user.frame.h, Pleft, Ptop, user.frame.w, user.frame.h);
    } else if (user.tiles) { // Draw object
        var ObjectTile = user.tiles;
        var Pleft = 0;
        var Ptop = 0;
        var PlayerX = (player.info && player.info.x || world.spawn[0]) * 3;
        var PlayerY = (player.info && player.info.y || world.spawn[1]) * 3
        if (PlayerX > world.screenWidth) Pleft = (PlayerX)-world.screenWidth;
        if (PlayerY > world.screenHeight) Ptop = (PlayerY)-world.screenHeight;
        ctx.drawImage(world.TileSheets[user.src], ObjectTile.MinX, ObjectTile.MinY, ObjectTile.MaxX, ObjectTile.MaxY, (user.x * world.grid) - Pleft, (user.y * world.grid) - Ptop,  ObjectTile.MaxX, ObjectTile.MaxY);
    }
}

function drawBubble(ctx, x, y, w, h, radius, word, arrow, fontColor) {
    var r = x + w;
    var b = y + h;
    var invertedColor = contrast.bw(contrast.hexToRgb(fontColor));
    ctx.beginPath();
    ctx.strokeStyle = invertedColor === 'b' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = "1.5";
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + radius * 2, y);
    ctx.lineTo(r - radius, y);
    ctx.quadraticCurveTo(r, y, r, y + radius);
    ctx.lineTo(r, y + h - radius);
    ctx.quadraticCurveTo(r, b, r - radius, b);
    ctx.lineTo((x + radius) + (w / 2), b);
    if (arrow) {
        ctx.lineTo((x + radius) + (w / 2) - 10, b + 10);
        ctx.lineTo(x + radius + (w / 2) - 20, b);
    }
    ctx.lineTo(x + radius, b);
    ctx.quadraticCurveTo(x, b, x, b - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.fillStyle = invertedColor === 'w' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
    ctx.fill();
    ctx.fillStyle = fontColor;
    ctx.stroke();
    for (var i = 0; i <word.length; i++) {
        ctx.fillText(word[i], x + 15, y + 15 + (20 * i));
    }
}
//
// Controls the animations of the dude
//
function animate() {
    var p = player.info;
    if (player.dir.left || player.dir.right || player.dir.up || player.dir.down) { // Control plays animations
        clearInterval(p.twitch);
        p.twitch = false;
        p.frame.x++;
        if (p.frame.x > p.frame.maxX) {
            p.frame.x = 0;
        }
    } else if (!p.twitch) {
        p.twitch = setInterval(function() {
            if (p.frame.x < p.frame.maxX) {
                p.frame.x++;
            } else if (p.frame.y < 4) {
                p.frame.x = 0;
            }
        }, 1000);
    }

    let keys = Object.keys(ONLINE.players);
    for (let i = 0; i < keys.length; i++) { // Everyone eles animations
        let user = ONLINE.players[keys[i]];
        if (keys[i] != player.id && user.frame) {
            if (user.x != user.tx || user.y != user.ty) {
                if (user.twitch) {
                    clearInterval(user.twitch);
                }
                user.twitch = false;
                user.frame.x++;
                if (user.frame.x > user.frame.maxX) {
                    user.frame.x = 0;
                }
            } else if (!user.twitch) {
                user.twitch = setInterval(function() {
                    if (user.frame.x < user.frame.maxX) {
                        user.frame.x++;
                    } else if (user.frame.y < 4) {
                        user.frame.x = 0;
                    }
                }, 1000);
            }
        }
    }
}

// Controls click to walk(or tap)

function move(e) {
    var x = Math.round((e.clientX) / 3);
    var y = Math.round((e.clientY) / 3);
    if (player.info.x * 3 > window.innerWidth / 2) x += Math.round(((player.info.x * 3) - world.screenWidth) / 3);
    if (player.info.y * 3 > window.innerHeight / 2) y += Math.round(((player.info.y * 3) - world.screenHeight) / 3);

    var context = false;
    var keys = Object.keys(ONLINE.players);
    for (var i = 0; i < keys.length; i++) {
        var user = ONLINE.players[keys[i]];
        if (x > user.x && x < user.x + (user.frame.w / 3) && y > user.y && y < user.y + (user.frame.h / 3)) {
            context = true;
            if (user.nick === player.info.nick) {
                var menu = document.getElementById('menu');
                if (menu.className == 'slideOpen') {
                    menu.className = 'slideClose';
                } else {
                    menu.className = 'slideOpen';
                }
            } else {
                $$$.contextMenu(e, user.nick);  
            }
        }
    }

    if (!context) {
        if (player.autowalk) clearInterval(player.autowalk);
        player.autowalk = setInterval(function() {
            player.dir.left = player.info.x > x;
            player.dir.right = player.info.x < x;
            player.dir.down = player.info.y < (y - Math.round(player.info.frame.h / 3));
            player.dir.up = player.info.y > (y - Math.round(player.info.frame.h / 3));
            if (player.info.x == x && player.info.y == (y - Math.round(player.info.frame.h / 3))) {
                player.dir.left = false;
                player.dir.right = false;
                player.dir.down = false;
                player.dir.up = false;
                clearInterval(player.autowalk);
            }
        }, 1000 / 40)
    }
}

canvas.addEventListener('mousedown', function(e) {
    e.preventDefault();
    if (document.activeElement === document.getElementById('world') && e.which === 1) {
        canvas.addEventListener('mouseup', move(e));
    }
    document.getElementById('world').focus();
});

// Radar Canvas dots.
var radarSweep = document.getElementById('radar-points'),
    rpctx = radarSweep.getContext('2d'),
    radarDot = rpctx.createImageData(3, 3);

for(var i = 0; i < radarDot.data.length; i += 4) {
    radarDot.data[i] = '255';
    radarDot.data[i + 1] = '0';
    radarDot.data[i + 2] = '0';
    radarDot.data[i + 3] = '255';
}

radarSweep.width = '60';
radarSweep.height = '60';

function pinPoint() {
    rpctx.clearRect(0, 0, 60, 60);
    for(var n in ONLINE.players) {
        var x = (ONLINE.players[n].x / world.width) * 60;
        var y = (ONLINE.players[n].y / world.height) * 60;
        rpctx.putImageData(radarDot, parseInt(x), parseInt(y));
    }
}

// Fade chat window

var chatDiv = document.getElementById('chat');
var worldDiv = document.getElementById('world');

worldDiv.addEventListener('focus', function(e) {
    chatDiv.style.opacity = "0.7";
});

worldDiv.addEventListener('blur', function(e) {
    chatDiv.style.opacity = "1";
});

// Get Chat window X and Y coordinates, 'window' can be 'container' after fixing #world having random values at first, or late initializtion.

function getChatX() {
    var cw = document.getElementById('chat');
    // var container = document.getElementById('world'); // To be used later
    right = (window.innerWidth - (cw.offsetLeft + cw.offsetWidth)) / window.innerWidth; // Postion based on ratio of right to left/top to bottom.
    // var right = (window.innerWidth - (cw.offsetLeft + cw.clientWidth)); // Position based on right/bottom
}

function getChatY() {
    var cw = document.getElementById('chat');
    // var container = document.getElementById('world'); // To be used later
    bottom = (window.innerHeight - (cw.offsetTop + cw.offsetHeight)) / window.innerHeight; //Same as above
    // var bottom = (window.innerHeight - (cw.offsetTop + cw.clientHeight)); // Same as above
}

// Keep Chat widnow on relative cooridnates on resize

window.addEventListener('resize', function() {
    // Set bgcanvas size
    bgcanvas.width = window.innerWidth;
    bgcanvas.height = window.innerHeight;
    // Set main canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    world.screenHeight = Math.floor(window.innerHeight / 2);
    world.screenWidth = Math.floor(window.innerWidth / 2);
    mapControl.drawTiles();

    // Move chat window.
    var cw = document.getElementById('chat');
    var x = window.innerWidth - (cw.offsetWidth + right * window.innerWidth); // Postion based on ratio of right to left/top to bottom.
    var y = window.innerHeight - (cw.offsetHeight + bottom * window.innerHeight);
    // var y = window.innerWidth - (cw.clientWidth + right); // Position based on right/bottom
    // var x = window.innerHeight - (cw.clientHeight + bottom);
    if (x >= 0) {
        cw.style.left = x + "px";
        getChatX();
    } else {
        cw.style.left = 0;
    }
    if (y >= 0) {
        cw.style.top = y + "px";
        getChatY();
    } else {
        cw.style.top = 0;
    }

});

// All the important functions besides the basic ones

var userControl = {
    addUser: function(id, data) {
        if (!ONLINE.players[id]) {
            ONLINE.players[id] = {
                x: data.x || world.spawn[0],
                y: data.y || world.spawn[1],
                tx: data.x || world.spawn[0],
                ty: data.y || world.spawn[1],
                frame: {
                    w: 32,
                    h: 64,
                    x: 0,
                    y: data.frameY || 0,
                    maxX: 1,
                    maxY: 4
                },
                avy: DefaultAvatar,
                nick: data.nick || id,
                messages: [],
                time: []
            };

            var li = document.createElement('li');
            li.id = id;
            li.textContent = ONLINE.players[id].nick;
            li.addEventListener('click', function(e) {
                $$$.contextMenu(e, e.target.textContent);
            });
            document.getElementById('users-list').appendChild(li);
            this.updateUsersCount();
        }

        if (ONLINE.Penned[id] && ONLINE.Penned[id].nick) { // If user had pending nick load now
            userControl.nick(ONLINE.Penned[id].nick, id, true);
        }
        if (ONLINE.Penned[id] && ONLINE.Penned[id].avy) { // If user had pending avatar load now
            avatarControl.loadAvatar(id, ONLINE.Penned[id].avy);
        }
        if (id == player.id) { // If player loaded start game
            player.info = ONLINE.players[id];
        }
    },
    removeUser: function(id, part) {
        var UserData = ONLINE.players[id];
        if (UserData) {
            for (var i = 0; i < UserData.time.length; i++) {
                clearTimeout(UserData.time[i]);
            }
            UserData.time = [];
            CHAT.show({
                nick: UserData.nick,
                message: 'has left' + (part ? (' ' + part) : ''),
                style: 'general'
            });
            delete ONLINE.players[id];
            // Remove from menu
            var li = document.getElementById(id);
            document.getElementById('users-list').removeChild(li);
            this.updateUsersCount();
        }
    },
    nick: function(nick, id, secret) {
        var user = ONLINE.players[id];
        if (user) {
            if (!secret) {
                CHAT.show({
                    nick: user.nick,
                    message: 'is now known as ' + nick,
                    style: 'general'
                });
            }
            user.nick = nick;
            var li = document.getElementById(id);
            if (li) {
                li.textContent = nick;
            }
        } else {
            ONLINE.Pend(id, 'nick', nick)
        }
    },
    updateUsersCount: function() {
        var count = Object.keys(ONLINE.players).length;
        document.getElementById('sphere').textContent = count;
    }
}

var mapControl = {
    loadMap: function(MapInfo) {

        function loadBgTiles() {

            function GetBgImage() {
                let BgImage = document.createElement('canvas');
                BgImage.width = world.width;
                BgImage.height = world.height;
                let cc = BgImage.getContext('2d');

                for (var src in AllTiles) {
                    var tilesFromOneSheet = AllTiles[src];
                    for (var i = 0; i < tilesFromOneSheet.length; i++) {
                        var tile = tilesFromOneSheet[i];
                        cc.drawImage(world.TileSheets[src], tile.sx, tile.sy, 16, 16, ((tile.left) + (world.width / 4)), ((tile.top) + (world.height / 4)), 16, 16);
                    }
                }

                world.background = new Image();
                world.background.src = BgImage.toDataURL();
                mapControl.drawTiles();
                loadObjects(); // Start loading objects
            }

            for (var s = 0; s < AllTilesKeys.length; s++) {
                var sheet = AllTiles[AllTilesKeys[s]];
                for (var t = 0; t < sheet.length; t++) {
                    var OneTile = sheet[t];
                    if (world.width < OneTile.left) {
                        world.width = OneTile.left;
                    }
                    if (world.height < OneTile.top) {
                        world.height = OneTile.top;
                    }
                }
            }
            world.width *= 2;
            world.height *= 2;

            GetBgImage();
        }

        function loadObjects() {
            var Objects = JSON.parse(MapInfo.objects);
            for (var src in Objects) {
                var objectsFromOneSheet = Objects[src];
                for (var i = 0; i < objectsFromOneSheet.length; i++) {
                    var object = objectsFromOneSheet[i];
                    if (object.collision && object.collision.length == 4) {
                        world.objects.push({
                            x: (object.left+(world.width / 4)) / 3,
                            y: (object.top+(world.height / 4)) / 3,
                            tiles: object.tiles,
                            index: Math.round(((object.top) + (object.height) + ((world.height / 4))) / 3),
                            src: src,
                            collision: {
                                left: object.collision[0] + object.left + (world.width / 4),
                                right: object.collision[1] + object.left + (world.width / 4),
                                top: object.collision[2] + object.top + (world.height / 4),
                                bottom: object.collision[3] + object.top + (world.height / 4)
                            }
                        });
                    }
                }
            }
            init(); // Map is done loading, start game
        }

        // Load all tilesheets before anything else
        var AllTiles = JSON.parse(MapInfo.tiles);
        var AllTilesKeys = Object.keys(AllTiles);

        function loadTileSheet(tilesheetsrc) {
            var Ron = new Image();
            Ron.src = window.location.origin + (defaultTilesheets.indexOf(tilesheetsrc) !== -1 ? "/images/tiles/" : "/data/images/tiles/") + tilesheetsrc; // Change how map data is saved, used to be: tilesheetsrc
            Ron.onload = function() {
                world.TileSheets[tilesheetsrc] = Ron;
            }
        }

        for (var i in AllTilesKeys) {
            loadTileSheet(AllTilesKeys[i]);
        }

        var load = setInterval(function() {
            if (Object.keys(world.TileSheets).length == AllTilesKeys.length) {
                loadBgTiles();
                clearInterval(load);
            }
        }, 2000);

        if (MapInfo.spawn) {
            try{
                var Spawn = JSON.parse(MapInfo.spawn);
                if (Spawn.length) {
                    var SpawnX = Math.floor((Spawn[0] + (world.width / 4)) / 3) * 3;
                    var SpawnY = Math.floor((Spawn[1] + (world.height / 4)) / 3) * 3;
                    world.spawn = [SpawnX / world.grid, SpawnY / world.grid];
                }
            } catch(err) {
                world.spawn = [0, 0];
            }
        }
    },
    drawTiles: function() {
        bg.clearRect(0, 0, window.innerWidth, window.innerHeight);
        // Magic
        var Pleft = 0;
        var Ptop = 0;
        var PlayerX = (player.info && player.info.x || world.spawn[0]) * 3;
        var PlayerY = (player.info && player.info.y || world.spawn[1]) * 3
        if (PlayerX > world.screenWidth) Pleft = PlayerX - world.screenWidth;
        if (PlayerY > world.screenHeight) Ptop = PlayerY - world.screenHeight;
        bg.drawImage(world.background, 0, 0, world.width, world.height, -Pleft, -Ptop, world.width, world.height);
    }
}

// Menu codes
/*
document.getElementById('toggle-bar').addEventListener('click', function() { // Open menu on click
    var menu = document.getElementById('bar');
    if (menu.className == 'open-bar') {
        menu.className = 'close-bar';
    } else {
        menu.className = 'open-bar';
    }
});
*/

document.getElementById('tabs').addEventListener('click', function(e) {
    var tab = e.target;
    if (tab.className == 'tab') {
        var selectedTab = document.getElementsByClassName('selected')[0];
        if (selectedTab) {
            document.getElementById(selectedTab.textContent).style.display = 'none';
            selectedTab.classList.remove('selected');
        }
        tab.classList.add('selected');
        document.getElementById(tab.textContent).style.display = 'block';
    }
});

//
// All player controls
//
document.addEventListener('keydown', function(e) {
    var key = e.which;
    if (document.activeElement === document.getElementById('world')) {
        if (!e.ctrlKey) {
            if (key == "37") player.dir.left = true;
            else if (key == "38") player.dir.up = true;
            else if (key == "39") player.dir.right = true;
            else if (key == "40") player.dir.down = true;
        } else {
            var UserFrame = player.info.frame;
            if (key == "37" && UserFrame.maxY >= 6) UserFrame.y = 6; // Left
            else if (key == "38" && UserFrame.maxY >= 5) UserFrame.y = 5; // Up
            else if (key == "39" && UserFrame.maxY >= 7) UserFrame.y = 7; // Right
            else if (key == "40" && UserFrame.maxY >= 4) UserFrame.y = 4; // Down
            player.updatePos(); // Send posistion to server
        }
    }
});

document.addEventListener('keyup', function(e) {
    var key = e.which;
    if (key == "37") player.dir.left = false;
    else if (key == "38") player.dir.up = false;
    else if (key == "39") player.dir.right = false;
    else if (key == "40") player.dir.down = false;
});

// User connected, add new user
socket.on('join',function(data) {
    userControl.addUser(data.id, data);
    CHAT.show({
        nick: data.nick,
        message: 'has joined',
        style: 'general'
    });
});

// User disconnected, RemoveUser
socket.on('left', function(data) {
    userControl.removeUser(data.id, data.part);
});

// Snap Avys to their new positions on resuming map.
function reposition() {
    for (var n in ONLINE.players) {
        if (n != player.id) {
            ONLINE.players[n].x = ONLINE.players[n].tx;
            ONLINE.players[n].y = ONLINE.players[n].ty;
        }
    }
    socket.off('positions', reposition);
}

// Pause or resume map.
socket.on('bed', function(data) {
    if (data == 'sleep') {
        stop_loop();
        CHAT.show({
            message: 'Have a spooky night!'
        });
        document.getElementById('world-curtain').classList.add('world-curtain-down');
    } else if (data == 'wakeup') {
        socket.on('positions', reposition);
        start_loop();
        CHAT.show({
            message: 'You\'re awake!'
        });
        document.getElementById('world-curtain').classList.remove('world-curtain-down');
    }
});

// Refresh page.
socket.on('refresh', function() {
    location.reload();
});

function resetAll() {
    var avyList = document.getElementById('Avatars');
    for (var i = 0; i < avyList.children.length; i++) {
        if (avyList.children[i].nodeName != 'INPUT') {
            avyList.children[i].parentNode.removeChild(avyList.children[i]);
        }
    }
    for (var n in  ONLINE.players) {
        var li = document.getElementById(n);
        li.parentNode.removeChild(li);
    }
    ONLINE.players = {};
    world.width = 500;
    world.height = 500;
}

// Clear users info, users and avy list, reset map, and join on reconnection.
function reconnected() {
    CHAT.show({
        message: 'Joining...',
        style: 'error'
    });
    resetAll();
    socket.emit('core', {
        command: 'join',
        data: CHAT.attributes
    });
    socket.off('reconnect', reconnected);
}

// Show message on reconnecting.
function reconnecting() {
    CHAT.show({
        message: 'Reconnecting...',
        style: 'error'
    });
    socket.off('reconnecting', reconnecting);
}

// Tell user if disconnected from server and listen to reconnect events.
socket.on('disconnect', function(e) {
    console.log('%cDisconnected, error: ' + e, 'background: #000000; color: #FF0000;');
    if (e === 'io client disconnect' || e === 'io server disconnect') {
        CHAT.show({
            message: 'Disconnected',
            style: 'error'
        });
    } else {
        CHAT.show({
            message: 'Disconnected...',
            style: 'error'
        });
        if (CHAT.toggles.get('reconnect')) {
            socket.on('reconnecting', reconnecting);
            socket.on('reconnect', reconnected);
        }
    }
});

// Set user message for speech bubbles
socket.on('message', function(message) {
	var id = ONLINE.getid(message.nick);
	if (ONLINE.players[id]) {
        ONLINE.players[id].messages.push({
            text: parser.removeHTML(parser.reLinebreak(parser.parse(message.message))),
            color: parser.bubbleColor(message.message) || '#000'
        });
		ONLINE.players[id].time.push(setTimeout(function() {
			ONLINE.players[id].messages.shift();
            ONLINE.players[id].time.shift();
		}, 8000));
	}
});

socket.on('MapInfo', function(data) {
    for (var i in data.avatars) { // Load all avatars
        var UserData = data.avatars[i];
        if (!ONLINE.players[UserData.id]) {
            userControl.addUser(UserData.id, {
                nick: UserData.nick,
                x: UserData.position.x,
                y: UserData.position.y,
                frameY: UserData.position.frameY
            });
        }
        if (UserData.avy) {
            avatarControl.loadAvatar(UserData.id, UserData.avy);
        }
    }
    if (data.map) {
        mapControl.loadMap(data.map);
    }
});

socket.on('nick', function(data) { // Update players nick
    userControl.nick(data.nick, data.id);
});

socket.on('positions', function(data) { // Grab all players positions
    for (var i in data) {
        if (i != player.id) {
            if (ONLINE.players[i]) {
                var Player = ONLINE.players[i];
                Player.tx = data[i].x;
                Player.ty = data[i].y;
                Player.frame.y = data[i].frameY;
            }
        }
    }
});

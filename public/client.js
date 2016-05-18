var socket = io(window.location.pathname);

//main canvas
var canvas = document.getElementById('players');;
var ctx = canvas.getContext('2d');
//background canvas
var bgcanvas = document.getElementById('background');
var bg = bgcanvas.getContext('2d');


//load default sprite
var DefaultAvatar = new Image();
DefaultAvatar.src = 'images/DefaultAvatar.png';

//load default TileSheet
var TileSheet = new Image();
TileSheet.src = '/images/tiles/Tileset.png';

var player = {};
socket.on('connect', function(){
    player = {
        dir : {
            right : false,
            left : false,
            top : false,
            bottom : false
        },
        id : socket.id,
        updatePos : function(){
            if(this.info){
                socket.emit('position',{
                    x : this.info.x,
                    y : this.info.y,
                    frameY : this.info.frame.y
                });    
            } 
        }
    }
});

var world = {
    width : 0,
    height : 0,
    grid : 3,
    tiles : [],
    objects : [],
    spawn : [0,0]
};

var ONLINE = {//All data on other users
    Pend : function(id,att,data){//pend data for future use
        if(!this.Penned[id]){
            this.Penned[id] = {};
        }
        this.Penned[id][att] = data;
    },
    Penned : {},
    getid : function(nick){
        for(var i in ONLINE.players){
            if(nick == ONLINE.players[i].nick){
                return i;
            }
        }
    },
    players : {}
};

var game_loop;
var animate_loop;

function init(){
    clearInterval(game_loop);
    game_loop = setInterval(paint, 1000/40);
    clearInterval(animate_loop);
    animate_loop = setInterval(animate, 5000 / 30);
};

//
// the main game loop
//

function paint(){
    ctx.clearRect(0,0,world.width,world.height);
    if(!player.autowalk && (player.dir.left || player.dir.right || player.dir.up || player.dir.down)){
        var p = player.info;//control players movement
        if(player.dir.left){
            if(collision(p,'left')){
                p.x--;
            }
            if(p.frame.maxY > 1)p.frame.y = 2;
        } else if(player.dir.right){
            if(collision(p,'right')){
                p.x++;
            }
            if(p.frame.maxY > 2)p.frame.y = 3;
        }
        if(player.dir.up){
            if(collision(p,'up')){
                p.y--;
            }
            if(p.frame.maxY > 0)p.frame.y = 1;
        } else if(player.dir.down){
            if(collision(p,'down')){
                p.y++;
            }
            p.frame.y = 0;
        }
        player.updatePos();//send posistion to server
        spooks.DrawTiles(world.tiles);
    }
    
    var all = [];
    var keys = Object.keys(ONLINE.players);
    for(var i = 0; i < keys.length; i++){
        var Player = ONLINE.players[keys[i]];
        if(Player.y >= 0 && Player.frame){
            Player.index = Player.y + (Player.frame.h/3);
            all.push(Player);
        }
    }
    
    all = all.concat(world.objects);
    
    all = all.sort(function(a,b){
        return a.index - b.index;
    });
    
    for(var i in all){//Draw all Objects And Players 
        var user = all[i];
        if(user && user.frame && (user.nick != player.info.nick || player.autowalk)){
            if(user.x > user.tx){
                user.x--;
                if(user.frame.maxY > 1) user.frame.y = 2;
            } else if(user.x < user.tx){
                user.x++;
                if(user.frame.maxY > 2) user.frame.y = 3;
            }
            if(user.y > user.ty){
                user.y--;
                if(user.frame.maxY) user.frame.y = 1;
            } else if(user.y < user.ty){
                user.y++;
                user.frame.y = 0;
            }
            if(user.nick == player.info.nick){
                player.updatePos();
                spooks.DrawTiles();
                if(user.y == user.ty && user.x == user.tx){
                    player.autowalk = false;
                }
            }
        }
        Draw(user);
    }
}

//collision
function collision(player,dir){
    var xPos = player.x*world.grid;
    var yPos = player.y*world.grid;
    
    for(var i = 0; i < world.objects.length; i++){
        var object = world.objects[i];
        var body = {
            LeftfootX : xPos+1,
            RightfootX : (xPos+player.frame.w)-1,
            bottomY : (yPos+player.frame.h)
        }
        
        switch(dir){
            case 'right':
                body.RightfootX += 3;
                if(object.collision.bottom >= body.bottomY){//object is under player feet, move collision to center of body
                    body.bottomY -= 3;
                }
                break;
            case 'left':
                body.LeftfootX -= 3;
                if(object.collision.bottom >= body.bottomY){//object is under player feet, move collision to center of body
                    body.bottomY -= 3;
                }
                break;
            case 'up':
                if(object.collision.bottom <= body.bottomY){//object is above player feet, move collison up a little
                    body.bottomY -= 10;
                } else {//object is under player feet, move collision to head
                    body.bottomY -= player.frame.h;
                }
                break;
        }
        if(body.RightfootX > object.collision.left && body.LeftfootX < object.collision.right && body.bottomY >= object.collision.top && body.bottomY <= object.collision.bottom){
            return false;
        }
    }
	switch(dir){
		case 'right':
			xPos+=player.frame.w;
				break;
		case 'left':
			xPos--;
				break;
		case 'up':
			yPos--;
				break;
		case 'down':
			(yPos+=player.frame.h);
	}
    if(xPos >= 0 && xPos <= world.width-5 && yPos >= 0 && yPos <= world.height){
        return true;
    } else {//touching side of map
        return false;
    }
}

//draws given player
function Draw(user){
    if(user.nick == player.info.nick){
        var Pleft = window.innerWidth/2;
        var Ptop = window.innerHeight/2;
        if(player.info.x*3 < Pleft) Pleft = player.info.x*3;
        if(player.info.y*3 < Ptop) Ptop = player.info.y*3;
        Pleft = Math.round(Pleft);
        Ptop = Math.round(Ptop);
    } else {
        Pleft = user.x*3;
        Ptop = user.y*3;
        if(player.info.x*3 > window.innerWidth/2) Pleft = Pleft-(player.info.x*3-(window.innerWidth/2));
        if(player.info.y*3 > window.innerHeight/2) Ptop = Ptop-(player.info.y*3-(window.innerHeight/2));
        Pleft = Math.round(Pleft);
        Ptop = Math.round(Ptop);
    }
    if(user.nick){//if have a nick draw it
        ctx.font = "12pt Droid Sans";
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'black';
        ctx.lineWidth="1";
        var width = ctx.measureText(user.nick).width;
        ctx.strokeText(user.nick,(Pleft)-(width/2)+(user.frame.w/2),Ptop-5);
        ctx.fillText(user.nick,(Pleft)-(width/2)+(user.frame.w/2),Ptop-5);
    }
    if(user.message){
        var width = ctx.measureText(user.message).width + 30;
        drawBubble(ctx, (Pleft)-(width/2)+(user.frame.w/2),(Ptop)-64,width, 30, 10, user.message);
    }
    if(user.nick){
        ctx.drawImage(user.avy, (user.frame.x*user.frame.w), (user.frame.y*user.frame.h), user.frame.w, user.frame.h,Math.round(Pleft),Math.round(Ptop),user.frame.w,user.frame.h);
    } else if(user.tiles.length){
        for(var i = 0; i < user.tiles.length; i++){
            var ObjectTile = user.tiles[i];
            var Pleft = 0;
            var Ptop = 0;
            var PlayerX = (player.info && player.info.x || world.spawn[0])*3;
            var PlayerY = (player.info && player.info.y || world.spawn[1])*3
            if(PlayerX > window.innerWidth/2) Pleft = (PlayerX)-window.innerWidth/2;
            if(PlayerY > window.innerHeight/2) Ptop = (PlayerY)-window.innerHeight/2;
            ctx.drawImage(TileSheet,ObjectTile.sx,ObjectTile.sy,16,16,((user.x*world.grid)+ObjectTile.left)-Pleft,((user.y*world.grid)+ObjectTile.top)-Ptop,16,16);
        }
    }
}
function drawBubble(ctx, x, y, w, h, radius, word){
  var r = x + w;
  var b = y + h;
  ctx.beginPath();
  ctx.strokeStyle="black";
  ctx.lineWidth="2";
  ctx.moveTo(x+radius, y);
  ctx.lineTo(x+radius * 2, y);
  ctx.lineTo(r-radius, y);
  ctx.quadraticCurveTo(r, y, r, y+radius);
  ctx.lineTo(r, y+h-radius);
  ctx.quadraticCurveTo(r, b, r-radius, b);
  ctx.lineTo((x+radius)+(w/2), b);
  ctx.lineTo((x+radius)+(w/2)-10, b+10);
  ctx.lineTo(x+radius+(w/2)-20, b);
  ctx.lineTo(x+radius, b);
  ctx.quadraticCurveTo(x, b, x, b-radius);
  ctx.lineTo(x, y+radius);
  ctx.quadraticCurveTo(x, y, x+radius, y);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle='black';
  ctx.fillText(word,x+15,y+(h/2));
}
//
// controls the animations of the dude
//
function animate(){
    var p = player.info;
    if(player.dir.left || player.dir.right || player.dir.up || player.dir.down || player.autowalk){//control plays animations
        clearInterval(p.twitch);
        p.twitch = false;
        p.frame.x++;
        if(p.frame.x > p.frame.maxX){
            p.frame.x = 0;
        }
    } else if(!p.twitch){
        p.twitch = setInterval(function(){
            if(p.frame.x < p.frame.maxX){
                p.frame.x++;
            } else if(p.frame.y < 4){
                p.frame.x = 0;
            }
        },1000);
    }
    
    var keys = Object.keys(ONLINE.players);
    for(var i = 0; i < keys.length; i++){//everyone eles animations
        var user = ONLINE.players[keys[i]];
        if(keys[i] != player.id && user.frame){
            if(user.x != user.tx || user.y != user.ty){
                clearInterval(p.twitch);
                p.twitch = false;
                user.frame.x++;
                if(user.frame.x > user.frame.maxX){
                    user.frame.x = 0;
                }
            } else if(!user.twitch){
                user.twitch = setInterval(function(){
                    if(user.frame.x < user.frame.maxX){
                        user.frame.x++;
                    } else if(user.frame.y < 4){
                        user.frame.x = 0;
                    }
                },1000);
            }
        }
    }   
}

//controls click to walk(or tap)

function move(e){
    var x = Math.round((e.clientX)/3);
    var y = Math.round((e.clientY)/3);
    
    var context = false;
    var keys = Object.keys(ONLINE.players);
    for(var i = 0; i < keys.length; i++){
        var user = ONLINE.players[keys[i]];
        if(x > user.x && x < user.x+(user.frame.w/3) && y > user.y && y < user.y+(user.frame.h/3)){
            context = true;
            $$$.contextMenu(e,user.nick);
        }
    }
    
    if(!context){
        player.info.tx = x;
        player.info.ty = y-Math.round(player.info.frame.h/3);
        player.autowalk = true;   
    }
}

canvas.addEventListener('mousedown', function(e){
    e.preventDefault();
    if(document.activeElement === document.getElementById('world') && e.which===1) {
        canvas.addEventListener('mouseup', move(e));
        
    }
    document.getElementById('world').focus();
});

window.addEventListener('resize', function(){
    spooks.DrawTiles(world.tiles);
});

//All the important functions besides the basic ones
var spooks = {
    AddUser : function(id,data){//add new user
        if(!data) data = {};
        if(!ONLINE.players[id]){
            ONLINE.players[id] = {
                x : data.x || world.spawn[0],
                y : data.y || world.spawn[1],
                tx : data.x || world.spawn[0],
                ty : data.y || world.spawn[1],
                frame : {
                    w : 32,
                    h : 64,
                    x : 0,
                    y : data.frameY || 0,
                    maxX : 1,
                    maxY : 4
                },
                avy : DefaultAvatar,
                nick : data.nick || id
            };    
        }
        if(ONLINE.Penned[id] && ONLINE.Penned[id].nick){//if user had pending nick load now
            spooks.nick(ONLINE.Penned[id].nick,id,true);
        }
        if(ONLINE.Penned[id] && ONLINE.Penned[id].avy){//if user had pending avatar load now
            spooks.loadAvatar(id,ONLINE.Penned[id].avy);
        }
        if(id == player.id){//if player loaded start game
            window.scrollTo((world.spawn[0]/2)*3,(world.spawn[1]/2)*3);
            player.info = ONLINE.players[id];
            player.updatePos();
            init();
        }
        var li = document.createElement('li');
        li.addEventListener('click', function(e){
            $$$.contextMenu(e,e.target.textContent);
        });
        li.id = id;
        li.textContent = ONLINE.players[id].nick;
        document.getElementById('Users').appendChild(li);
    },
    removeUser : function(id){
        var UserData = ONLINE.players[id];
        CHAT.show({
            nick : UserData.nick,
            message : 'has left',
            style : 'general'
        });
        delete ONLINE.players[id];
        //remove from menu
        var li = document.getElementById(id);
        document.getElementById('Users').removeChild(li);
    },
    saveAvatar : function(avy,filename){
        
        var AvyFrame;
        
        function save(){
            var myavy = document.createElement('div');
            myavy.className = 'myavy';
            myavy.style.backgroundPosition = '0px 0px';
            myavy.style.width = AvyFrame.w + 'px';
            myavy.style.height = AvyFrame.h + 'px';
            myavy.style.overflow = 'hidden';
            myavy.appendChild(avy);
            
            function toDataUrl(url, callback, outputFormat){
                var img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = function(){
                    var canvas = document.createElement('CANVAS');
                    var ctx = canvas.getContext('2d');
                    var dataURL;
                    canvas.height = this.height;
                    canvas.width = this.width;
                    ctx.drawImage(this, 0, 0);
                    dataURL = canvas.toDataURL(outputFormat);
                    callback(dataURL);
                    canvas = null; 
                };
                img.src = url;
            }
            
            myavy.addEventListener('click',function(e){
                toDataUrl(avy.src, function(base64Img){
                    socket.emit('command',{//send image data to server
                        name : 'avy',
                        params : {
                            avy : base64Img,
                            name : filename
                        }
                    });
                });
            });
            document.getElementById('Avatars').appendChild(myavy);   
        }
        
        if(!avy.height){
            avy.onload = function(){
                AvyFrame = FrameSizes(avy);
                save();
            }
        } else {
            AvyFrame = FrameSizes(avy);
            save();
        }
        
    },
    nick : function(nick,id,secret){
        var user = ONLINE.players[id];
        if(user){
            if(!secret){
                CHAT.show({
                    nick : user.nick,
                    nick2 : nick,
                    message : 'is now known as',
                    style : 'general'
                });   
            }
            user.nick = nick;
            var li = document.getElementById(id);
            if(li) li.textContent = nick;
        } else {
            ONLINE.Pend(id,'nick',nick)
        }
    },
    loadAvatar : function(id,file){
        var user = ONLINE.players[id];
        if(user){
            var avatar = new Image();
            avatar.src = file;
            avatar.onload = function(){
                var Sizes = FrameSizes(avatar);
                if(Sizes){
                    user.avy = avatar;
                    user.frame = Sizes;
                } else {
                    user.avy = DefaultAvatar;
                }
            }   
        } else {//if doesn't show player online, pend data
            ONLINE.Pend(id,'avy',file);
        }
    },
    loadMap : function(MapInfo){
        if(MapInfo.tiles){
            var Tiles = JSON.parse(MapInfo.tiles);
			for(var t = 0; t < Tiles.length; t++){
                var OneTile = Tiles[t];
                if(world.width < OneTile.left) world.width = OneTile.left;
                if(world.height < OneTile.top) world.height = OneTile.top;
				world.tiles.push({
					x : OneTile.left/3,
					y : OneTile.top/3,
					sx : OneTile.sx,
					sy : OneTile.sy,
					order : OneTile.order
				});
			}
            world.width *= 2;
            world.height *= 2;
            this.DrawTiles(TileSheet);
        }
        if(MapInfo.objects){
            var Objects = JSON.parse(MapInfo.objects);
            for(var t in Objects){
                world.objects.push({
                    x : (Objects[t].left+(world.width/4))/3,
                    y : (Objects[t].top+(world.height/4))/3,
                    tiles : Objects[t].tiles,
                    index : Math.round(((Objects[t].top) + (Objects[t].height) + ((world.height/4)))/3)
                });
                if(Objects[t].collision.length){
                    world.objects[t].collision = {
                        left : Objects[t].collision[0] + Objects[t].left + (world.width/4),
                        right : Objects[t].collision[1] + Objects[t].left + (world.width/4),
                        top : Objects[t].collision[2] + Objects[t].top + (world.height/4),
                        bottom : Objects[t].collision[3] + Objects[t].top + (world.height/4)
                    }
                }
            }
        }
        if(MapInfo.spawn){
            try{
                var Spawn = JSON.parse(MapInfo.spawn);
                if(Spawn.length){
                    var SpawnX = Math.floor((Spawn[0]+(world.width/4))/3) * 3;
                    var SpawnY = Math.floor((Spawn[1]+(world.height/4))/3) * 3;
                    world.spawn = [SpawnX/world.grid,SpawnY/world.grid]
                }
            } catch(err){
                world.spawn = [0,0];
            }
        }
    },
    DrawTiles : function(Tiles){
        bg.clearRect(0,0,window.innerWidth,window.innerHeight);
        //set bgcanvas size
        bgcanvas.width = window.innerWidth;            
        bgcanvas.height = window.innerHeight;            
        //set main canvas size           
        canvas.width = window.innerWidth;            
        canvas.height = window.innerHeight; 
        //magic
        var Pleft = 0;
        var Ptop = 0;
        var PlayerX = (player.info && player.info.x || world.spawn[0])*3;
        var PlayerY = (player.info && player.info.y || world.spawn[1])*3
        if(PlayerX > window.innerWidth/2) Pleft = (PlayerX)-window.innerWidth/2;
        if(PlayerY > window.innerHeight/2) Ptop = (PlayerY)-window.innerHeight/2;
		for(var i = 0; i < world.tiles.length; i++){
			bg.drawImage(TileSheet,world.tiles[i].sx,world.tiles[i].sy,16,16,((world.tiles[i].x*3)+(world.width/4))-Math.round(Pleft),((world.tiles[i].y*3)+(world.height/4))-Math.round(Ptop),16,16);
		}        
    }
}

//menu codes
document.getElementById('toggle-menu').addEventListener('click', function(){//open menu on click
    var menu = document.getElementById('menu');
    if(menu.classList.contains('slideOpen')){
        menu.classList.remove('slideOpen');
        menu.classList.add('slideClose');
    } else {
        menu.classList.remove('slideClose');
        menu.classList.add('slideOpen');
    }
});

document.getElementById('tabs').addEventListener('click', function(e){
    var tab = e.target;
    if(tab.className == 'tab'){
        var otherTabs = document.getElementsByClassName('tab');
        for(var i = 0; i < otherTabs.length; i++){
            document.getElementById(otherTabs[i].textContent).style.display = 'none';
            otherTabs[i].classList.remove('selected');
        }
        tab.classList.add('selected');
        document.getElementById(tab.textContent).style.display = 'block';
    }
});

//
// All player controls
//
document.addEventListener('keydown', function(e){
    var key = e.which;
    if(document.activeElement === document.getElementById('world')) {
        if(!e.ctrlKey){
            if(key == "37") player.dir.left = true;
            else if(key == "38") player.dir.up = true;
            else if(key == "39") player.dir.right = true;
            else if(key == "40") player.dir.down = true;
        } else {
            var UserFrame = player.info.frame;
            if(key == "37" && UserFrame.maxY >= 6) UserFrame.y = 6;//left
            else if(key == "38" && UserFrame.maxY >= 5) UserFrame.y = 5;//up
            else if(key == "39" && UserFrame.maxY >= 7) UserFrame.y = 7;//right
            else if(key == "40" && UserFrame.maxY >= 4) UserFrame.y = 4;//down   
            player.updatePos();//send posistion to server
        }
    }
});

document.addEventListener('keyup', function(e){
    var key = e.which;
    if(key == "37") player.dir.left = false;
    else if(key == "38") player.dir.up = false;
    else if(key == "39") player.dir.right = false;
    else if(key == "40") player.dir.down = false;
});

//User connected, AddUser
socket.on('join',function(data){
    spooks.AddUser(data.id,data);
    CHAT.show({
        nick : data.nick,
        message : 'has joined',
        style : 'general'
    });
});

//User disconnected, RemoveUser
socket.on('left', function(id){
    spooks.removeUser(id);
});

//refresh page
socket.on('refresh',function(){
    location.reload();
});

//tell user if disconnected from server
socket.on('disconnect', function() {
    CHAT.show({
        message : 'Disconnected',
        style : 'error'
    });
});

//set user message for speech bubbles
socket.on('message',function(message){
	var id = ONLINE.getid(message.nick);
	if(ONLINE.players[id]){
		clearTimeout(ONLINE.players[id].time);
		ONLINE.players[id].time = setTimeout(function(){
			ONLINE.players[id].message = '';
		},5000);
		ONLINE.players[id].message = parser.removeHTML(parser.parse(message.message));
	}
});

socket.on('MapInfo', function(data){
    for(var i in data.avatars){//load all avatars
        var UserData = data.avatars[i];
        spooks.AddUser(UserData.id,{
            nick : UserData.nick,
            x : UserData.position.x,
            y : UserData.position.y,
            frameY : UserData.position.frameY
        });
        if(UserData.avy){
            spooks.loadAvatar(UserData.id,UserData.avy);
        }
    }
    if(data.map){
        spooks.loadMap(data.map);
    }
});

socket.on('nick', function(data){//update players nick
    spooks.nick(data.nick,data.id);
});

socket.on('positions', function(data){//grab all players positions
    for(var i in data){
        if(i != player.id){
            if(ONLINE.players[i]){
                var Player = ONLINE.players[i];
                Player.ping = 0;//received data on player, reset ping
                Player.tx = data[i].x;
                Player.ty = data[i].y;
                Player.frame.y = data[i].frameY;
            }  
        }  
    }
});

// ----------------------------------------------------
//  Gets the frame width and height of the given avatar 
// ----------------------------------------------------

//ZOOM IN METHODD
function FrameSizes(avy){
    var frame = document.createElement('canvas');
    frame.id = 'frame';
    frame.style.position = 'absolute';
    frame.style.left = '50px';
    document.body.appendChild(frame);
    var q = frame.getContext('2d');
    frame.width = avy.width;
    frame.height = avy.height;
    q.drawImage(avy,0,0);
    var frameW = false,
        frameH = false,
        frameX = 0,
        frameY = 0;
        
    var pixels = q.getImageData(0,0,avy.width,avy.height);
    var cocks = q.getImageData(0,0,avy.width,avy.height);
       
    var height = 16;
    var width = 0;
    var findend = false;
    var pixelCount = 0;
    var StartingWidth = 0;
    
    //get width
    for(; height <= 128; height++){
        var alpha = pixels.data[((width*4)+(height*(avy.width*4)))+3];
        //cocks.data[((width*4)+(height*(avy.width*4)))+3] = 255;
        //cocks.data[((width*4)+(height*(avy.width*4)))] = 255;
        if(alpha){
            if(!findend){
                findend = true;
                StartingWidth = width;
            }
            pixelCount++;
        }
        if(height >= 128){
            width++;
            height = 15;
            if(findend && pixelCount == 0){
                width += StartingWidth;
                //guess work
                var guess = width;
                var frameX = Math.round(avy.width/guess);
                frameW = avy.width/frameX;
                break;
            }
            pixelCount = 0;
            if(width > 128) break;
        }
    }
    
    var height = 0;
    var width = 0;
    var findend = false;
    var pixelCount = 0;
    var StartingHeight = 0;
    
    //get height
    for(; width <= frameW; width++){
        var alpha = pixels.data[((width*4)+(height*(avy.width*4)))+3];
        //cocks.data[((width*4)+(height*(avy.width*4)))+3] = 255;
        //cocks.data[((width*4)+(height*(avy.width*4)))] = 255;
        if(alpha){
            if(!findend){
                findend = true;
                StartingHeight = height;
            }
            pixelCount++;
        }
        if(width >= (frameW-10)){
            height++;
            width = 0;
            if(findend && pixelCount == 0){
                //guess work
                var guess = height;
                var frameY = Math.round(avy.height/guess);
                if(frameY > 8) frameY = 8;
                frameH = avy.height/frameY;
                break;
            }
            pixelCount = 0;
            if(height > avy.height) break;
        }
    }
            
    document.body.removeChild(frame);
    //q.putImageData(cocks,0,0);
    if(frameW && frameH){
        return {
            w : frameW,
            h : frameH,
            y : 0,
            x : 0,
            maxX : frameX-1,
            maxY : frameY-1
        };
    } else {
        return false;
    }
}

// -----------------------------------------------------
// Remove the solid background color of the given avatar
// -----------------------------------------------------

function removebg(source){//remove background color
    var color = document.createElement('canvas');
    document.body.appendChild(color);
    var q = color.getContext('2d');
    color.width = source.width;
    color.height = source.height;
    q.drawImage(source,0,0);
    var pixels = q.getImageData(0, 0, source.width, source.height);
    var remove = {
        r : pixels.data[0],
        g : pixels.data[1],
        b : pixels.data[2]
    };
    for(var i = 0, len = pixels.data.length; i < len; i += 4){
        var r = pixels.data[i];
        var g = pixels.data[i+1];
        var b = pixels.data[i+2];

        if(r == remove.r && g == remove.g && b == remove.b){
            if(remove.r || remove.g || remove.b){
                pixels.data[i+3] = 0;
            }
        }
    }
    q.putImageData(pixels,0,0);
    document.body.removeChild(color);
    return color.toDataURL();
}

// --------------------------------------------------
// modify avatar and convert before sending to server
// --------------------------------------------------

function SpriteGif(imagedata,filename){
    var img = new Image();
    img.src = imagedata;
    img.onload = function(){
        var width = img.width;
        var height = img.height;
        document.getElementById('menu').appendChild(img);
        var superGif = new SuperGif({ gif: img});
        var splitCanvas = document.createElement('canvas');
        splitCanvas.height = height;
        var sc = splitCanvas.getContext('2d');
        superGif.load(function(){
            var TotalFrames = superGif.get_length();
            splitCanvas.width = width*TotalFrames;
            superGif.pause();
            for(var i = 0; i < TotalFrames; i++){
                superGif.move_to(i);
                var Gifcanvas = superGif.get_canvas();
                var IMGdata = Gifcanvas.toDataURL();
                var frame = new Image();
                frame.src = IMGdata;
                sc.drawImage(frame,i*width,0);
            }
            var SpriteFrames = {
                h : height,
                w : width,
                maxY : 0,
                maxX : superGif.get_length(),
                x : 0,
                y : 0
            }
            var SpriteSheet = splitCanvas.toDataURL();
            SendAvy(SpriteSheet,filename,SpriteFrames);
        });
    };
}

function SendAvy(imgdata,name,SpriteFrames){
    var source = new Image();
    source.src = imgdata;
    source.onload = function(){
        var pixs = removebg(source);
        var user = player.info;
        TestAvatar = new Image();//update client side immediately
        TestAvatar.src = pixs;
        var Sizes = SpriteFrames || FrameSizes(TestAvatar);
        if(Sizes){
            user.avy = TestAvatar;
            user.frame = Sizes;
            spooks.saveAvatar(user.avy,name);
            socket.emit('command',{//send image data to server
                name : 'avy',
                params : {
                    avy : pixs,
                    name : name
                }
            });
        } else {
            CHAT.show({
                message : 'Unable to detect frame sizes',
                style : 'error'
            });
        }
    };
}

document.getElementById('upload').onchange = function(){
    var file = this.files[0];
    var reader = new FileReader();
    reader.onload = function(evt){
        if(file.type == 'image/gif'){
            SpriteGif(evt.target.result,file.name);
        } else {
            SendAvy(evt.target.result,file.name);
        }
    };
    reader.readAsDataURL(file);   
};
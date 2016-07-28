var socket = io(window.location.pathname);

//main canvas
var canvas = document.getElementById('players');
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
socket.on('connect', function () {
    player = {
        dir : {
            right : false,
            left : false,
            up : false,
            down : false
        },
        id : socket.id,
        updatePos : function () {
            if (this.info) {
                socket.emit('position', {
                    x : this.info.x,
                    y : this.info.y,
                    frameY : this.info.frame.y
                });
            }
        }
    };
});

var world = {
    width : 500,
    height : 500,
    screenWidth : Math.floor(window.innerWidth / 2),
    screenHeight : Math.floor(window.innerHeight / 2),
    grid : 3,
    tiles : {},
    objects : [],
    spawn : [0, 0],
    TileSheets : []
};

var ONLINE = {//All data on other users
    Pend : function (id, att, data) {//pend data for future use
        if (!this.Penned[id]) {
            this.Penned[id] = {};
        }
        this.Penned[id][att] = data;
    },
    Penned : {},
    getid : function (nick) {
        for (var i in ONLINE.players) {
            if (nick === ONLINE.players[i].nick) {
                return i;
            }
        }
    },
    players : {}
};

var game_loop;
var animate_loop;

function init(){
    //set bgcanvas size
    bgcanvas.width = window.innerWidth;            
    bgcanvas.height = window.innerHeight;            
    //set main canvas size           
    canvas.width = window.innerWidth;            
    canvas.height = window.innerHeight; 
    
    //Draw Map
	spooks.DrawTiles();
    //Send position to server
    player.updatePos();
    
    //start game loop
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
    if(player.dir.left || player.dir.right || player.dir.up || player.dir.down){
        var p = player.info;//control players movement
        if(player.dir.left){
            if(collision(p,'left')){
                p.x--;
            }
            if(p.frame.maxY > 1) p.frame.y = 2;
        } else if(player.dir.right){
            if(collision(p,'right')){
                p.x++;
            }
            if(p.frame.maxY > 2) p.frame.y = 3;
        }
        if(player.dir.up){
            if(collision(p,'up')){
                p.y--;
            }
            if(p.frame.maxY > 0) p.frame.y = 1;
        } else if(player.dir.down){
            if(collision(p,'down')){
                p.y++;
            }
            p.frame.y = 0;
        }
        player.updatePos();//send posistion to server
        spooks.DrawTiles();
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
        if(user && user.frame && (user.nick != player.info.nick)){
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
};

//draws given player
function Draw(user){
    var Pleft;//How far from the left of the screen to draw
    var Ptop;//How far from the top of the screen to draw
    if(user.nick == player.info.nick){
        Pleft = world.screenWidth;
        Ptop = world.screenHeight;//Because you are always centered, draw half screen width and half screen height;
        if(player.info.x*3 < Pleft) Pleft = player.info.x*3;
        if(player.info.y*3 < Ptop) Ptop = player.info.y*3;//unless you are less than half the screens width or height, in this case draw actual position
    } else {
        /*In this game your position on screen doesn't change, you stay centered on the screen, everything elses screen position changes based on your map position
        So we subtract users position on the map by your position (which causes their position on screen to change) to make it appear that you are moving
        But really they are moving (away/towards) you*/
        Pleft = user.x*3;
        Ptop = user.y*3;//draw user position
        if(player.info.x*3 > world.screenWidth) Pleft -= (player.info.x*3)-world.screenWidth;//unless your x or y is more than half of screens width or height
        if(player.info.y*3 > world.screenHeight) Ptop -= (player.info.y*3)-world.screenHeight;//than subtract users position by your position
    }
    
    if(user.nick){
        //draw nick
        ctx.font = "12pt Droid Sans";
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'black';
        ctx.lineWidth="1";
        var width = ctx.measureText(user.nick).width;
        ctx.strokeText(user.nick,(Pleft)-(width/2)+(user.frame.w/2),Ptop-5);
        ctx.fillText(user.nick,(Pleft)-(width/2)+(user.frame.w/2),Ptop-5);
        if(user.message){
            var width = ctx.measureText(user.message).width + 30;
            drawBubble(ctx, (Pleft)-(width/2)+(user.frame.w/2),(Ptop)-64,width, 30, 10, user.message);
        }
        ctx.drawImage(user.avy, (user.frame.x*user.frame.w), (user.frame.y*user.frame.h), user.frame.w, user.frame.h,Pleft,Ptop,user.frame.w,user.frame.h);
    } else if(user.tiles){//draw object
        var ObjectTile = user.tiles;
        var Pleft = 0;
        var Ptop = 0;
        var PlayerX = (player.info && player.info.x || world.spawn[0])*3;
        var PlayerY = (player.info && player.info.y || world.spawn[1])*3
        if(PlayerX > world.screenWidth) Pleft = (PlayerX)-world.screenWidth;
        if(PlayerY > world.screenHeight) Ptop = (PlayerY)-world.screenHeight;
        ctx.drawImage(world.TileSheets[user.src],ObjectTile.MinX,ObjectTile.MinY,ObjectTile.MaxX,ObjectTile.MaxY,(user.x*world.grid)-Pleft,(user.y*world.grid)-Ptop,ObjectTile.MaxX,ObjectTile.MaxY);
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
    if(player.dir.left || player.dir.right || player.dir.up || player.dir.down){//control plays animations
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
    
    let keys = Object.keys(ONLINE.players);
    for(let i = 0; i < keys.length; i++){//everyone eles animations
        let user = ONLINE.players[keys[i]];
        if(keys[i] != player.id && user.frame){
            if(user.x != user.tx || user.y != user.ty){
                if(user.twitch) clearInterval(user.twitch);
                user.twitch = false;
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
    if(player.info.x*3 > window.innerWidth/2) x += Math.round(((player.info.x*3)-world.screenWidth)/3);
    if(player.info.y*3 > window.innerHeight/2) y += Math.round(((player.info.y*3)-world.screenHeight)/3);
    
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
        if(player.autowalk) clearInterval(player.autowalk);
        player.autowalk = setInterval(function(){
            player.dir.left = player.info.x > x;
            player.dir.right = player.info.x < x;
            player.dir.down = player.info.y < (y-Math.round(player.info.frame.h/3));
            player.dir.up = player.info.y > (y-Math.round(player.info.frame.h/3));
            if(player.info.x == x && player.info.y == (y-Math.round(player.info.frame.h/3))){
                player.dir.left = false;
                player.dir.right = false;
                player.dir.down = false;
                player.dir.up = false;
                clearInterval(player.autowalk);
            }
        },1000/40)  
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
    //set bgcanvas size
    bgcanvas.width = window.innerWidth;            
    bgcanvas.height = window.innerHeight;            
    //set main canvas size           
    canvas.width = window.innerWidth;            
    canvas.height = window.innerHeight; 
    
    world.screenHeight = Math.floor(window.innerHeight/2);
    world.screenWidth = Math.floor(window.innerWidth/2);
    spooks.DrawTiles();
});

//All the important functions besides the basic ones
var spooks = {
    AddUser (id, data = {}){//add new user
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
            player.info = ONLINE.players[id];
        }
        var li = document.createElement('li');
        li.id = id;
        li.textContent = ONLINE.players[id].nick;
        li.addEventListener('click', function(e){
            $$$.contextMenu(e,e.target.textContent);
        });
        document.getElementById('Users').appendChild(li);
    },
    removeUser (id){
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
    saveAvatar (avy,filename){
        
        var AvyList = document.getElementById('avy-list');
        
        function save(AvyFrame){
            if(AvyFrame.w > 120) AvyFrame.w = 120;
            var myavy = document.createElement('li');
            myavy.className = 'myavy';
            myavy.style.cssText = `background-position:0px 0px;overflow:hidden;display:block;width:${AvyFrame.w}px;height:${AvyFrame.h}px`;
            myavy.appendChild(avy);
            
            var remove = document.createElement('button');
            remove.style.cssText = `background:none;border:none;cursor:pointer;position:relative;left:${AvyFrame.w}px;top:-${AvyFrame.h/2}px;`;
            remove.textContent = 'x';
            myavy.appendChild(remove);
            
            remove.addEventListener('click', function(e){
                CHAT.submit('/removeavy ' + filename);
                AvyList.removeChild(myavy);
                AvyList.removeChild(remove);
            });
            
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
                socket.emit('command',{//find image on server
                    name : 'avy',
                    params : {
                        name : filename
                    }
                });
            });
            AvyList.appendChild(myavy);   
            AvyList.appendChild(remove);
        }  
        
        avy.onload = function(){
            save(FrameSizes(avy));
        }
                
    },
    nick (nick,id,secret){
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
    loadAvatar (id,file){
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
    loadMap (MapInfo){
        
        function loadBgTiles(){
            
            function GetBgImage(){
                let BgImage = document.createElement('canvas');
                BgImage.width = world.width;
                BgImage.height = world.height;
                let cc = BgImage.getContext('2d');
                
                for(var src in AllTiles){
                    var tilesFromOneSheet = AllTiles[src];
                    for(var i = 0; i < tilesFromOneSheet.length; i++){
                        var tile = tilesFromOneSheet[i];
                        cc.drawImage(world.TileSheets[src],tile.sx,tile.sy,16,16,((tile.left)+(world.width/4)),((tile.top)+(world.height/4)),16,16);
                    }
                }
                
                world.background = new Image();
                world.background.src = BgImage.toDataURL();
                spooks.DrawTiles();
                loadObjects();//start loading objects
            }
                        
            for(var s = 0; s < AllTilesKeys.length; s++){
                var sheet = AllTiles[AllTilesKeys[s]];
                for(var t = 0; t < sheet.length; t++){
                    var OneTile = sheet[t];
                    if(world.width < OneTile.left) world.width = OneTile.left;
                    if(world.height < OneTile.top) world.height = OneTile.top;
                }
            }
            world.width *= 2;
            world.height *= 2;
            
            GetBgImage();
        }
        
        function loadObjects(){
            var Objects = JSON.parse(MapInfo.objects);
            for(var src in Objects){
                var objectsFromOneSheet = Objects[src];
                for(var i = 0; i < objectsFromOneSheet.length; i++){
                    var object = objectsFromOneSheet[i];
                    if(object.collision && object.collision.length == 4){
                        world.objects.push({
                            x : (object.left+(world.width/4))/3,
                            y : (object.top+(world.height/4))/3,
                            tiles : object.tiles,
                            index : Math.round(((object.top) + (object.height) + ((world.height/4)))/3),
                            src : src,
                            collision : {
                                left : object.collision[0] + object.left + (world.width/4),
                                right : object.collision[1] + object.left + (world.width/4),
                                top : object.collision[2] + object.top + (world.height/4),
                                bottom : object.collision[3] + object.top + (world.height/4)
                            }
                        });   
                    }
                }
            }
            init();//map is done loading, start game
        }
        
        //Load all tilesheets before anything else
        var AllTiles = JSON.parse(MapInfo.tiles);
        var AllTilesKeys = Object.keys(AllTiles);

        function loadTileSheet(tilesheetsrc){
            var Ron = new Image();
            Ron.src = tilesheetsrc;
            Ron.onload = function(){
                world.TileSheets[tilesheetsrc] = Ron;
            }
        }
        
        for(var i in AllTilesKeys){
            console.log(i)
            loadTileSheet(AllTilesKeys[i]);
        }
        
        var load = setInterval(function(){
            if(Object.keys(world.TileSheets).length == AllTilesKeys.length){
                loadBgTiles();
                clearInterval(load);
            }
        },2000);
        
        
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
    DrawTiles (Tiles){
        bg.clearRect(0,0,window.innerWidth,window.innerHeight);
        //magic
        var Pleft = 0;
        var Ptop = 0;
        var PlayerX = (player.info && player.info.x || world.spawn[0])*3;
        var PlayerY = (player.info && player.info.y || world.spawn[1])*3
        if(PlayerX > world.screenWidth) Pleft = PlayerX-world.screenWidth;
        if(PlayerY > world.screenHeight) Ptop = PlayerY-world.screenHeight;
        bg.drawImage(world.background,0,0,world.width,world.height,-Pleft,-Ptop,world.width,world.height);  
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
        if(!ONLINE.players[UserData.id]){
            spooks.AddUser(UserData.id,{
                nick : UserData.nick,
                x : UserData.position.x,
                y : UserData.position.y,
                frameY : UserData.position.frameY
            });   
        }
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
                Player.tx = data[i].x;
                Player.ty = data[i].y;
                Player.frame.y = data[i].frameY;
            }  
        }  
    }
});
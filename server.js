var dao = require('./dao');
var throttle = require('./throttle');
var request = require('request');
var _ = require('underscore');
var $ = require('jquery-deferred');
var express = require('express');
var fs = require('fs');

var channels = {};

function createChannel(io, channelName){
        
    var room = io.of(channelName);
    
    var positions = {};
    
    setInterval(function(){
        roomEmit('positions', positions);
    },300);
    
    var tokens = {};
    var channel = {
        online : []
    };
    
    room.on('connection', function(socket){
        
        var user = {
            remote_addr : socket.request.connection.remoteAddress,
            socket : socket,
            role : 3
        };
        if(user.remote_addr.substr(0,7) == '::ffff:') user.remote_addr = user.remote_addr.substr(7);//if ip contains '::ffff:' remove it
                                        
        socket.on('position', function(data){
            positions[socket.id] = {
                x : data.x,
                y : data.y,
                frameY : data.frameY
            }
        });

        //handle messages
        socket.on('message', function(message){
            throttle.on(user.remote_addr).then(function(ok){//throttle all messages
                if(ok){
                    if(indexOf(user.nick) != -1){
                        var msg = message.message.length > 1000 ? '/`' + message.message : message.message;
						emitMessage({
                            message : msg.substr(0,10000),
                            nick : user.nick || socket.id,
                            flair : message.flair,
                            style : 'chat',
                        });
                    }
                } else {//give warning if spamming
                    showMessage(user.socket,'You are spamming, stop or you will be temporarily banned.','error');
                    throttle.warn(user.remote_addr);
                }
            }).fail(function(){//ban after 3 warnings
                dao.ban(channelName,user.remote_addr);
                showMessage(user.socket,'You have been banned for spamming.','error');
                socket.disconnect();
            });
        });
        
        //handle commands
        socket.on('command', function(cmd){
            if(cmd && cmd.name && typeof cmd.name == 'string'){
                if(COMMNADS[cmd.name]){//check that command exist
                    if(user.role !== undefined && (COMMNADS[cmd.name].role === undefined || user.role <= COMMNADS[cmd.name].role) && indexOf(user.nick) != -1){//make sure user is properly joined
                        if(COMMNADS[cmd.name].params && cmd.params){//check if command takes any params
                            var valid = true;
                            for(i in cmd.params){//checks that all the params are strings
                                if(!cmd.params[i] || typeof cmd.params[i] != 'string'){
                                    valid = false;
                                }
                            }
                            if(valid){
                                COMMNADS[cmd.name].handler(user,cmd.params);
                            } else {
                                showMessage(user.socket,'Paramters weren\'t properly.. um.. done? You know what you did.');
                                console.log(cmd.name,'An attempt was made by',user.nick,user.remote_addr);
                            }
                        } else if(!COMMNADS[cmd.name].params){//command with no paramters
                            COMMNADS[cmd.name].handler(user);
                        } else {
                            showMessage(user.socket,'Missing paramters','error');
                        }
                    } else {
                        showMessage(socket,'Don\'t have access to this command');
                    }
                } else {//command doesn't exist
                    showMessage(socket,'That command doesn\'t exist');
                }
            }
        });
        
        socket.on('disconnect', function(){
            var i = indexOf(user.nick);
            if(i != -1){
                channel.online.splice(i,1);
            } else {
                console.log('user has disappeared from time and space, he will be missed');
            }
            if(positions[socket.id]){
                roomEmit('left',socket.id);
                delete positions[socket.id];
            }
        });
       
        function attemptJoin(data,mapdata,login){
			
			function join(){
				console.log('USER JOINED',data,user.remote_addr);
				positions[socket.id] = {};
				if(!user.nick) user.nick = socket.id;//if no nick generate nick
				//Make array of all online users
				var avatars = [];
				for(var i in channel.online){
					var Juser = channel.online[i];
					if(Juser){//grab all user info
						avatars.push({
							avy : Juser.avy,
							id : Juser.socket.id,
							nick : Juser.nick
						});
					}
				}
				
				channel.online.push(user);
				socket.join('chat');
				socket.emit('MapInfo',{
                    avatars : avatars,
                    map : {
                        tiles : mapdata.tiles,
                        objects : mapdata.objects,
                        spawn : mapdata.spawn
                    }
                });
                socket.emit('chatinfo',mapdata.data);
                roomEmit('join', {
                    nick : user.nick,
                    id : socket.id
                });
                
                //get stored avys
                var AvyFolder = 'public/images/avatars/' + user.nick;
                if(fs.existsSync(AvyFolder)){
                    fs.readdir(AvyFolder, function(err,files){
                        if (err) throw err;
                        user.socket.emit('update',{
                            avatars : files
                        });
                    });
                }
			}
			
            var joincount = 0;
            for(var i in channel.online){
                if(channel.online[i].remote_addr == user.remote_addr){//check how many users have the same ip
                    if(++joincount >= 4){
                        showMessage(socket,'There are already several users joined with your ip','error');
                        socket.disconnect();
                    }
                }
            }
			
            if(data.nick && indexOf(data.nick) == -1){//if nick is given make sure nobody else is using it
                if(!/^[\x21-\x7E]*$/i.test(data.nick)){//make sure nick doesn't contain funny characters
                    showMessage(socket,'Nick contained invalid characters.','error');
                    join();
                } else {
                    dao.find(data.nick).then(function(dbuser){
                        if(!dbuser){//if not registered, make sure nick isn't too long
                            user.nick = data.nick.substr(0,50);
                        } else {
                            if(login || (tokens[data.nick] && data.token == tokens[data.nick])){//compare token, check if login is valid 
                                user.nick = dbuser.nick;
                                user.role = dbuser.role;
                                dao.setUserinfo(dbuser.nick,'remote_addr',user.remote_addr);//update users IP
                            } else {
                                user.nick = user.socket.id;
                            }
                        }
                        join();
                    });
                }
            } else {
                join();
            }
        }
        
        var core = {
            join : function(data,dbuser,channeldata){
                dao.banlist(channelName).then(function(list){//get ban list
                    if(list.indexOf(data.nick) == -1 && list.indexOf(user.remote_addr) == -1){//make sure user isn't banned
                        attemptJoin(data,channeldata);
                    } else {//user is banned
                        showMessage(user.socket,'You are banned');
                        user.socket.disconnect();
                    }
                });
            }
        }
        
        socket.on('core', function(info){// handle all core functions, and supply functions with necessary information
            throttle.on(user.remote_addr,true).then(function(ok){
                if(ok){
                    if(info.command && typeof info.command == 'string' && info.data && typeof info.data == 'object'){//make sure we have basic information
                        var command = info.command;
                        var data = info.data;
                        var valid = true;
                        var accept = 'nick question password token'.split(' ');
                        for(i in data){//checks that all the params are strings
                            if(accept.indexOf(i) != -1){
                                if(typeof data[i] != 'string' && data[i].length >= 2000){
                                    valid = false;
                                }  
                            } else {
                                delete data[i];
                            }
                        }
                        if(valid){
                            var channeldata = {};
                            dao.getChannelinfo(channelName).then(function(channelinfo){//get all channel info
                                dao.find(data.nick).then(function(dbuser){
                                    core[command](data,dbuser,channelinfo);
                                });
                            });   
                        } else {
                            showMessage(socket,'core error, let the sammich know','error');
                            console.log('core error')
                        } 
                    }
                } else {
                    showMessage(user.socket,'You are spamming, stop or you will be temporarily banned.','error');
                    throttle.warn(user.remote_addr);
                }
            }).fail(function(){
                dao.ban(channelName,user.remote_addr);
                showMessage(user.socket,'You have been banned for spamming.','error');
                socket.disconnect();
            });
        });
    });
    
    var COMMNADS = {
        avy : {
            params : ['avy','name'],
            handler : function(user,params){
                if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(params.avy)){
                    dao.find(user.nick).then(function(dbuser){
                        var AvyFolder = 'public/images/avatars/';
                        if(dbuser){
                            AvyFolder += (dbuser.nick + '/');
                            if(!fs.existsSync(AvyFolder)){//if folder doesn't exist. make folder
                                fs.mkdirSync(AvyFolder);
                            }
                        }
                        fs.writeFile(AvyFolder + '/' + params.name, params.avy.replace(/^data:image\/png;base64,/, ''), 'base64', function(err){
                            if (err) throw err
                            roomEmit('MapInfo',{
                                avatars : [{
                                    avy : AvyFolder.slice(6) + params.name,
                                    id : user.socket.id
                                }]
                            });
                            user.avy = AvyFolder.slice(6) + params.name;
                        });
                    });
                } else {
                    console.log('Avatar hack attempt',user.nick,user.remote_addr);
                }
            }
        }, 
        nick : {
            params : ['nick'],
            handler : function(user,params){
                dao.find(params.nick).then(function(dbuser){
                    if(!dbuser){
                        if(/^[\x20-\x7F]*$/i.test(params.nick)){
                            var nick = params.nick.substr(0,50);
                            var index = indexOf(nick);
                            if(index == -1){
                                user.nick = nick;
                                user.role = 3;
                                roomEmit('nick',{
                                    nick : nick,
                                    id : user.socket.id
                                });
                                user.socket.emit('update', {
                                    nick : user.nick
                                });
                            } else {
                                showMessage(user.socket,'Someone is already using that nick, please choose a different one','error');
                            }
                        } else {
                            showMessage(user.socket,'Nick contains invalid characters.','error');
                        }
                    } else {
                        showMessage(user.socket,params.nick + ' is registered use /login');
                    }
                });
            }
        },
        register : {
            params : ['password'],
            handler : function(user,params){
                var nick = user.nick.substr(0,50);
                dao.register(nick,params.password,user.remote_addr).then(function(err){
                    if(!err){
                        showMessage(user.socket,'Nick has been registered');
                    } else {
                        console.log(err);
                    }
                });
            }
        },
        login : {
            params : ['nick','password'],
            handler : function(user,params){
                dao.find(params.nick).then(function(dbuser){
                    if(dbuser){
                        dao.login(params.nick,params.password).then(function(res){
                            if(res){
                                var index = indexOf(dbuser.nick);//disconnect to prevent two users with the same name
                                if(index != -1) channel.online[index].socket.disconnect();
                                //emit nick change
                                roomEmit('nick',{
                                    nick : dbuser.nick,
                                    id : user.socket.id
                                });
                                //assigning user info
                                user.nick = dbuser.nick;
                                user.role = dbuser.role;
                                //updating token
                                tokens[user.nick] = dao.makeid();
                                user.token = tokens[user.nick];
                                //get stored avys
                                var AvyFolder = 'public/images/avatars/' + dbuser.nick;
                                if(fs.existsSync(AvyFolder)){
                                    fs.readdir(AvyFolder, function(err,files){
                                        if (err) throw err;
                                        user.socket.emit('update',{
                                            avatars : files
                                        });
                                    });
                                }
                                //updating info client side
                                user.socket.emit('update', {
                                    token : user.token,
                                    nick : user.nick, 
                                    role : dbuser.role
                                });
                            } else {
                                showMessage(user.socket,'Wrong password','error');
                            }
                        });
                    } else {
                        showMessage(user.socket,'That account doesn\'t exist','error');
                    }
                });
            }
        },
        kick : {
            role : 0,
            params : ['nick', 'message'],
            handler : function(user,params){
                var i = indexOf(params.nick);
                if(i != -1){
                    var s = channel.online[i].socket;
                    showMessage(s,params.message ? 'You\'ve been kicked: ' + params.message : 'You\'ve been kicked','error');
                    s.disconnect();
                    //Check if userdata is still here for some reason
                    setTimeout(function(){
                    var Check = indexOf(params.nick);
                        if(Check != -1){
                            showMessage(user.socket,params.nick + ' was a ghost.');
                            channel.online.splice(Check,1)
                        }
                    },2000);
                    emitMessage(user.nick + ' has kicked ' + params.nick + (params.message ? ': ' + params.message : ''), 'general');
                } else {
                    showMessage(user.socket,'That user doesn\'t appear to be online','error');
                }
            }
        },
        ban : {
            role : 0,
            params : ['nick','message'],
            handler : function(user, params){
                var i = indexOf(params.nick);
                if(i != -1){
                    var s = channel.online[i].socket;
                    showMessage(s,params.message ? 'You\'ve been banned: ' + params.message : 'You\'ve been banned');
                    s.disconnect();
                }
                dao.ban(channelName,params.nick).then(function(err){
                    if(!err){
                        showMessage(user.socket, params.nick + ' has been banned');
                        emitMessage(user.nick + ' has banned ' + params.nick + (params.message ? ': ' + params.message : ''), 'general');
                    } else if(err == 2){
                        showMessage(user.socket,params.nick + ' is already banned');
                    } else {
                        console.log(err);
                    }
                });
            }
        },
        banip : {
            role : 0,
            params : ['nick','message'],
            handler : function(user, params){
                var i = indexOf(params.nick);
                if(i != -1){
                    var s = channel.online[i];
                    showMessage(s.socket,params.message ? 'You\'ve been banned: ' + params.message : 'You\'ve been banned');
                    showMessage(user.socket, params.nick + ' has been IP banned');
                    dao.ban(channelName,s.remote_addr);
                    s.socket.disconnect();   
                } else {
                    dao.find(params.nick).then(function(dbuser){
                        if(dbuser){
                            dao.ban(channelName,dbuser.remote_addr);
                            showMessage(user.socket, params.nick + ' has been IP banned');
                        } else {
                            showMessage(user.socket, params.nick + ' doesn\'t exist.','error');
                        }
                    });
                }
            }
        },
        unban : {
            role : 0,
            params : ['nick'],
            handler : function(user, params){
                dao.unban(channelName,params.nick).then(function(err){
                    if(!err){
                        showMessage(user.socket, params.nick + ' has been unbanned');
                    } else {
                        showMessage(user.socket, params.nick + ' doesn\'t appear to be banned','error');
                    }
                });
            }
        },
        banlist : {
            handler : function(user){
                dao.banlist(channelName).then(function(list){
                    if(list.length){
                        showMessage(user.socket,'Channel banned: ' + list.join(', '));
                    } else {
                        showMessage(user.socket,'Nobody banned on this channel.');
                    }
                });
            }
        },
        note : {
            role : 0,
            params : ['note'],
            handler : function(user,params){
                var note = params.note.substr(0,3000);
                dao.setChatinfo(channelName,'note',note).then(function(err){
                    if(!err){
                        roomEmit('chatinfo',JSON.stringify({
                            note : note
                        }));
                    }
                });
            }
        },
        topic : {
            role : 2,
            params : ['topic'],
            handler : function(user,params){
                var topic = params.topic.substr(0,500);
                dao.setChatinfo(channelName,'topic',topic).then(function(err){
                    if(!err){
                        roomEmit('chatinfo',JSON.stringify({
                            topic : topic
                        }));
                    }
                });
            }
        },
        whois : {
            params : ['nick'],
            handler : function(user,params){
                dao.find(params.nick).then(function(dbuser){
                    var message, info;
                    var i = indexOf(params.nick);
                    if(i == -1 && dbuser){//if user is offline and registered pull info from database
                        info = dbuser;
                    } else {
                        info = i != -1 ? channel.online[i] : false;
                    }
                    if(info){
                        message = 'User: ' + info.nick + '\n Role: ' + info.role + '\n IP: ' + (user.role <= 1 ? info.remote_addr : 'Private') + '\n Mask: null' + '\n Registered: ' + (dbuser ? 'Yes' : 'No');
                    } else {
                        message = params.nick + ' doesn\'t exist';
                    }
                    showMessage(user.socket, message);
                });
            }
        }
    }    
    
    function indexOf(nick,id){
        if(nick || id) {
            for( var i = 0; i < channel.online.length; i++){
                if(!id && channel.online[i].nick.toLowerCase() == nick.toLowerCase() || id && channel.online[i].socket.id == id){
                    return i;
                }
            }
        }
        return -1;
    }
    
    function showMessage(socket,message,style){
        if(typeof message == 'string'){
            message = {
                message : message
            };
        }
        message.style = style ? style : message.style;
        socket.emit('message', message);
    }
    
    function emitMessage(message,style){
        if(typeof message == 'string'){
            message = {
                message : message
            };
        }
        message.style = style ? style : message.style;
        roomEmit('message', message);
    }
    
    function roomEmit(){
        room.in('chat').emit.apply(room, arguments);
    }
    
    return true;
}

var Edits = {};

function Editor(io,channelName){
    var room = io.of(channelName);
    channelName = channelName.substr(5);
    console.log('Starting: ' + channelName);
    room.on('connection', function(socket){
        console.log(channelName,'connected')
        socket.on('RequestTiles', function(){
            var objects = [];
            fs.readdir('public/images/tiles',function(err,files){
                if (err) throw err;
                files.forEach(function(file){
                    objects.push(file);
                });
                socket.emit('Tiles',objects);
            }); 
        });
                
        socket.on('SaveMapTiles',function(data){
            var Tiles = sort(data.tiles);
            var Objects = sort(data.objects);
            var spawn = data.spawn;
            if(Tiles.length <= 50000 && Objects.length <= 5000){
                dao.setChannelinfo(Tiles,'tiles',channelName).then(function(err){
                    if(err){
                        console.log(err);
                    } else {
                        dao.setChannelinfo(Objects,'objects',channelName);
                        dao.setChannelinfo(spawn,'spawn',channelName);
                    }
                });
            }
        });
        
        function sort(Tiles){
            Tiles.sort(function(a,b){
                return a.order - b.order;
            });
            return Tiles;
        }
        
        socket.on('GetMap', function(){
            dao.getChannelinfo(channelName).then(function(data){
                socket.emit('MapInfo',data);
            });
        });
        
    });
    return true;
}

function initApp(app, http, editor){
    var channelRegex = /^\/((?!edit)\w*\/?)$/;
    var io = require('socket.io')(http);
    app.use(express.static(__dirname + '/public'));
    app.get(channelRegex, function(req, res){
        if(!channels[req.originalUrl]){//create channel if it doesn't exist
            channels[req.originalUrl] = createChannel(io, req.originalUrl);
        }
        var index = fs.readFileSync(__dirname + '/index.html').toString();
        res.send(index);
    });
    
    editor.get(channelRegex, function(req, res){
        var index = fs.readFileSync(__dirname + '/public/editslol/index.html').toString();
        res.send(index);
        if(!Edits[req.originalUrl]){//create channel if it doesn't exist
            Edits[req.originalUrl] = Editor(io, req.originalUrl);
        }
    });
    
    app.use(['/edit/*','/edit/','/edit','edit'], editor);
    
}

(function(){
    var app = express();
    var http = require('http').Server(app);
    var editor = express();
    http.listen(80, function(){
        console.log('listening on *:80');
        initApp(app, http, editor);
    });
})();
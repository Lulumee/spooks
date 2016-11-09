var dao = require('./dao');
var throttle = require('./throttle');
var config = require('./config');
var request = require('request');
var _ = require('underscore');
var $ = require('jquery-deferred'); // We don't use this.
var express = require('express');
var fs = require('fs');

var channels = {};

function createChannel(io, channelName) {
    var channelNick = channelName.replace(new RegExp('.?' + mainDomain + '(:\\d+)?\/'), '/');

    var room = io.of(channelName);
    var positions = {};

    console.log('{' + 'log: "' + 'channel created' + '", timedate: "' + new Date() + '", channel_name: "' + channelName + '", channel_nick: "' + channelNick + '"}');

    setInterval(function() {
        awakeEmit('positions', positions);
    }, 25);

    var tokens = {};
    var channel = {
        online: []
    };

    room.on('connection', function(socket) {
        var user = {
            remote_addr: socket.request.connection.remoteAddress,
            socket: socket,
            id: dao.makeid(),
            role: 7,
            awake: true
        };

        console.log('{' + 'log: "' + 'channel user connected' + '", timedate: "' + new Date() + '", channel_name: "' + channelName + '", channel_nick: "' + channelNick + '", id: "' + socket.id + '", ip: "' + user.remote_addr + '"}');

        if (user.remote_addr.substr(0, 7) == '::ffff:') { // If IP contains '::ffff:', remove it
            user.remote_addr = user.remote_addr.substr(7);
        }

        socket.on('position', function(data) {
            positions[socket.id] = {
                x: data.x,
                y: data.y,
                frameY: data.frameY
            }
        });

        // Handle messages
        socket.on('message', function(message) {
            throttle.on(user.remote_addr).then(function(ok) {// Throttle all messages
                if (ok) {
                    if (indexOf(user.nick) != -1 && message && message.message) {
						emitMessage({
                            message: message.message.substr(0, 10000),
                            nick: user.nick || socket.id,
                            flair: message.flair,
                            style: 'chat'
                        });
                    } else {
                        console.log('{' + 'log: "' + 'message error' + '", timedate: ' + new Date() + '", channel_nick: "' + channelNick + '", id: "' + socket.id + '", ip: "' + user.remote_addr + '", nick: "' + user.nick + '", message: "' + message + '"}');
                    }
                } else { // Give warning if spamming
                    showMessage(user.socket, 'You are spamming, stop or you will be temporarily banned.', 'error');
                    throttle.warn(user.remote_addr);
                }
            }).fail(function() { // Ban after 3 warnings
                dao.ban(channelNick, user.remote_addr);
                showMessage(user.socket, 'You have been banned for spamming.', 'error');
                socket.disconnect();
            });
        });

        // Handle commands
        socket.on('command', function(cmd) {
            if (cmd.name === 'login' || cmd.name === 'register' || cmd.name === 'me' || cmd.name === 'pm') {
                console.log('{' + 'log: "' + 'command' + '", timedate: "' + new Date() + '", channel_nick: "' + channelNick + '", id: "' + socket.id + '", ip: "' + user.remote_addr + '", nick: "' + user.nick + '", command_name: "' + cmd.name + '"}');
            } else {
                console.log('{' + 'log: "' + 'command' + '", timedate: "' + new Date() + '", channel_nick: "' + channelNick + '", id: "' + socket.id + '", ip: "' + user.remote_addr + '", nick: "' + user.nick + '", command_data: "', cmd, '"}');
            }
            if (cmd && cmd.name && typeof cmd.name == 'string') {
                if (COMMNADS[cmd.name]) { // Check that command exist
                    if (user.role !== undefined && (COMMNADS[cmd.name].role === undefined || user.role <= COMMNADS[cmd.name].role) && indexOf(user.nick) != -1) { // Make sure user is properly joined
                        if (COMMNADS[cmd.name].params && cmd.params) { // Check if command takes any params
                            var valid = true;
                            for (var i in cmd.params) { // Checks that all the params are strings
                                if (!cmd.params[i] || typeof cmd.params[i] != 'string') {
                                    valid = false;
                                }
                            }
                            if (valid) {
                                COMMNADS[cmd.name].handler(user, cmd.params);
                            } else {
                                showMessage(user.socket, 'Paramters weren\'t properly.. um.. done? You know what you did.');
                                console.log(cmd.name, 'An attempt was made by', user.nick, user.remote_addr);
                            }
                        } else if (!COMMNADS[cmd.name].params) { // Command with no paramters
                            COMMNADS[cmd.name].handler(user);
                        } else {
                            showMessage(user.socket, 'Missing paramters', 'error');
                        }
                    } else {
                        showMessage(socket, 'Don\'t have access to this command');
                    }
                } else { // Command doesn't exist
                    showMessage(socket, 'That command doesn\'t exist');
                }
            }
        });

        socket.on('disconnect', function(e) {
            console.log('{' + 'log: "' + 'user disconnected' + '", timedate: "' + new Date() + '", channel_nick: "' + channelNick + '", id: "' + socket.id + '", ip: "' + user.remote_addr + '", disconnect_message: "' + e + '"}');
            var i = indexOf(user.nick);
            if (i != -1) {
                channel.online.splice(i, 1);
            } else {
                console.log('User has disappeared from time and space, he will be missed');
            }
            if (positions[socket.id]) {
                roomEmit('left', {
                    id: socket.id,
                    part: user.part
                });
                delete positions[socket.id];
            }
        });

        function attemptJoin(data, mapdata, login) {
			function join() {
				// console.log('User joined', data, user.remote_addr); // Old log.
				positions[socket.id] = {};
				if (!user.nick) {
                    user.nick = dao.makeNick(); // If no nick, generate nick
                }
                if (data.part) {
                    user.part = data.part.substr(0, 50);
                }
                
                console.log('{' + 'log: "' + 'user joined' + '", timedate: "' + new Date() + '", channel_nick: "' + channelNick + '", id: "' + socket.id + '", ip: "' + user.remote_addr + '", nick: "' + user.nick + '", join_data: "', data, '"}');

				// Make an array of all online users
				var avatars = [];
				for (var i in channel.online) {
					var Juser = channel.online[i];
					if (Juser) { // Grab all user info
						avatars.push({
							avy: Juser.avy,
							id: Juser.socket.id,
							nick: Juser.nick,
                            position: positions[Juser.socket.id]
						});
					}
				}

				channel.online.push(user);
				socket.join('chat');
                socket.join('awake');
                if (mapdata == undefined) {
                    mapdata = {tiles:'{}', objects:'{}', spawn:'[]', data:'{}'}
                }
				socket.emit('MapInfo', {
                    avatars: avatars,
                    map: {
                        tiles: mapdata.tiles,
                        objects: mapdata.objects,
                        spawn: mapdata.spawn
                    }
                });
                socket.emit('chatinfo', mapdata.data);
                socket.emit('update', {
                    nick: user.nick
                });
                roomEmit('join', {
                    nick: user.nick,
                    id: socket.id
                });

                // Get stored Avys
                var AvyFolder = 'public/data/images/avatars/' + user.nick;
                if (fs.existsSync(AvyFolder)) {
                    fs.readdir(AvyFolder, function(err, files) {
                        if (err) {
                            throw err;
                        }
                        user.socket.emit('update', {
                            avatars: files
                        });
                    });
                }
			}

            var joincount = 0;
            for (var i in channel.online) {
                if (channel.online[i].remote_addr == user.remote_addr) { // Check how many users have the same IP
                    if (++joincount >= 4) {
                        showMessage(socket, 'There are already several users joined with your IP', 'error');
                        socket.disconnect();
                    }
                }
            }

            var nickslist = [];
            if (data.nick && indexOf(data.nick) == -1) { // If nick is given, make sure nobody else is using it
                if (!/^[\x21-\x7E]*$/i.test(data.nick)) { // Make sure nick doesn't contain funny characters
                    showMessage(socket, 'Nick contained invalid characters.', 'error');
                    join();
                } else {
                    dao.find(data.nick).then(function(dbuser) {
                        if (!dbuser) { // If not registered, make sure nick isn't too long
                            user.nick = data.nick.substr(0, 50);
                        } else {
                            if (login || (tokens[data.nick] && data.token == tokens[data.nick])) { // Compare token, check if login is valid
                                user.nick = dbuser.nick;
                                user.role = dbuser.role;
                                dao.setUserinfo(dbuser.nick, 'remote_addr', user.remote_addr); // Update users IP
                            } else {
                                for (var i in channel.online) { // Make a list of nicks.
                                    nickslist.push(channel.online[i].nick);
                                }
                                do { // Cheak if nick already exists. Prbobly should be done differenlty to avoid an endless loop by mistake!
                                    user.nick = dao.makeNick();
                                } while (nickslist.indexOf(user.nick) != -1);
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
            join: function(data, dbuser, channeldata) {
                dao.banlist(channelNick).then(function(list) { // Get ban list
                    if (list.indexOf(data.nick) == -1 && list.indexOf(user.remote_addr) == -1) { // Make sure user isn't banned
                        if (channeldata == undefined) { // Check if there's no channel data.
                            dao.getChannelinfo('/404').then(function(channel404) { // Get default channel data.
                                channeldata = channel404;
                                attemptJoin(data, channeldata);
                            });
                        } else {
                            attemptJoin(data, channeldata);
                        }
                    } else { // User is banned
                        showMessage(user.socket, 'You are banned');
                        user.socket.disconnect();
                    }
                });
            },
            uploadAvy: function(data, dbuser) { // We don't use this var :/ `dbuser`
                if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.avy)) {
                    dao.find(user.nick).then(function(dbuser) {
                        var AvyFolder = 'public/data/images/avatars/';
                        if (dbuser) {
                            AvyFolder += (dbuser.nick + '/');
                            if (!fs.existsSync(AvyFolder)) { // If folder doesn't exist, make folder
                                fs.mkdirSync(AvyFolder);
                            }
                        }
                        fs.writeFile(AvyFolder + '/' + data.name, data.avy.replace(/^data:image\/png;base64,/, ''), 'base64', function(err) {
                            if (err) {
                                throw err;
                            }
                            roomEmit('MapInfo', {
                                avatars: [{
                                    avy: AvyFolder.slice(6) + data.name,
                                    id: user.socket.id
                                }]
                            });
                            user.avy = AvyFolder.slice(6) + data.name;
                        });
                    });
                } else {
                    console.log('Avatar hack attempt', user.nick, user.remote_addr);
                }
            }
        }

        socket.on('core', function(info) { // Handle all core functions, and supply functions with necessary information
            throttle.on(user.remote_addr, true).then(function(ok) {
                if (ok) {
                    console.log('{' + 'log: "' + 'core request' + '", timedate: "' + new Date() + '", channel_nick: "' + channelNick + '", id: "' + socket.id + '", ip: "' + user.remote_addr + '", command_name: "' + info.command + '"}');
                    if (info.command && typeof info.command == 'string' && info.data && typeof info.data == 'object') { // Make sure we have basic information
                        var command = info.command;
                        var data = info.data;
                        var valid = true;
                        var accept = 'nick question password token avy name part'.split(' ');
                        for (var i in data) { // Checks that all the params are strings
                            if (accept.indexOf(i) != -1) {
                                if (typeof data[i] != 'string') {
                                    valid = false;
                                }
                            } else {
                                delete data[i];
                            }
                        }
                        if (valid) {
                            var channeldata = {}; // We don't use this var :/
                            dao.getChannelinfo(channelNick).then(function(channelinfo) { // Get all channel info.
                                dao.find(data.nick).then(function(dbuser) {
                                    // console.log(command); //Old log.
                                    console.log('{' + 'log: "' + 'core success' + '", timedate: "' + new Date() + '", channel_nick: "' + channelNick + '", id: "' + socket.id + '", ip: "' + user.remote_addr + '", command_name: "' + info.command + '"}');
                                    core[command](data, dbuser, channelinfo);
                                });
                            });
                        } else {
                            showMessage(socket, 'core error, let the sammich know', 'error');
                            console.log('core error');
                        }
                    }
                } else {
                    showMessage(user.socket, 'You are spamming, stop or you will be temporarily banned.', 'error');
                    throttle.warn(user.remote_addr);
                }
            }).fail(function() {
                dao.ban(channelNick, user.remote_addr);
                showMessage(user.socket, 'You have been banned for spamming.', 'error');
                socket.disconnect();
            });
        });
    });

    /*
        Roles:
        0, 1: God, Dev/Super
        2: Owner
        3, 4, 5: Master, Admin, Mod, for different channel commands
        6: Registered
        7: Unregistered
        8: Poop
    */

    var COMMNADS = {
        avy: {
            params: ['name'],
            handler: function(user, params) {
                dao.find(user.nick).then(function(dbuser) {
                    if (dbuser) {
                        var Avy = 'public/data/images/avatars/' + dbuser.nick + '/' + params.name;
                        fs.access(Avy, fs.F_OK, function(err) {
                            if (!err) {
                               roomEmit('MapInfo', {
                                    avatars: [{
                                        avy: Avy.slice(6),
                                        id: user.socket.id
                                    }]
                                });
                                user.avy = Avy.slice(6);
                            } else {
                                showMessage(user.socket, 'Avy not found', 'error');
                            }
                        });
                    }
                });
            }
        },
        removeavy: {
            params: ['name'],
            handler: function(user,params) {
                dao.find(user.nick).then(function(dbuser) {
                    if (dbuser) {
                        var AvyFolder = 'public/data/images/avatars/' + dbuser.nick + '/' + params.name;
                        fs.access(AvyFolder, fs.F_OK, function(err) {
                            if (!err) {
                                fs.unlink(AvyFolder);
                                showMessage(user.socket, 'Image removed');
                            } else {
                                showMessage(user.socket, 'Image doesn\'t exist', 'error');
                            }
                        });
                    }
                });
            }
        },
        nick: {
            params: ['nick'],
            handler: function(user, params) {
                dao.find(params.nick).then(function(dbuser) {
                    if (!dbuser) {
                        if (/^[\x21-\x7F]*$/i.test(params.nick)) {
                            var nick = params.nick.substr(0, 50);
                            var index = indexOf(nick);
                            if (index == -1) {
                                user.nick = nick;
                                user.role = 7;
                                roomEmit('nick', {
                                    nick: nick,
                                    id: user.socket.id
                                });
                                user.socket.emit('update', {
                                    nick: user.nick
                                });
                            } else {
                                showMessage(user.socket, 'Someone is already using that nick, please choose a different one', 'error');
                            }
                        } else {
                            showMessage(user.socket, 'Nick contains invalid characters.', 'error');
                        }
                    } else {
                        showMessage(user.socket, params.nick + ' is registered use /login');
                    }
                });
            }
        },
        register: {
            params: ['password'],
            handler: function(user, params) {
                var nick = user.nick.substr(0, 50);
                dao.register(nick, params.password, user.remote_addr).then(function(err) {
                    if (!err) {
                        showMessage(user.socket, 'Nick has been registered');
                    } else {
                        console.log(err);
                    }
                });
            }
        },
        login: {
            params: ['nick', 'password'],
            handler: function(user, params) {
                if (user.nick == params.nick) { // Check if user is already logged in.
                    showMessage(user.socket, 'You\'re already logged in, dingus');
                } else {
                    dao.find(params.nick).then(function(dbuser) {
                        if (dbuser) {
                            dao.login(params.nick, params.password).then(function(res) {
                                if (res) {
                                    var index = indexOf(dbuser.nick); // Disconnect to prevent two users with the same name
                                    if (index != -1) {
                                        channel.online[index].socket.disconnect();
                                    }
                                    // Emit nick change
                                    roomEmit('nick', {
                                        nick: dbuser.nick,
                                        id: user.socket.id
                                    });
                                    // Assigning user info
                                    user.nick = dbuser.nick;
                                    user.role = dbuser.role;
                                    // Updating token
                                    tokens[user.nick] = dao.makeid();
                                    user.token = tokens[user.nick];
                                    // Get stored Avys
                                    var AvyFolder = 'public/data/images/avatars/' + dbuser.nick;
                                    if (fs.existsSync(AvyFolder)) {
                                        fs.readdir(AvyFolder, function(err, files) {
                                            if (err) {
                                                throw err;
                                            }
                                            user.socket.emit('update', {
                                                avatars: files
                                            });
                                        });
                                    }
                                    // Updating info, client side
                                    user.socket.emit('update', {
                                        token: user.token,
                                        nick: user.nick,
                                        role: dbuser.role
                                    });
                                } else {
                                    showMessage(user.socket, 'Wrong password', 'error');
                                }
                            });
                        } else {
                            showMessage(user.socket, 'That account doesn\'t exist', 'error');
                        }
                    });
                }
            }
        },
        me: {
            params: ['message'],
            handler: function(user, params) {
                var message = user.nick + ' ' + params.message.substr(0, 5000);
                emitMessage(message, 'action');
            }
        },
        pm: {
            params : ['nick', 'message'],
            handler : function (user, params) {
                var i = indexOf(params.nick), pmTo;
                if (i !== -1) {
                    if (params.message && params.message.length < 5000) {
                        pmTo = channel.online[i];
                        pmTo.socket.emit('message', {
                            message: ' ' + params.message,
                            style: 'personal',
                            nick: user.nick
                        });

                        if (pmTo.id !== user.id) {
                            user.socket.emit('message', {
                                message: ' ' + params.message,
                                style: 'personal',
                                nick: user.nick,
                                toNick: pmTo.nick
                            });   
                        }
                    } else {
                        showMessage(user.socket, 'Personal message invalid or very large.', 'error');
                    }
                } else {
                    showMessage(user.socket, 'The user you\'re trying to message isn\'t online.', 'error');
                }
                
            }
        },
        kick: {
            role: 5,
            params: ['nick', 'message'],
            handler: function(user,params) {
                var i = indexOf(params.nick);
                if (i != -1) {
                    var s = channel.online[i].socket;
                    showMessage(s, params.message ? 'You\'ve been kicked: ' + params.message : 'You\'ve been kicked', 'error');
                    s.disconnect();
                    // Check if userdata is still here for some reason
                    setTimeout(function() {
                        var Check = indexOf(params.nick);
                        if (Check != -1) {
                            showMessage(user.socket, params.nick + ' was a ghost.');
                            channel.online.splice(Check, 1);
                        }
                    }, 2000);
                    emitMessage(user.nick + ' has kicked ' + params.nick + (params.message ? ': ' + params.message : ''), 'general');
                } else {
                    showMessage(user.socket, 'That user doesn\'t appear to be online', 'error');
                }
            }
        },
        ban: {
            role: 4,
            params: ['nick', 'message'],
            handler: function(user, params) {
                var i = indexOf(params.nick);
                if (i != -1) {
                    var s = channel.online[i].socket;
                    showMessage(s, params.message ? 'You\'ve been banned: ' + params.message : 'You\'ve been banned');
                    s.disconnect();
                }
                dao.ban(channelNick, params.nick).then(function(err) {
                    if (!err) {
                        showMessage(user.socket, params.nick + ' has been banned');
                        emitMessage(user.nick + ' has banned ' + params.nick + (params.message ? ': ' + params.message : ''), 'general');
                    } else if (err == 2) {
                        showMessage(user.socket, params.nick + ' is already banned');
                    } else {
                        console.log(err);
                    }
                });
            }
        },
        banip: {
            role: 4,
            params: ['nick', 'message'],
            handler: function(user, params) {
                var i = indexOf(params.nick);
                if (i != -1) {
                    var s = channel.online[i];
                    showMessage(s.socket, params.message ? 'You\'ve been banned: ' + params.message : 'You\'ve been banned');
                    showMessage(user.socket, params.nick + ' has been IP banned');
                    dao.ban(channelNick, s.remote_addr);
                    s.socket.disconnect();
                } else {
                    dao.find(params.nick).then(function(dbuser) {
                        if (dbuser) {
                            dao.ban(channelNick, dbuser.remote_addr);
                            showMessage(user.socket, params.nick + ' has been IP banned');
                        } else {
                            showMessage(user.socket, params.nick + ' doesn\'t exist.', 'error');
                        }
                    });
                }
            }
        },
        unban: {
            role: 4,
            params: ['nick'],
            handler: function(user, params) {
                dao.unban(channelNick, params.nick).then(function(err) {
                    if (!err) {
                        showMessage(user.socket, params.nick + ' has been unbanned');
                    } else {
                        showMessage(user.socket, params.nick + ' doesn\'t appear to be banned', 'error');
                    }
                });
            }
        },
        banlist: {
            role: 4,
            handler: function(user) {
                dao.banlist(channelNick).then(function(list) {
                    if (list.length) {
                        showMessage(user.socket, 'Channel banned: ' + list.join(', '));
                    } else {
                        showMessage(user.socket, 'Nobody banned on this channel.');
                    }
                });
            }
        },
        globalrole: {
            role: 1,
            params: ['nick', 'role'],
            handler: function(user, params) {
                if (params.role <= 8 && params.role >= 2) {
                    dao.find(params.nick).then(function(dbuser) {
                        if (dbuser) {
                            dao.setUserinfo(dbuser.nick, 'role', params.role).then(function(err) {
                                if (!err) {
                                    showMessage(user.socket, dbuser.nick + ' now has role ' + params.role);
                                    var index = indexOf(params.nick);
                                    if (index != -1) {
                                        var auser = channel.online[index];
                                        auser.role = params.role;
                                        auser.socket.emit('update', {
                                            role: auser.role
                                        });
                                    }
                                } else {
                                    console.log(err);
                                }
                            });
                        } else {
                            showMessage(user.socket, 'Can only change role to registered users.', 'error');
                        }
                    });
                } else {
                    showMessage(user.socket, 'That isn\'t a valid role.', 'error');
                }
            }
        },
        note: {
            role: 3,
            params: ['note'],
            handler: function(user, params) {
                var note = params.note.substr(0, 3000);
                dao.setChannelinfo(channelNick, 'data', note, 'note').then(function(err) {
                    if (!err) {
                        roomEmit('chatinfo', JSON.stringify({
                            note: note
                        }));
                    }
                });
            }
        },
        topic: {
            role: 5,
            params: ['topic'],
            handler: function(user, params) {
                var topic = params.topic.substr(0, 500);
                dao.setChannelinfo(channelNick, 'data', topic, 'topic').then(function(err) {
                    if (!err) {
                        roomEmit('chatinfo', JSON.stringify({
                            topic: topic
                        }));
                    }
                });
            }
        },
        theme: {
            role: 3,
            params: ['TitlebarColor', 'ButtonsColor', 'InputbarColor', 'ScrollbarColor'],
            handler: function(user, params) {
                if (params.TitlebarColor && params.ButtonsColor && params.InputbarColor && params.ScrollbarColor && params.TitlebarColor.length < 20 && params.ButtonsColor.length < 20 && params.InputbarColor.length < 20 && params.ScrollbarColor.length < 20) {
                    var colors = [params.TitlebarColor, params.ButtonsColor, params.InputbarColor, params.ScrollbarColor];
                    dao.setChannelinfo(channelNick, 'data', colors, 'theme').then(function(err) {
                        if (!err) {
                            roomEmit('chatinfo', JSON.stringify({
                                theme: colors
                            }));
                            showMessage(user.socket, 'Theme colors updated.');
                        }
                    });
                } else {
                    showMessage(user.socket, 'Parameters incomplete or too long.');
                }
            }
        },
        background: {
            role: 3,
            params: ['background'],
            handler: function(user, params) {
                var background = params.background.substr(0, 5000);
                dao.setChannelinfo(channelNick, 'data', background, 'background').then(function(err) {
                    if (!err) {
                        roomEmit('chatinfo', JSON.stringify({
                            background: background
                        }));
                        showMessage(user.socket, 'Background updated.');
                    }
                });
            }
        },
        whoami: {
            handler: function(user) {
                dao.find(user.nick).then(function(dbuser) {
                    var message, info;
                    var i = indexOf(user.nick);
                    info = i != -1 ? channel.online[i] : false;
                    if (info) {
                        message = 'User: ' + info.nick + '\n Role: ' + info.role + '\n IP: ' + info.remote_addr + '\n Mask: null' + '\n Registered: ' + (dbuser ? 'Yes' : 'No');
                    } else {
                        message = 'You don\'t exist in the database or the userlist';
                    }
                    showMessage(user.socket, message);
                });
            }
        },
        whois: {
            params: ['nick'],
            handler: function(user, params) {
                dao.find(params.nick).then(function(dbuser) {
                    var message, info;
                    var i = indexOf(params.nick);
                    if (i == -1 && dbuser) { // If user is offline and registered, pull info from database
                        info = dbuser;
                    } else {
                        info = i != -1 ? channel.online[i] : false;
                    }
                    if (info) {
                        message = 'User: ' + info.nick + '\n Role: ' + info.role + '\n IP: ' + (user.role <= 1 ? info.remote_addr : 'Private') + '\n Mask: null' + '\n Registered: ' + (dbuser ? 'Yes' : 'No');
                    } else {
                        message = params.nick + ' doesn\'t exist';
                    }
                    showMessage(user.socket, message);
                });
            }
        },
        refresh: {
            role: 1,
            handler: function() {
                roomEmit('refresh');
            }
        },
        sleep: {
            handler: function(user) {
                if (user.awake) {
                    user.socket.leave('awake');
                    user.awake = false;
                    user.socket.emit('bed', 'sleep');
                } else {
                    showMessage(user.socket, "You're already asleep.");
                }
            }
        },
        wakeup: {
            handler: function(user) {
                if (!user.awake) {
                    user.socket.join('awake');
                    user.awake = true;
                    user.socket.emit('bed', 'wakeup');
                } else {
                    showMessage(user.socket, "You're already awake.");
                }
            }
        },
        overlay: {
            role: 2,
            params: ['hue', 'saturation', 'brightness', 'transperancy'],
            handler: function(user, params) {
                if (params.hue && params.saturation && params.brightness && params.transperancy && params.hue.length < 20 && params.saturation.length < 20 && params.brightness.length < 20 && params.transperancy.length < 20) {
                    var colors = [params.hue, params.saturation, params.brightness, params.transperancy];
                    dao.setChannelinfo(channelNick, 'data', colors, 'overlay').then(function(err) {
                        if (!err) {
                            roomEmit('chatinfo', JSON.stringify({
                                overlay: colors
                            }));
                            showMessage(user.socket, 'Overlay colors updated.');
                        }
                    });
                } else {
                    showMessage(user.socket, 'Parameters incomplete or too long.');
                }
            }
        },
        part: {
            params: ['part'],
            handler: function(user, params) {
                if (params.part) {
                    user.part = params.part.substr(0, 50);
                    user.socket.emit('update', {
                        part: user.part
                    });
                    showMessage(user.socket, 'Your leave message is now set to: ' + user.nick + ' has left ' + params.part);
                } else {
                    showMessage(user.socket, 'Parameters incomplete');
                }
            }
        },
        unpart: {
            handler: function(user) {
                if (user.part) {
                    showMessage(user.socket, 'Your leave message is now set to: ' + user.nick + ' has left\nIt will reset on your next join unless you remove it from your storage: /remove part');
                } else {
                    showMessage(user.socket, 'You have no part message.');
                }
            }
        },
        leave: {
            params: ['part'],
            handler: function(user, params) {
                if (params.part) {
                    user.part = params.part.substr(0, 50);
                    showMessage(user.socket, 'Disconnecting...');
                    user.socket.disconnect();
                } else {
                    showMessage(user.socket, 'Parameters incomplete');
                }
            }
        }
    }

    function indexOf(nick, id) {
        if (nick || id) {
            for (var i = 0; i < channel.online.length; i++) {
                if (!id && channel.online[i].nick.toLowerCase() == nick.toLowerCase() || id && channel.online[i].socket.id == id) {
                    return i;
                }
            }
        }
        return -1;
    }

    function showMessage(socket, message, style) {
        if (typeof message == 'string') {
            message = {
                message: message
            };
        }
        message.style = style ? style : message.style;
        socket.emit('message', message);
    }

    function emitMessage(message,style) {
        if (typeof message == 'string') {
            message = {
                message: message
            };
        }
        message.style = style ? style : message.style;
        roomEmit('message', message);
    }

    function roomEmit() {
        room.in('chat').emit.apply(room, arguments);
    }

    function awakeEmit() {
        room.in('awake').emit.apply(room, arguments);
    }

    return true;
}

var Edits = {};

function Editor(io, channelName) {
    var room = io.of(channelName);
    channelName = channelName.replace(/edit\//, '');
    channelNick = channelName.replace(RegExp('.?' + mainDomain + '(:\\d+)?\/'), '/');
    // console.log('Starting: ' + channelName); // Old log.
    console.log('{' + 'log: "' + 'editor created' + '", timedate: "' + new Date() + '", channel_name: "' + channelName + '", channel_nick: "' + channelNick + '"}');

    room.on('connection', function(socket) {
        // console.log(channelName, 'connected'); // Old log.
        console.log('{' + 'log: "' + 'editor user connected' + '", timedate: "' + new Date() + '", channel_name: "' + channelName + '", channel_nick: "' + channelNick + '", id: "' + socket.id + '", ip: "' + socket.request.connection.remoteAddress + '"}');

        socket.on('RequestTiles', function() {
            var defaultTileSheets = [];
            var userTileSheets = [];
            fs.readdir('public/images/tiles', function(err, files) {
                if (err) {
                    throw err;
                }
                files.forEach(function(file) {
                    defaultTileSheets.push(file);
                });
                socket.emit('Tiles', defaultTileSheets);
            });
            fs.readdir('public/data/images/tiles', function(err, files) {
                if (err) {
                    throw err;
                }
                files.forEach(function(file) {
                    userTileSheets.push(file);
                });
                socket.emit('Tiles', userTileSheets);
            });
        });

        socket.on('SaveMapTiles', function(data) {
            var Tiles = data.tiles;
            var Objects = data.objects;
            var spawn = data.spawn;
            if (typeof Tiles == 'string' && typeof Objects == 'string') {
                dao.setChannelinfo(channelNick, 'tiles', Tiles).then(function(err) {
                    if (err) {
                        console.log(err);
                    } else {
                        dao.setChannelinfo(channelNick, 'objects', Objects);
                        dao.setChannelinfo(channelNick, 'spawn', spawn);
                    }
                });
            }
        });

        socket.on('GetMap', function() {
            dao.getChannelinfo(channelNick).then(function(data) {
                socket.emit('MapInfo', data);
            });
        });

    });
    return true;
}

var mainDomain = config.web.host;
var port = config.web.port;

function initApp(app, http, editor) {
    var channelRegex = /^\/((?!edit)\w*\/?)$/;
    var io = require('socket.io')(http);
    app.use(express.static(__dirname + '/public'));
    app.get(channelRegex, function(req, res) {
        console.log('{' + 'log: "' + 'GET request' + '", timedate: "' + new Date() + '", request_URL: "' + req.originalUrl + '", request_host_header: "' + req.headers.host + '", IP: "' + req.connection.remoteAddress + '"}');
        if (req.headers.host) { // Check for /^[a-z\d]+$/i in the future
            var name = req.headers.host + req.originalUrl; // Full URL
            if (!channels[name]) { // Create channel if it doesn't exist
                channels[name] = createChannel(io, name);
            }
            var index = fs.readFileSync(__dirname + '/index.html').toString();
            res.send(index);
        } else {
            res.send("Invalid header?");
        }
    });

    editor.get(channelRegex, function(req, res) {
        console.log('{' + 'log: "' + 'GET request for editor' + '", timedate: "' + new Date() + '", request_URL: "' + req.originalUrl + '", request_host_header: "' + req.headers.host + '", IP: "' + req.connection.remoteAddress + '"}');
        if (req.headers.host) {
            var name = req.headers.host + req.originalUrl; // Full URL
            var index = fs.readFileSync(__dirname + '/public/editslol/index.html').toString();
            res.send(index);
            if (!Edits[name]) { // Create channel if it doesn't exist
                Edits[name] = Editor(io, name);
            }
        } else {
            res.send("Invalid header?");
        }
    });

    app.use(['/edit/*', '/edit/', '/edit', 'edit'], editor);
}

(function() {
    var app = express();
    var http = require('http').Server(app);
    var editor = express();
    http.listen(port, function() {
        console.log('listening on *:' + port);
        initApp(app, http, editor);
    });
})();

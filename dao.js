var _ = require('underscore');
var $ = require('jquery-deferred');
var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');
var fs = require('fs');

var db_config = {
    host : 'localhost',
    user : 'root',
    password : '',
    database : 'visual'
}

var db;

function handleDisconnect(){
    db = mysql.createConnection(db_config);
    //check for error on connect
    db.connect(function(err){
        if(err) console.log(err)
    });

    db.on('error', function(err){
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST'){
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

handleDisconnect();

module.exports = {
    register : function(nick,pass,IP){
        var defer = $.Deferred();
        var sql = "INSERT INTO `visual`.`users`(`nick`,`role`,`pass`,`remote_addr`) VALUES(?,3,?,?)";
        bcrypt.genSalt(10, function(err, salt){
            bcrypt.hash(pass, salt, null, function(err, hash){
                db.query(sql, [nick,hash,IP], function(err, rows, fields){
                    defer.resolve(err).promise();
                });
            });
        });
        return defer;
    },
    login : function(nick,pass){
        var defer = $.Deferred();
        var sql = "SELECT * FROM `users` WHERE `nick` = ?";
        db.query(sql, nick, function(err, rows, fields){
            if(rows && rows[0]){
                bcrypt.compare(pass, rows[0].pass, function(err, res){
                    defer.resolve(res,rows[0].pass).promise();
                });
            } else {
                defer.resolve(false).promise();
            }
        });
        return defer;
    },
    find : function(nick){
        var defer = $.Deferred();
        var sql = "SELECT * FROM `users` WHERE `nick` = ?";
        db.query(sql, nick, function(err, rows, fields){
            if(rows){
                defer.resolve(rows[0]).promise();
            } else {
                defer.resolve(false).promise();
            }
        });
        return defer
    },
    getChannelinfo : function(channelName){
        var defer = $.Deferred();
        var sql = "SELECT * FROM `channels` WHERE `channel` = ?";
        db.query(sql, channelName , function(err, rows, fields){
            if(rows){
                defer.resolve(rows[0]).promise();
            } else {
                defer.resolve(false).promise();
            }
        });
        return defer;
    },
    setChannelinfo : function(data,att,channelName){
        var defer = $.Deferred();
        var sql = "UPDATE `channels` SET ?? = ? WHERE `channel` = ?";
        this.getChannelinfo(channelName).then(function(info){
            if(!info){//if channel doesn't exist, create it
                db.query("INSERT INTO `channels` (`channel`, `objects`,`ai`,`tiles`,`data`) VALUES (?,'{}','{}','{}','{}');", channelName);
            }
            db.query(sql,[att,JSON.stringify(data),channelName], function(err, rows, fields){
                defer.resolve(err).promise();
            });
        });
        return defer;
    },
    setChatinfo : function(channelName, att, value){
        var defer = $.Deferred();
        var sql = "UPDATE `visual`.`channels` SET `data` = ? WHERE `channels`.`channel` = ?";
        this.getChannelinfo(channelName).then(function(data){
            if(data && data.data){
                data = JSON.parse(data.data);
            } else {
                data = {};
            }
            data[att] = value;
            db.query(sql, [JSON.stringify(data),channelName], function(err, rows, fields){
               defer.resolve(err).promise();
            });
        });
        return defer;

    },
    setUserinfo : function(nick,att,value){
        var defer = $.Deferred();
        var sql = "UPDATE `visual`.`users` SET ?? = ? WHERE `nick` = ?";
        db.query(sql,[att,value,nick], function(err, rows, fields){
            defer.resolve(err).promise();
        });
        return defer;
    },
    banlist : function(channelName){
        var defer = $.Deferred();
        var sql = "SELECT * FROM `channel_banned` WHERE `channelName` = ?;";
        db.query(sql,channelName, function(err, rows, fields){
            if(rows && rows[0] && rows[0].banned){
                defer.resolve(JSON.parse(rows[0].banned)).promise();
            } else {
                db.query("INSERT INTO `visual`.`channel_banned` (`channelName`, `banned`) VALUES (?, '[]');", channelName);
                defer.resolve([]).promise();
            }
        });
        return defer;
    },
    ban : function(channelName, nick){
        var defer = $.Deferred();
        var sql = "UPDATE `visual`.`channel_banned` SET `banned` = ? WHERE `channelName` = ?;";
        this.banlist(channelName).then(function(list){
            if(list.indexOf(nick) == -1){
                list.push(nick);
                db.query(sql,[JSON.stringify(list),channelName],function(err, rows, fields){
                    defer.resolve(err).promise();
                });
            } else {
                defer.resolve(2).promise();
            }
        });
        return defer;
    },
    unban : function(channelName, nick){
        var defer = $.Deferred();
        var sql = "UPDATE `visual`.`channel_banned` SET `banned` = ? WHERE `channelName` = ?;";
        this.banlist(channelName).then(function(list){
            var i = list.indexOf(nick);
            if(i != -1){
                list.splice(i,1);
                db.query(sql,[JSON.stringify(list),channelName],function(err, rows, fields){
                    defer.resolve(err).promise();
                });
            } else {
                defer.resolve(i).promise();
            }
        });
        return defer;
    },
    makeid : function(){
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < 8; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    },
    getNick : function(){
		//var neadjectives = ['sexy','insane','dylusional',''];
        var nouns = ["alien", "apparition", "bat", "blood", "bogeyman", "boogeyman", "boo", "bone", "cadaver", "casket", "cauldron", "cemetery", "cobweb", "coffin", "corpse", "crypt", "darkness", "dead", "demon", "devil", "death", "eyeball", "fangs", "fear", "gastly", "gengar", "ghost", "ghoul", "goblin", "grave", "gravestone", "grim", "grimreaper", "gruesome", "haunter", "headstone", "hobgoblin", "hocuspocus", "howl", "jack-o-lantern", "mausoleum", "midnight", "monster", "moon", "mummy", "night", "nightmare", "ogre", "phantasm", "phantom", "poltergeist", "pumpkin", "scarecrow", "scream", "shadow", "skeleton", "skull", "specter", "spider", "spine", "spirit", "spook", "tarantula", "tomb", "tombstone", "troll", "vampire", "werewolf", "witch", "witchcraft", "wraith", "zombie"];
        var adjectives = ["bloodcurdling", "chilling", "creepy", "dark", "devilish", "dreadful", "eerie", "evil", "frightening", "frightful", "ghastly", "ghostly", "ghoulish", "gory", "grisly", "hair-raising", "haunted", "horrible", "macabre", "morbid", "mysterious", "otherworldly", "repulsive", "revolting", "scary", "shadowy", "shocking", "spine-chilling", "spooky", "spoopy", "startling", "supernatural", "terrible", "unearthly", "unnerving", "wicked"];
        return ucwords(_.sample(adjectives)) + ucwords(_.sample(nouns));
    }
}

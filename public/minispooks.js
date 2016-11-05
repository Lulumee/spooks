var COMMANDS = {
    // Client side commands
    help: function() {
        var keys = Object.keys(COMMANDS);
        var ava = [];
        keys.forEach(function(key) {
            if (CHAT.get('role') <= COMMANDS[key].role || COMMANDS[key].role === undefined) {
                ava.push(key);
            }
        });
        CHAT.show('Available Commands: /' + ava.join(', /'));
    },
    clear: function() {
        var messages = document.getElementById('messages');
        while (messages.firstChild) {
            messages.removeChild(messages.firstChild);
        }
    },
    avy: function() {
        var upload = document.getElementById('upload');
        var event;

        if (document.createEvent) {
            event = document.createEvent("HTMLEvents");
            event.initEvent("click", true, true);
        } else {
            event = document.createEventObject();
            event.eventType = "click";
        }
        event.eventName = "click";

        if (document.createEvent) {
            upload.dispatchEvent(event);
        } else {
            upload.fireEvent("on" + event.eventType, event);
        }
    },
    flair: {
        params: ['flair'],
        handler: function(params) {
            CHAT.set('flair', params.flair);
        }
    },
    color: {
        params: ['color'],
        handler: function(params) {
            CHAT.set('color', params.color);
        }
    },
    font: {
        params: ['font'],
        handler: function(params) {
            CHAT.set('font', params.font);
        }
    },
    style: {
        params: ['style'],
        handler: function(params) {
            CHAT.set('style', params.style);
        }
    },
	echo: {
		params: ['message'],
        handler: function(params) {
            CHAT.show({
                message: CHAT.decorate(params.message),
                nick: CHAT.get('nick'),
                flair: CHAT.get('flair'),
                style: 'chat'
            });
		}
	},
    get: {
        params: ['att'],
        handler: function(params) {
            var value = CHAT.get(params.att);
            var valid = 'color flair font note topic background bg role whitelist images part style alert theme overlay'.split(' ');
            if (valid.indexOf(params.att) != -1) {
                if (value !== undefined) {
                    if (typeof value == 'object') {
                        value = value.join(', ');
                    }
                    CHAT.show(params.att + ' is currently set to: ' + value);
                } else {
                    CHAT.show(params.att + ' is set to nothing');
                }
            } else {
                CHAT.show('Variable can be one of [' + valid.join(', ') + ']');
            }
        }
    },
    togglelist: function() {
        var toggles = CHAT.toggles.valid;
        var feedback = 'Toggle list\n';
        for (var i = 0; i < toggles.length; i++) {
            var toggle = toggles[i];
            feedback += toggle + ': ' + CHAT.toggles.get(toggle) + '\n';
        }
        CHAT.show(feedback);
    },
    toggle: {
        params: ['att', 'state'],
        handler: function(params) {
            var attStates = {on: true, off: false};
            var toggles = CHAT.toggles.valid;
            var togglesString = toggles.slice(0, -1).join("', '");
            if (toggles.indexOf(params.att) != -1) {
                if (attStates[params.state] != undefined) {
                    CHAT.toggles.toggle(params.att, attStates[params.state]);
                } else {
                CHAT.show('Valid states are \'on\' and \'off\'.');
                }
            } else {
                CHAT.show('Valid toggles are \'' + togglesString + '\' and \'' + toggles[toggles.length - 1] + '\'.');
            }
        }
    },
    roll: function() {
        document.getElementById('chat').classList.add('barrel');
        setTimeout(function() {document.getElementById('chat').classList.remove('barrel');}, 3000);
    },
    save: {
        params: ['name', 'mode'],
        handler: function(params) {
            var log = parser.parseLog(CHAT.rawLog, params.mode);
            if(log) {
                var time = new Date();
                var hoursFormat = CHAT.toggles.get('24h') ? time.format('HH:MM') : time.format('shortTime');
                var filename = window.location.host + window.location.pathname + "_" + time.format('shortDate') + "_" + hoursFormat + "_" + params.name;
                var hiddenElement = document.createElement('a');
                hiddenElement.href = 'data:attachment/text,' + encodeURI(log);
                hiddenElement.target = '_blank';
                hiddenElement.download = filename + ".log";
                hiddenElement.click();
            } else {
                CHAT.show({
                    message: 'Error, or incorrect paramter.',
                    style: 'error'
                });
            }
        }
    },
    clearLog: function() {
        CHAT.rawLog = [];
    },
    join: function() {
        if (socket.disconnected && socket.io.skipReconnect) {
            socket.connect();
            CHAT.show({
                message: 'Connecting and joining...',
                style: 'error'
            });
            resetAll();
            socket.emit('core',{
                command : 'join',
                data : CHAT.attributes
            });
        } else {
            CHAT.show({
                message: 'You\'re already connected or reconnecting.',
                style: 'error'
            });
        }
    },
    disconnect: function() {
        if (socket.connected) {
            socket.disconnect();
        } else {
            CHAT.show({
                message: 'You\'re already disconnected.',
                style: 'error'
            });
        }
    },
    // Server side commands
    removeavy: {
        params: ['name']
    },
    nick: {
        params: ['nick']
    },
    register: {
        params: ['password']
    },
    login: {
        params: ['nick', 'password']
    },
    me: {
        params: ['message']
    },
    pm: {
        params: ['nick|message']
    },
    kick: {
        params: ['nick|message']
    },
    ban: {
        params: ['nick|message']
    },
    banip: {
        params: ['nick|message']
    },
    unban: {
        params: ['nick']
    },
    banlist: {},
    globalrole: {
        params: ['nick', 'role']
    },
    note: {
        params: ['note']
    },
    topic: {
        params: ['topic']
    },
    background: {
        params: ['background']
    },
    theme: {
        params: ['TitlebarColor', 'ButtonsColor', 'InputbarColor', 'ScrollbarColor']
    },
    whoami: {},
    whois: {
        params: ['nick']
    },
    refresh: {},
    sleep: {},
    wakeup: {},
    overlay: {
        params: ['hue', 'saturation', 'brightness', 'transperancy']
    },
    part: {
        params: ['part']
    },
    leave: {
        params: ['part']
    }
}

// All functions chat related
var CHAT = {
    theme: function(info) {
        for (var i in info) {
            try{
                info[i] = JSON.parse(info[i]);
                CHAT.set(i, info[i]);
            } catch(err) {
                CHAT.set(i, info[i]);
            }
        }
        if (info.note) {
            CHAT.show({
                message: info.note,
                style: 'note'
            })
        }
        if (info.topic) {
            document.title = parser.removeHTML(parser.reLinebreak(parser.parse(info.topic))).replace(/[\s\s|\n\n]+/g, ' '); 
            CHAT.show({
                message: info.topic,
                style: 'general'
            })
        }
        if (info.background) {
            var background = info.background;
            if (background.slice(-1) == ';') { // Remove ; if exist
                background = background.slice(0, background.length-1);
            }
            document.getElementById("chat-background").style.background = background; // Apply css
        }
        if (info.theme) {
            document.getElementById("title-bar").style.backgroundColor = info.theme[0];
            document.querySelector('meta[name="theme-color"]').setAttribute("content", info.theme[0]);
            document.getElementById("minimize").style.backgroundColor = info.theme[1];
            document.getElementById("collapse").style.backgroundColor = info.theme[1];
            if (/\d+/g.test(document.getElementById("minimize").style.backgroundColor)) {
                let invertedColor = contrast.bw(contrast.splitRgb(document.getElementById("minimize").style.backgroundColor));
                document.getElementById("minimize").style.boxShadow = invertedColor === 'w' ? '0 0px 1px rgba(255, 255, 255, 1)' : '0 0px 1px rgba(0, 0, 0, 1)';
                document.getElementById("collapse").style.boxShadow = invertedColor === 'w' ? '0 0px 1px rgba(255, 255, 255, 1)' : '0 0px 1px rgba(0, 0, 0, 1)';
                document.getElementById("minimize").children[0].style.backgroundColor = invertedColor === 'w' ? '#CCCCCC' : '#333333';
                // document.getElementById("collapse").children[0].style.borderTop = invertedColor; Doesn't work.
                if (invertedColor === 'b') {
                    document.getElementById("collapse").children[0].classList.add('triangle-color-hack');
                } else {
                    document.getElementById("collapse").children[0].classList.remove('triangle-color-hack');
                }
            }
            document.getElementById("input-bar").style.backgroundColor = info.theme[2];
            if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
                document.styleSheets[0].deleteRule(0);
                document.styleSheets[0].insertRule(".chat-scrollbar::-webkit-scrollbar-button, .chat-scrollbar::-webkit-scrollbar-thumb { background: " + info.theme[3] + "", 0);
            }
        }
        if (info.overlay) {
            var overlay = info.overlay;
            rgba = contrast.hslToRgb(overlay[0], overlay[1], overlay[2]);
        document.getElementById("world-curtain").style.background = 'rgba(' + rgba.r + ', ' + rgba.g + ', ' + rgba.b + ', ' + overlay[3] + ')';
        }
    },
    submit: function(message) {
        var parsed = /^\/(\w+) ?([\s\S]*)/.exec(message);
        if (parsed) {
            var input = parsed[2];
            var commandName = parsed[1].toLowerCase();
            if (COMMANDS[commandName]) {
                if (typeof COMMANDS[commandName] == 'function') {
                    COMMANDS[commandName](input);
                } else {
                    var params = COMMANDS[commandName].params;
                    var set = {};
                    var valid = true;
                    if (params) {
                        if (COMMANDS[commandName].params.length == 1 && COMMANDS[commandName].params[0].indexOf('|') != -1) { // /commandName name|message with spaces
                            var key = COMMANDS[commandName].params[0].split('|');
                            var parsedInput = /^(.*?[^\\])\|([\s\S]*)$/.exec(input);
                            if (parsedInput) {
                                for (var i = 0; i < key.length; i++) {
                                    set[key[i]] = parsedInput[i+1];
                                }
                            } else {
                                set[key[0]] = input;
                            }
                        } else if (COMMANDS[commandName].params.length > 1) { // /commandName split|messages|like|so
                            input = input.split(' ');
                            for (var c in input) {
                                set[params[c]] = input[c];
                            }
                        } else { // /commandName message with spaces
                            set[params[0]] = input;
                        }
                        for (var p in set) { // Make sure all paramters are filled out
                            if (!set[p]) {
                                valid = false;
                            }
                        }
                    }
                    if (valid) {
                        if (COMMANDS[commandName].handler) {
                            COMMANDS[commandName].handler(set);
                        } else {
                            socket.emit('command', {
                                name: commandName,
                                params: set
                            });
                        }
                    } else {
                        CHAT.show({
                            message: 'Invalid: /' + commandName + ' <' + COMMANDS[commandName].params.join('> <') + '>',
                            style: 'error'
                        });
                    }
                }
            } else {
                CHAT.show('That command doesn\'t exist');
            }
        } else {
            var flair = CHAT.get('flair');
            message = this.decorate(message);
            socket.emit('message', {
                message: message,
                flair: flair
            });
        }
    },
    show: function(message) {
        if (typeof message == 'string') { // If string convert into object
            message = {
                message: message
            };
        }
        
        var logged = JSON.parse(JSON.stringify(message));
        this.rawLog.push(logged);
        
        if (message.style === 'general' && message.nick) {
            message.message = parser.escape(message.message);
        } else if (message.style && message.style != 'info') {
            parser.getAllFonts(message.message); // Check for missing fonts
            message.message = parser.parse(message.message);
            if (message.nick) {
                message.nick = parser.escape(message.nick);
            }
        } else {
            message.message = parser.escape(message.message);
        }
        var el = this.buildmessage(message);
        this.append(el, '#messages');
    },
    decorate: function(message) {
        var color = CHAT.get('color') ? '#' + CHAT.get('color') : '';
        var font = CHAT.get('font') ? '$' + CHAT.get('font') + '|' : '';
        var style = CHAT.get('style') ? CHAT.get('style') : '';
        return font + style + color + ' ' + message;
    },
    set: function(att, value) {
		var displayMessage = ['color', 'flair', 'font', 'style'];
        if (typeof value == 'object') {
            localStorage.setItem(att, JSON.stringify(value));
        } else {
            localStorage.setItem(att, value);
        }
        CHAT.attributes[att] = value;
		if (displayMessage.indexOf(att) != -1) {
			CHAT.submit('/echo Now your messages look like this');
		}
        if (att == 'avatars') {
            for (var i = 0; i < value.length; i++) {
                var AvatarImage = new Image();
                AvatarImage.src = `/data/images/avatars/${CHAT.get('nick')}/${value[i]}`;
                avatarControl.saveAvatar(AvatarImage, value[i]);
            }
        }
    },
    get: function(att) {
        return this.attributes[att];
    },
    buildmessage: function(message) {
        if (typeof message == 'string') { // If string convert into object
            message = {
                message: message
            };
        }

		var container = document.createElement('div');

		// Assign message style
        if (message.style) {
            container.className = 'message ' + message.style + '-message';
        } else {
            container.className = 'message info-message';
        }

        // Get time
        var time = new Date();
        var preferredTime = CHAT.toggles.get('24h') ? time.format('HH:MM') : time.format('shortTime');

        // Create time div
        var timeDiv = document.createElement('div');
        timeDiv.className = 'time';
        timeDiv.textContent = preferredTime + ' ';
        // Assign message number
        if (message.num) {
            container.className += ' msg-' + message.num;
            timeDiv.title = message.num;
        }
        container.appendChild(timeDiv);
        
        // Create nick div
        if (message.nick) {
            
            if (message.style == 'general') { // If general-message add nick to message instead of creating a new div
                message.message = message.nick + ' ' + message.message;
            } else {
                var nick = document.createElement('div');
                nick.className = 'nick';
                if (message.flair && parser.removeHTML(parser.parse(message.flair)) == message.nick && message.flair.indexOf('/`') == -1) { // Make sure flair matches nick
                    parser.getAllFonts(message.flair);
                    nick.innerHTML = parser.parse(message.flair) + ': ';
                } else {
                    nick.innerHTML = message.nick + ': ';
                }
                if (message.toNick) {
                    nick.title = message.toNick;
                }
                container.appendChild(nick);
            }
        }

        // Create message div
        var msg = document.createElement('div');
        msg.className = 'message-content';
        msg.innerHTML = message.message;
        container.appendChild(msg);

		return container;
    },
    append: function(el) {
		var container = document.getElementById('messages');
        // Append message
        container.appendChild(el);
        this.audio.playSound('pop');
        this.scrollToBottom('messages', el.offsetHeight);
    },
    scrollToBottom: function(m, messageHeight) {
        function scrollTo(element, to, duration) {
            var start = element.scrollTop,
                change = to - start,
                increment = 20;

            var animateScroll = function(elapsedTime) {
                elapsedTime += increment;
                var position = easeInOut(elapsedTime, start, change, duration);
                element.scrollTop = position;
                if (elapsedTime < duration) {
                    setTimeout(function() {
                        animateScroll(elapsedTime);
                    }, increment);
                }
            };
            animateScroll(0);
        }

        function easeInOut(currentTime, start, change, duration) {
            currentTime /= duration / 2;
            if (currentTime < 1) {
                return change / 2 * currentTime * currentTime + start;
            }
            currentTime -= 1;
            return -change / 2 * (currentTime * (currentTime - 2) - 1) + start;
        }

        if (typeof m == 'string') {
            m = document.getElementById(m);
        }

        var msgPanel = document.getElementById('messages');

        var scrollDelta = m.scrollHeight - m.clientHeight;
        if (scrollDelta - m.scrollTop - messageHeight + 15 < msgPanel.clientHeight / 2) { // 15 is the smallest message height.
            scrollTo(m, scrollDelta, 200);
        }
    },
    audio: {
        sounds: { pop: new Audio('audio/notifications/Bing.mp3')},
        music: ["Social Sunrise (Day 1).mp3", "We're Still Open (Night 1).mp3", "Celadon.mp3", "Palette Town.mp3", "Pokemon Center.mp3", "Palette Town To Viridian City.mp3"],
        playSound: function(name) {
            if (CHAT.toggles.get(name)) {
                this.sounds[name].play();
            }
        }
    },
    toggles: function() {
        var obj = {
            valid: ['pop', '24h', 'reconnect'],
            states: {'pop': true, '24h': false, 'reconnect': true},
            get: function(att) {
                return this.states[att];
            },
            toggle: function(att, to) {
                this.states[att] = to;
                if (localStorage.getItem('toggles')) {
                    try{
                        var storageToggles = JSON.parse(localStorage.getItem('toggles'));
                        storageToggles[att] = to;
                        localStorage.setItem('toggles', JSON.stringify(storageToggles));
                    } catch(e) {
                        localStorage.setItem('toggles', '{}');
                    }
                }
                CHAT.show(att + ' has been changed to: ' + to);
            }
        };
        var tempToggles = {};
        if (localStorage.getItem('toggles')) {
            try{
                tempToggles = JSON.parse(localStorage.getItem('toggles'));
            } catch(e) {
                localStorage.setItem('toggles', '{}');
            }
        } else {
            localStorage.setItem('toggles', '{}');
        }
        for (var n in obj.states) {
            var val = tempToggles && tempToggles[n];
            if (val !== undefined) {
                try{
                    obj.states[n] = JSON.parse(val);
                } catch(e) {
                    obj.states[n] = obj.states[n];
                }
            }
        }
        return obj;
    }(),
    attributes: function() {
        var item = {};
        var atts = 'color flair font style nick note role topic theme overlay part token'.split(' ');
        for (var i in window.localStorage) {
            if (i != '__proto__') {
                var val = localStorage.getItem(i);
                if (val !== undefined && atts.indexOf(i) != -1) {
                    try {
                        item[i] = JSON.parse(val);
                    } catch(e) {
                        item[i] = val;
                    }
                }
            }
        }
        return item;
    }(),
    rawLog: [],
}

var parser = {
    linkreg: /[a-z]+:[\/]+[a-z\d-]+\.[^\s<]+/ig,
    coloreg: '(?:alice|cadet|cornflower|dark(?:slate)?|deepsky|dodger|light(?:sky|steel)?|medium(?:slate)?|midnight|powder|royal|sky|slate|steel)?blue|(?:antique|floral|ghost|navajo)?white|aqua|(?:medium)?aquamarine|blue|beige|bisque|black|blanchedalmond|(?:blue|dark)?violet|(?:rosy|saddle|sandy)?brown|burlywood|chartreuse|chocolate|(?:light)?coral|cornsilk|crimson|(?:dark|light)?cyan|(?:dark|pale)?goldenrod|(?:dark(?:slate)?|dim|light(?:slate)?|slate)?gr(?:a|e)y|(?:dark(?:olive|sea)?|forest|lawn|light(?:sea)?|lime|medium(?:sea|spring)|pale|sea|spring|yellow)?green|(?:dark)?khaki|(?:dark)?magenta|(?:dark)?orange|(?:medium|dark)?orchid|(?:dark|indian|(?:medium|pale)?violet|orange)?red|(?:dark|light)?salmon|(?:dark|medium|pale)?turquoise|(?:deep|hot|light)?pink|firebrick|fuchsia|gainsboro|gold|(?:green|light(?:goldenrod)?)?yellow|honeydew|indigo|ivory|lavender(?:blush)?|lemonchiffon|lime|linen|maroon|(?:medium)?purple|mintcream|mistyrose|moccasin|navy|oldlace|olive(?:drab)?|papayawhip|peachpuff|peru|plum|seashell|sienna|silver|snow|tan|teal|thistle|tomato|wheat|whitesmoke',
    fontRegex: /(\$|(&#36;))([\w \-\,Ã‚Â®]*)\|(.*)$/,
    repslsh: 'ÃƒÂ¸ÃƒÂº!#@&5nÃƒÂ¥ÃƒÂ¶EESCHEInoheÃƒÂ©ÃƒÂ¤',
    replink: 'ÃƒÂ©ÃƒÂ¤!#@&5nÃƒÂ¸ÃƒÂºENONHEInoheÃƒÂ¥ÃƒÂ¶',
    multiple: function(str, mtch, rep, limit) {
        var ct = 0;
        limit = limit ? limit : 9;
        while (str.match(mtch) !== null && ct++ < limit)
            str = str.replace(mtch, rep);
        return str;
    },
    removeHTML: function(parsed) {
        var span = document.createElement('span');
        span.innerHTML = parsed;
        return span.textContent;
    },
    loadedFonts: {},
    addFont: function(family) {
        if (!this.loadedFonts[family]) {
            this.loadedFonts[family] = true;
            var protocol = 'https:' == document.location.protocol ? 'https' : 'http';
            var url = protocol + '://fonts.googleapis.com/css?family=' + encodeURIComponent(family);
            var stylesheet = document.createElement('link');
            stylesheet.rel = 'stylesheet';
            stylesheet.href = url;
            document.head.appendChild(stylesheet)
        }
    },
    getAllFonts: function(str) {
        var match;
        while (match = this.fontRegex.exec(str)) {
            str = str.replace(this.fontRegex, "$2");
            this.addFont(match[3]);
        }
    },
    escape: function(str) {
        // Convert chars to html codes
        str = str.replace(/\n/g, '\\n');
        str = str.replace(/&/gi, '&amp;');
        str = str.replace(/>/gi, '&gt;');
        str = str.replace(/</gi, '&lt;');
        str = str.replace(/"/gi, '&quot;');
        str = str.replace(/#/gi, '&#35;');
        str = str.replace(/\\n/g, '<br>');
        str = str.replace(/\$/gi, '&#36;');
        str = str.replace(/'/gi, '&#39;');
        str = str.replace(/~/gi, '&#126;');

        // Convert spaces
        str = str.replace(/\s{2}/gi, ' &nbsp;');
        return str;
    },
    parse: function(str) {
        // Convert chars to html codes
        str = str.replace(/\n/g, '\\n');
        str = str.replace(/&/gi, '&amp;');
        str = str.replace(/>/gi, '&gt;');
        str = str.replace(/</gi, '&lt;');
        str = str.replace(/"/gi, '&quot;');
        str = str.replace(/#/gi, '&#35;');
        str = str.replace(/\\n/g, '<br>');
        str = str.replace(/\$/gi, '&#36;');
        str = str.replace(/'/gi, '&#39;');
        str = str.replace(/~/gi, '&#126;');

        // Normalize text
        str = str.replace(/\/\`([^]+)$/g, '<textarea>$1</textarea>');

        // Match user escaping
        var escs = str.match(/\\./g);
        str = str.replace(/\\./g, this.repslsh);

        // Match qoutes
        str = str.replace(/&gt;&gt;/g, '>&gt;');
        var check = str.match(/>&gt;\d+/g);

        // Match links
        var linkesc = str.match(this.linkreg);
        str = str.replace(this.linkreg, this.replink);

        // Green text
        str = this.multiple(str, /(^|^[&#36;A-z\s|]+\s|^&#35;[A-z0-9]+\s|^[&#36;A-z\s|]+&#35;[A-z]+\s|<br>)\s?&gt;(.*?)(<br>|$)/g, '$1<span style="color:#789922;">>$2</span><br>');

        // Styles
        str = this.multiple(str, /\/\^([^\|]+)\|?/g, '<big>$1</big>');
        str = this.multiple(str, /\/\*([^\|]+)\|?/g, '<b>$1</b>');
        str = this.multiple(str, /\/\%([^\|]+)\|?/g, '<i>$1</i>');
        str = this.multiple(str, /\/\_([^\|]+)\|?/g, '<u>$1</u>');
        str = this.multiple(str, /\/\-([^\|]+)\|?/g, '<strike>$1</strike>');
        str = this.multiple(str, /\/\&#126;([^\|]+)\|?/g, '<small>$1</small>');
        str = this.multiple(str, /\/\&#35;([^\|]+)\|?/g, '<span class="spoil">$1</span>');
        str = this.multiple(str, /\/\@([^\|]+)\|?/g, '<span style="text-shadow: 0 0 2px white;color: transparent;">$1</span>');
        /*
        -!Rainbows
        -ColourWrap
        */

        // Replace colors
        str = this.multiple(str, /&#35;([\da-f]{6}|[\da-f]{3})(.+)$/i, '<span style="color: #$1;">$2</span>', 1000);
        str = this.multiple(str, /&#35;&#35;([\da-f]{6}|[\da-f]{3})(.+)$/i, '<span style="background-color: #$1;">$2</span>', 1000);
        str = this.multiple(str, RegExp('&#35;&#35;(' + this.coloreg + ')(.+)$', 'i'), '<span style="background-color: $1;">$2</span>', 1000);
        str = this.multiple(str, RegExp('&#35;(' + this.coloreg + ')(.+)$', 'i'), '<span style="color: $1;">$2</span>', 1000);

		// Replace fonts
        str = this.multiple(str, this.fontRegex, '<span style="font-family:\'$3\'">$4</span>');

        // Replace user escaping
        for (var i in escs) {
            str = str.replace(this.repslsh, escs[i][1]);
        }
        // Replace links
        for (var i in linkesc) {
            var link = linkesc[i];
            str = str.replace(this.replink, '<a target="_blank" href="' + link + '">' + link + '</a>');
        }

        // Replace qoutes
        if (check) {
            for (var i in check) {
                var number = check[i].replace('>&gt;', '');
                var found = document.getElementsByClassName('msg-' + number);
                if (found.length) {
                    str = str.replace(check[i], '<a onmouseenter="parser.qoute(' + number + ');" onmouseout="document.body.removeChild(document.getElementById(\'qoute\'));" onclick="parser.highlight(' + number + ')">&gt;>' + number + '</a>');
                } else {
                    str = str.replace(check[i], '<a style=\'color:#AD0000;\'>' + check[i] + '</a>');
                }
            }
        }

        // Video embeds
        str = str.replace(/<a [^>]*href="([^&#39;"]*\.webm)">([^<]*)<\/a>/i, '<a target="_blank" href="$2">$2</a> <a href="javascript:void(0)" onclick="spooks.video(\'html5\', \'$1\')" class="show-video">[video]</a>');

        var img = /(<a target="_blank" href="[^"]+?">)([^<]+?\.(?:agif|apng|gif|jpg|jpeg|png|bmp|svg))<\/a>/gi.exec(str);
        if (img) {
            str = this.multiple(str, img[0], img[1] + '<img src="' + img[2] + '" onload="CHAT.scrollToBottom(\'messages\',this.clientHeight);"/></a>',3);
        }

        // Convert spaces
        str = str.replace(/\s{2}/gi, ' &nbsp;');
        return str;
    },
    reLinebreak: function(str) {
        str = str.replace(/<br>/g, '\n');
        return str;
    },
    bubbleColor: function(str) {
        var color = str.match(/#[\da-f]{6}|#[\da-f]{3}/i);
        if (!color) {
            color = str.match(RegExp('#' + parser.coloreg, 'i'));
            return color ? contrast.rgbStringToHex(contrast.htmlColorsToRgb(color[0].indexOf('#') !== -1 ? color[0].substr(1) : color[0])) : null;
        }
        return color ? color[0] : null;
    },
    parseLog: function(messages, mode) {
        var result = "";
        if (mode === 'basic') {
            for (var i = 0; i < messages.length; i++) {
                if (!messages[i].style || messages[i].style === 'note' || messages[i].style === 'error') {
                    result += messages[i].message + '\n'; 
                } else if (messages[i].style === 'chat') {
                    result += messages[i].nick + ':' + parser.removeHTML(parser.parse2(messages[i].message)) + '\n'; 
                } else if (messages[i].style === 'general') {
                    result += (messages[i].nick ? messages[i].nick + ' ' : '') + messages[i].message + '\n'; 
                } else if (messages[i].style === 'personal') {
                    result += (messages[i].toNick ? (messages[i].toNick + " ") : '') + "<<<< " + messages[i].nick + ":" + parser.removeHTML(parser.parse2(messages[i].message)) + '\n'; 
                }
            }
        } else if (mode === 'verbose') {
            for (var i = 0; i < messages.length; i++) {
                if (!messages[i].style || messages[i].style === 'note' || messages[i].style === 'error') {
                    result += messages[i].message + '\n'; 
                } else if (messages[i].style === 'chat') {
                    result += messages[i].nick + ': ' + messages[i].message + (messages[i].flair ? (' (flair: ' + messages[i].flair  + ')') : '') + '\n';
                } else if (messages[i].style === 'general') {
                    result += (messages[i].nick ? messages[i].nick + ' ' : '') + messages[i].message + '\n'; 
                } else if (messages[i].style === 'personal') {
                    result += (messages[i].toNick ? (messages[i].toNick + " ") : '') + "<<<< " + messages[i].nick + ":" + messages[i].message + '\n'; 
                }
            }
        } else if (mode === 'raw') {
            for (var i = 0; i < messages.length; i++) {
                result += JSON.stringify(messages[i]) + '\n';
            }
        }
        result = result.replace(/\n/g, '\r\n'); // Everyone loves Windows OS.
        return result !== '' ? result : null;
    },
    parse2: function(str) {
        str = str.replace(/\n/g, '\\n');
        str = str.replace(/&/gi, '&amp;');
        str = str.replace(/>/gi, '&gt;');
        str = str.replace(/</gi, '&lt;');
        str = str.replace(/"/gi, '&quot;');
        str = str.replace(/#/gi, '&#35;');
        str = str.replace(/\\n/g, '<br>');
        str = str.replace(/\$/gi, '&#36;');
        str = str.replace(/'/gi, '&#39;');
        str = str.replace(/~/gi, '&#126;');
        
        var escs = str.match(/\\./g);
        str = str.replace(/\\./g, this.repslsh);

        // Match links
        var linkesc = str.match(this.linkreg);
        str = str.replace(this.linkreg, this.replink);

        // Styles
        str = this.multiple(str, /\/\^([^\|]+)\|?/g, '<big>$1</big>');
        str = this.multiple(str, /\/\*([^\|]+)\|?/g, '<b>$1</b>');
        str = this.multiple(str, /\/\%([^\|]+)\|?/g, '<i>$1</i>');
        str = this.multiple(str, /\/\_([^\|]+)\|?/g, '<u>$1</u>');
        str = this.multiple(str, /\/\-([^\|]+)\|?/g, '<strike>$1</strike>');
        str = this.multiple(str, /\/\&#126;([^\|]+)\|?/g, '<small>$1</small>');
        str = this.multiple(str, /\/\&#35;([^\|]+)\|?/g, '<span class="spoil">$1</span>');
        str = this.multiple(str, /\/\@([^\|]+)\|?/g, '<span style="text-shadow: 0 0 2px white;color: transparent;">$1</span>');

        str = this.multiple(str, /&#35;([\da-f]{6}|[\da-f]{3})(.+)$/i, '<span style="color: #$1;">$2</span>', 1000);
        str = this.multiple(str, /&#35;&#35;([\da-f]{6}|[\da-f]{3})(.+)$/i, '<span style="background-color: #$1;">$2</span>', 1000);
        str = this.multiple(str, RegExp('&#35;&#35;(' + this.coloreg + ')(.+)$', 'i'), '<span style="background-color: $1;">$2</span>', 1000);
        str = this.multiple(str, RegExp('&#35;(' + this.coloreg + ')(.+)$', 'i'), '<span style="color: $1;">$2</span>', 1000);

        str = this.multiple(str, this.fontRegex, '<span style="font-family:\'$3\'">$4</span>');

        for (var i in escs) {
            str = str.replace(this.repslsh, escs[i][1]);
        }
        // Replace links
        for (var i in linkesc) {
            var link = linkesc[i];
            str = str.replace(this.replink, link);
        }
        return str;
    },
}

// Request to join
socket.emit('core', {
    command: 'join',
    data: CHAT.attributes
});

// Update value
socket.on('update', function(data) {
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
        CHAT.set(keys[i], data[keys[i]]);
    }
});

// Listen to and append messages
socket.on('message', function(message) {
    CHAT.show(message);
});

socket.on('chatinfo', function(data) {
    CHAT.theme(JSON.parse(data));
});

// Update title
(function() {
    var blurred = false;

    function updateTitle() {
        var topic = CHAT.get('topic');
        if (topic) {
            if (blurred && window.unread > 0) {
                document.title = '(' + window.unread + ') ' + parser.removeHTML(parser.reLinebreak(parser.parse(topic))).replace(/[\s\s|\n\n]+/g, ' ');  
                document.querySelector("link[rel='icon']").href = window.location.origin + "/images/icons/pixel/favicon-red-32x32.png";
            } else {
                document.title = parser.removeHTML(parser.reLinebreak(parser.parse(topic))).replace(/[\s\s|\n\n]+/g, ' '); 
                document.querySelector("link[rel='icon']").href = window.location.origin + "/images/icons/pixel/favicon-32x32.png";
                window.unread = 0;
            }
        }
    }

    window.onblur = function() {
        blurred = true;
        window.unread = 0;
    }

    window.onfocus = function() {
       blurred = false;
       updateTitle();
    };

    socket.on('message', function() {
        if (blurred) {
            window.unread++;
            updateTitle();
        }
    });

})();

var contrast = {
    bw: function(components) {
        var luminance, sRGB = [];
        for (var i = 0; i < 3; i++) {
            sRGB[i] = parseFloat(components[i]).toFixed(5) / 255;
            sRGB[i] = sRGB[i] <= 0.03928 ? sRGB[i] / 12.92 : Math.pow((sRGB[i] + 0.055) / 1.055, 2.4);
        }
        luminance = 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
        return luminance > 0.179 ? 'b' : 'w';
    },
    hsl: function() {},
    rgbStringToHex: function(rgb) {
        function decToHexColorComponent(dec) {
            var hex = parseInt(dec).toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        var rgbComponents = this.splitRgb(rgb);
        return "#" + decToHexColorComponent(rgbComponents[0]) + decToHexColorComponent(rgbComponents[1]) + decToHexColorComponent(rgbComponents[2]);
    },
    hexToRgb: function(hex) {
        hex = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, function(str, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
    },
    splitRgb: function(str) {
        return str.match(/\d+/g);
    },
    htmlColorsToRgb: function(colorName) {
        var temp = document.createElement("div");
        temp.style.color = colorName;
        document.body.appendChild(temp);
        var result = window.getComputedStyle(temp).color;
        temp.parentNode.removeChild(temp);
        return result;
    },
    hslToRgb: function (h, s, v) {
        var r, g, b, i, f, p, q, t;
        if (arguments.length === 1) {
            s = h.s, v = h.v, h = h.h;
        }
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        }
    }
}

var minimizer = {
    minimize: function(id) {
        var el = document.getElementById('minimized-area');
        var label = document.createElement('div');
        label.className = 'minimized';
        label.textContent = "Chat";
        label.addEventListener('click', function() {
            var chatWindow = document.getElementById(id);
            chatWindow.style.display = 'block';
            label.parentNode.removeChild(label);
        });
        el.appendChild(label);
    }
};

var buttons = {
    chatbox: function(el, name) {
        el = document.getElementById(el);
        var button = document.createElement('div');
        button.id = name;
        var sign = document.createElement('span');
        el.appendChild(button);
        button.appendChild(sign);
    }
};

(function() {
    var history = [];
    var historyIndex = -1;

    var chat = document.getElementById('chat');
    $$$.draggable(chat);
    $$$.resizable(chat);

    // Must be after Resizable because...
    getChatX();
    getChatY();
    // ...it sets style.top, style.left, style.height, style.width

    buttons.chatbox('title-bar', 'minimize');
    buttons.chatbox('title-bar', 'collapse');
    var messegesPanel = document.getElementById('messages');

    var minimizeEl = document.getElementById('minimize');
    minimizeEl.addEventListener('click', function() {
        chat.style.display = 'none';
        minimizer.minimize('chat');
    });

    var msgH;
    var collapseEl = document.getElementById('collapse');
    collapseEl.addEventListener('click', function() {
        messegesPanel.style.height = '';
        if (stopChatTranstion) {clearTimeout(stopChatTranstion)}
        chat.classList.add('move-chat');
        var sn = collapseEl.getElementsByTagName('span')[0];
        if (chat.classList.contains('slideCloseChat')) {
            let testTop = (chat.offsetTop - msgH);
            chat.style.top = testTop > 0 ? testTop + 'px' : '0px';
            chat.classList.remove('slideCloseChat');
            sn.classList.remove('flip-arrow');
            for (let i = 0; i < 4 ; i++) {
                document.getElementsByClassName('corner-handle')[i].style.display = '';
            }
            document.getElementsByClassName('resizable-bottom')[0].style.display = '';
            messegesPanel.tabIndex = 2;
        } else {
            msgH = messegesPanel.clientHeight;
            chat.style.top = (chat.offsetTop + msgH) + 'px';
            chat.classList.add('slideCloseChat');
            sn.classList.add('flip-arrow');
            for (let i = 0; i < 4 ; i++) {
                document.getElementsByClassName('corner-handle')[i].style.display = 'none';
            }
            document.getElementsByClassName('resizable-bottom')[0].style.display = 'none';
            messegesPanel.tabIndex = -1;
        }
        var stopChatTranstion = setTimeout(function() {
            chat.classList.remove('move-chat');
            getChatX();
            getChatY();
            // Resize input bar.
            var e = new Event('keyup');
            e.keyCode = 38;
            document.getElementById('input-bar').getElementsByTagName('textarea')[0].dispatchEvent(e);
        }, 1000);
    });

    var sphereEl = document.getElementById('sphere');
    var userslistEl = document.getElementById('users-list');
    sphereEl.addEventListener('click', function() {
        if (userslistEl.classList.contains('userslist-open')) {
            userslistEl.classList.remove('userslist-open');
        } else {
            userslistEl.classList.add('userslist-open');
        }
    });

    document.getElementById('pop-vol').addEventListener('input', function(e) {
        CHAT.audio.sounds.pop.volume = e.target.value;
        CHAT.audio.sounds.pop.play();
    });

    function initializeSound() {
        if (navigator.userAgent.toString().toLowerCase().indexOf("android") != -1) {
            let originalVolume = CHAT.audio.sounds.pop.volume;
            CHAT.audio.sounds.pop.volume = 0;
            CHAT.audio.playSound('pop');
            setTimeout(function() {CHAT.audio.sounds.pop.volume = originalVolume;}, 3000);
        }
        document.getElementsByTagName('body')[0].removeEventListener("click", initializeSound);
    }
    document.getElementsByTagName('body')[0].addEventListener("click", initializeSound);

    var tracks = CHAT.audio.music;
    for (var i = 0; i < tracks.length; i++) {
        var track = document.createElement('li');
        track.textContent = tracks[i];
        track.addEventListener('click', function(e) {
            document.getElementById('mp3').src = 'audio/music/' + e.target.textContent;
            document.getElementById('music').load();
            document.getElementById('music').play();
        });
        document.getElementById('tracks').appendChild(track);
    }
    document.getElementById('tracks').appendChild(document.createElement('hr'));

    var userTracks = {};
    document.getElementById('upload-music').addEventListener('change', function() {
        var file = this.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            userTracks[file.name] = e.target.result;
            var track = document.createElement('li');
            track.textContent = file.name;
            track.addEventListener('click', function(e) {
                document.getElementById('mp3').src = userTracks[e.target.textContent];
                document.getElementById('music').load();
                document.getElementById('music').play();
            });
            document.getElementById('tracks').appendChild(track);
            document.getElementById('mp3').src = userTracks[file.name];
            document.getElementById('music').load();
            document.getElementById('music').play();
        };
        reader.readAsDataURL(file);
    });
    
    function submit() {
        var text = input.value;
        text && CHAT.submit(text);
        historyIndex = -1;
        history.unshift(text);
        input.value = '';
    }

    var input = document.getElementById('input-bar').getElementsByTagName('textarea')[0];
    input.onkeydown = function(e) {
        if (e.keyCode == 9 && e.shiftKey == false) {
            e.preventDefault();
            document.getElementsByClassName('first-tabindex')[0].focus();
        }
        switch (e.keyCode) {
        case 13:
            if (e.keyCode == 13 && !e.shiftKey) {
                e.preventDefault();
                var text = input.value;
                text && submit();
            }
            break;
        case 38:
            if (e.shiftKey) {
                if (history.length > historyIndex+1) {
                    input.value = history[++historyIndex];
                }
            }
            break;
        case 40:
            if (e.shiftKey) {
                if (historyIndex > 0) {
                    input.value = history[--historyIndex]
                }
            }
            break;
        }
    };

    // Resize input bar and message window when making newlines.

    var originalHeight = parseInt(window.getComputedStyle(input).getPropertyValue("height"));

    input.onkeyup = function(e) {
        // Save previous values.
        var messegesPanelPreviousHeight = messegesPanel.clientHeight;
        var messegesPanelPreviousScrollTop = messegesPanel.scrollTop;
        // Resize input.
        input.style.height = 0 + "px";
        var height = input.scrollHeight;
        input.style.height = Math.min(height - parseInt(window.getComputedStyle(input).getPropertyValue("padding-top")) - parseInt(window.getComputedStyle(input).getPropertyValue("padding-bottom")), messegesPanel.parentElement.clientHeight / 3 - (messegesPanel.parentElement.clientHeight / 3 % originalHeight)) + "px";
        // Resize message panel.
        messegesPanel.style.height = messegesPanel.parentElement.clientHeight - document.getElementById('title-bar').clientHeight - input.parentElement.clientHeight + "px";
        // Adjust scroll position.
        if ((e.shiftKey) || (!e.shiftKey && messegesPanel.scrollHeight !== (messegesPanelPreviousScrollTop + messegesPanelPreviousHeight) && messegesPanel.scrollHeight !== (messegesPanel.clientHeight + messegesPanel.scrollTop))) {
            messegesPanel.scrollTop += (messegesPanelPreviousHeight - messegesPanel.clientHeight);
        } else if (!e.shiftKey && messegesPanel.scrollHeight !== (messegesPanelPreviousScrollTop + messegesPanelPreviousHeight) && messegesPanel.scrollHeight === (messegesPanel.clientHeight + messegesPanel.scrollTop)) {
            messegesPanel.scrollTop -= messegesPanel.scrollHeight - (messegesPanelPreviousScrollTop + messegesPanelPreviousHeight);
        } else {
            messegesPanel.scrollTop += Math.abs(messegesPanelPreviousHeight - messegesPanel.clientHeight);
        }
    };

})();

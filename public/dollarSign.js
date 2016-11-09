window.$$$ = {
    draggable: function (el, stopOn) {
        var container = document.getElementById('world'),
            clickX = 0,
            clickY = 0;
        el.style.left = el.offsetLeft + 'px';
        el.style.top = el.offsetTop + 'px';

        function drag(event) {
            var left = event.clientX - clickX,
                top = event.clientY - clickY;
            if (left + el.offsetWidth <= container.offsetWidth && left >= container.offsetLeft) {
                el.style.left = left + 'px';
            }
            if (top + el.offsetHeight <= container.offsetHeight && top >= container.offsetTop) {
                el.style.top = top + 'px';
            }
        }

        function remove() {
            el.removeEventListener('mousemove', drag);
            container.removeEventListener('mousemove', drag);
            document.body.classList.remove('noselect');
            getChatX();
            getChatY();
        }

        el.addEventListener('mousedown', function(e) {
            var target = e.target || e.srcElement;
            if (!target.classList.contains('resizable-handle') && target.nodeName !== stopOn && target.id === ('title-bar')) {
                clickX = e.clientX - parseInt(el.style.left, 10);
                clickY = e.clientY - parseInt(el.style.top, 10);
                el.addEventListener('mousemove', drag);
                container.addEventListener('mousemove', drag);
                document.body.classList.add('noselect');
            }
        });

        el.addEventListener('mouseup', remove);
        container.addEventListener('mouseup', remove);
    },
    resizable: function (el) {
        var container = document.getElementById('world'),
            width = el.offsetWidth,
            height = el.offsetHeight,
            clickX = 0,
            clickY = 0;
        el.style.width = width + 'px';
        el.style.height = height + 'px';

        function resize(sign, event) {
            if (sign[0]) {
                var movementX = (event.clientX - clickX) - sign[0] * parseInt(el.style.width, 10);
                width = parseInt(el.style.width) + sign[0] * movementX;
            }
            if (sign[1]) {
                var movementY = (event.clientY - clickY) - sign[1] * parseInt(el.style.height, 10);
                height = parseInt(el.style.height) + sign[1] * movementY;
            }
            if (sign[0] && (width < container.offsetWidth) && width > 200) {
                el.style.width = width + 'px';
                if (sign[0] === -1) {
                    el.style.left = parseInt(el.style.left) + movementX + 'px';
                }
            }
            if (sign[1] && (height < container.offsetHeight) && height > 100) {
                el.style.height = height + 'px';
                if (sign[1] === -1) {
                    el.style.top = parseInt(el.style.top) + movementY + 'px';
                }
            }

            //Resize message panel
            var messegesPanel = document.getElementById('messages');
            var input = document.getElementById('input-bar').getElementsByTagName('textarea')[0];
            messegesPanel.style.height = messegesPanel.parentElement.clientHeight - document.getElementById('title-bar').clientHeight - input.parentElement.clientHeight + "px";
        }

        function remove() {
            el.removeEventListener('mousemove', resizePassArgs);
            container.removeEventListener('mousemove', resizePassArgs);
            document.body.classList.remove('noselect');
            getChatX();
            getChatY();
        }

        function add(sign, e) {
            remove();
            clickX = e.clientX - sign[0] * parseInt(el.style.width);
            clickY = e.clientY - sign[1] * parseInt(el.style.height);
            resizePassArgs = resize.bind(null, sign);
            el.addEventListener('mousemove', resizePassArgs);
            container.addEventListener('mousemove', resizePassArgs);
            document.body.classList.add('noselect');
        }

        el.addEventListener('mouseup',remove);
        container.addEventListener('mouseup',remove);

        var addPassArgs;
        var resizePassArgs;

        var handle = [];
        var handleClasses = ['resizable-top-right', 'resizable-top-left', 'resizable-left', 'resizable-bottom-left', 'resizable-bottom', 'resizable-bottom-right', 'resizable-right'];
        var handleSigns = [[1,-1], [-1,-1], [-1,0], [-1,1], [0,1], [1,1], [1,0]];
        for (let i = 0; i < handleClasses.length; i++) {
            handle[i] = document.createElement('div');
            handle[i].className = 'resizable-handle ' + handleClasses[i];
            if (handleSigns[i][0] && handleSigns[i][1]) {
                handle[i].className += " corner-handle";
            }
            addPassArgs = add.bind(null, handleSigns[i]);
            handle[i].addEventListener('mousedown', addPassArgs);
            handle[i].addEventListener('mouseup', remove);
            el.appendChild(handle[i]);
        }
    },
    scrollable: function(el) {
        var container = document.getElementById('world');
        var LastX = 0;
        var LastY = 0;
        var grabbed = false;
        container.addEventListener('mousedown', function(e) {
            LastX = e.clientX;
            LastY = e.clientY;
            grabbed = true;
        });
        container.addEventListener('mouseup', function() {
            grabbed = false;
        });
        container.addEventListener('mouseleave', function() {
            grabbed = false;
        })
        container.addEventListener('mousemove', function(e) {
            if (grabbed && penSettings.tool == 'drag') {
                var movementX = e.clientX - LastX;
                var movementY = e.clientY - LastY;
                el.scrollLeft -= movementX;
                el.scrollTop -= movementY;
                LastX = e.clientX;
                LastY = e.clientY;
            }
        });
    },
    contextMenu: function(e, name){
        var options = {
            Locate: {
                callback: function(name) {
                    CHAT.submit('/locate ' + name);
                }
            },
            Whois: {
                callback: function(name) {
                    CHAT.submit('/whois ' + name);
                }
            },
            Kick: {
                callback: function(name) {
                    CHAT.submit('/kick ' + name);
                }
            },
            Ban: {
                callback: function(name) {
                    CHAT.submit('/ban ' + name);
                }
            }
        }
        var Oldmenu = document.getElementById('context-menu');
        if (Oldmenu) {
            document.body.removeChild(Oldmenu);
        }
        var menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.style.cssText = 'position: absolute; z-index: 9999999; width: 100px; background-color: #EEE; font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 11px;';
        menu.style.left = e.pageX + 'px';
        menu.style.top = (e.pageY - menu.offsetHeight) + 'px';
        var header = document.createElement('header');
        header.style.cssText = 'background-color: #DDD; padding: 2px; font-weight: bold; word-wrap: break-word;';
        header.textContent = name;
        menu.appendChild(header);
        menu.addEventListener('mouseleave', function() {
            document.body.removeChild(menu);
        });
        var keys = Object.keys(options);
        for (var i = 0; i < keys.length; i++) {
            var li = document.createElement('li');
            var att = keys[i];
            li.style.cssText = 'height: 15px; cursor: pointer; list-style: none; padding: 2px 2px 2px 24px;';
            li.onmouseover = function() {
                this.style.backgroundColor = '#39F';
            }
            li.onmouseout = function() {
                this.style.backgroundColor = '';
            }
            li.textContent = att;
            li.onclick = function(e){
                document.body.removeChild(menu);options[e.target.textContent].callback(name);
            }
            menu.appendChild(li);
        }
        document.body.appendChild(menu);
    }
};

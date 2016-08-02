window.$$$ = {
    draggable : function (el, stopOn) {
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
        }
        
        el.addEventListener('mousedown', function (e) {
            var target = e.target || e.srcElement;
            if (!target.classList.contains('resizable-handle') && target.nodeName !== stopOn) {
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
    resizable : function (el) {
        var container = document.getElementById('world'),
            width = el.offsetWidth,
            height = el.offsetHeight,
            clickX = 0,
            clickY = 0;
        
        el.style.width = width + 'px';
        el.style.height = height + 'px';
        
        function resize(event) {
            var movementX = (event.clientX - clickX) - parseInt(el.style.width, 10),
                movementY = (event.clientY - clickY) - parseInt(el.style.height, 10);
            width = parseInt(el.style.width) + movementX;
            height = parseInt(el.style.height) + movementY;
            if ((width < container.offsetWidth) && width > 200) {
                el.style.width = width + 'px';
            }
            if (((height + parseInt(el.style.top)) < container.offsetHeight) && height > 100) {
                el.style.height = height + 'px';
            }
        }
        
        function remove() {
            el.removeEventListener('mousemove', resize);
            container.removeEventListener('mousemove', resize);
            document.body.classList.remove('noselect');
        }
        
        function add(e) {
            clickX = e.clientX - parseInt(el.style.width);
            clickY = e.clientY - parseInt(el.style.height);
            el.addEventListener('mousemove', resize);
            container.addEventListener('mousemove', resize);
            document.body.classList.add('noselect');
        }
        
        el.addEventListener('mouseup',remove);    
        container.addEventListener('mouseup',remove);
                        
        //right resize handle
        var rightHandle = document.createElement('div');
        rightHandle.className = 'resizable-handle resizable-right';
        rightHandle.addEventListener('mousedown', add);
        rightHandle.addEventListener('mouseup',remove);
        
        //bottom resize handle
        var bottomHandle = document.createElement('div');
        bottomHandle.className = 'resizable-handle resizable-bottom';
        bottomHandle.addEventListener('mousedown', add);
        bottomHandle.addEventListener('mouseup',remove);
        
        el.appendChild(rightHandle);
        el.appendChild(bottomHandle);
    },
    scrollable : function(el){
        var container = document.getElementById('world');
        var LastX = 0;
        var LastY = 0;   
        var grabbed = false;
        container.addEventListener('mousedown', function(e){
            LastX = e.clientX;
            LastY = e.clientY;
            grabbed = true;
        });
        container.addEventListener('mouseup', function(){
            grabbed = false;
        });
        container.addEventListener('mouseleave', function(){
            grabbed = false;
        })
        container.addEventListener('mousemove', function(e){
            if(grabbed && penSettings.tool == 'drag') {
                var movementX = e.clientX - LastX;
                var movementY = e.clientY - LastY;
                el.scrollLeft -= movementX;
                el.scrollTop -= movementY;
                LastX = e.clientX;
                LastY = e.clientY;
            }
        });
    },
    contextMenu : function(e, name){
        var options = {
            Kick : {
                callback : function(name){
                    CHAT.submit('/kick ' + name);
                }
            },
            Ban : {
                callback : function(name){
                    CHAT.submit('/ban ' + name);
                }
            },
            Whois : {
                callback : function(name){
                    CHAT.submit('/whois ' + name);
                }
            }
        }
        var Oldmenu = document.getElementById('context-menu');
        if(Oldmenu) document.body.removeChild(Oldmenu);
        var menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.style.cssText = 'position:absolute;z-index:9999999;width:100px;background-color:#EEE;font-family: Verdana, Arial, Helvetica, sans-serif;font-size: 11px';
        menu.style.left = e.pageX + 'px';
        menu.style.top = (e.pageY - menu.offsetHeight) + 'px';
        var header = document.createElement('header');
        header.style.cssText = 'background-color:#DDD;padding:2px;font-weight:bold;word-wrap: break-word;';
        header.textContent = name;
        menu.appendChild(header);
        menu.addEventListener('mouseleave', function(){
            document.body.removeChild(menu);
        });
        var keys = Object.keys(options);
        for(var i = 0; i < keys.length; i++){
            var li = document.createElement('li');
            var att = keys[i];
            li.style.cssText = 'height: 15px;cursor: pointer;list-style: none;padding: 2px 2px 2px 24px;';
            li.onmouseover = function(){ this.style.backgroundColor = '#39F'; }
            li.onmouseout = function(){ this.style.backgroundColor = ''; }
            li.textContent = att;
            li.onclick = function(e){ document.body.removeChild(menu);options[e.target.textContent].callback(name); }
            menu.appendChild(li);
        }
        document.body.appendChild(menu);
    }
};
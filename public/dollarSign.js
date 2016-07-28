window.$$$ = {
    draggable : function (el) {
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
            if (!target.classList.contains('resizable-handle') && target.nodeName !== 'IMG') {
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
            height = el.offsetHeight;
        el.style.width = width + 'px';
        el.style.height = height + 'px';
        
        var clickX = 0,
            clickY = 0;
        
        function resize(event){
            var movementX = (event.clientX-clickX) - parseInt(el.style.width);
            var movementY = (event.clientY-clickY) - parseInt(el.style.height);
            width = parseInt(el.style.width) + movementX;
            height = parseInt(el.style.height) + movementY;
            if((width < container.offsetWidth) && width > 200){
                el.style.width = width + 'px';
            }
            if(((height + parseInt(el.style.top)) < container.offsetHeight) && height > 100){
                el.style.height = height + 'px';
            }
        }
        
        function remove(){
            el.removeEventListener('mousemove',resize);
            container.removeEventListener('mousemove',resize);
            document.body.classList.remove('noselect');
        }
        
        function add(e){
            clickX = e.clientX - parseInt(el.style.width);
            clickY = e.clientY - parseInt(el.style.height);
            el.addEventListener('mousemove',resize);
            container.addEventListener('mousemove',resize);
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
            var tile = pen.getElementsByTagName('img')[0];
            if(grabbed && (!tile.src.length || remove)){
                var movementX = e.clientX-LastX;
                var movementY = e.clientY-LastY;
                el.scrollLeft -= movementX;
                el.scrollTop -= movementY;
                LastX = e.clientX;
                LastY = e.clientY; 
            }
        });
    },
    SendAvy : function(imgdata, name, SpriteFrames, channel){
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
                socket.emit('core',{//send image data to server
                    command : 'uploadAvy',
                    data : {
                        avy : pixs,
                        name : name,
                        channel : channel
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
};
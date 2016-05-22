/*
newlined speech bubbles
probably will need login protection for the editor
*/

var socket = io(window.location.pathname);
var canvas = $('#grid')[0];
canvas.width = $('#world').width();
canvas.height = $('#world').height();
var cx = canvas.getContext("2d");

var $$$ = {
    draggable : function(el){
        var container = document.getElementById('world');
        var clickX = 0;
        var clickY = 0;
        el.style.left = el.offsetLeft + 'px';
        el.style.top = el.offsetTop + 'px';
        
        function drag(event){
            var left = event.clientX-clickX;
            var top = event.clientY-clickY;
            if(left + el.offsetWidth <= container.offsetWidth && left >= container.offsetLeft){
                el.style.left = left + 'px';
            }
            if(top + el.offsetHeight <= container.offsetHeight && top >= container.offsetTop){
                el.style.top = top + 'px';
            }
        }
        
        function remove(){
            el.removeEventListener('mousemove',drag);
            container.removeEventListener('mousemove',drag);
            document.body.classList.remove('noselect');
        }
        
        el.addEventListener('mousedown', function(e){
            var target = e.target || e.srcElement;
            if(!target.classList.contains('resizable-handle') && target.nodeName != 'IMG'){
                clickX = e.clientX - parseInt(el.style.left);
                clickY = e.clientY - parseInt(el.style.top);
                el.addEventListener('mousemove',drag);
                container.addEventListener('mousemove',drag);
                document.body.classList.add('noselect');            
            }
        });
                
        el.addEventListener('mouseup', remove);
        container.addEventListener('mouseup', remove);
    },
    resizable : function(el){
        var container = document.getElementById('world');
        var width = el.offsetWidth;
        var height = el.offsetHeight;
        el.style.width = width + 'px';
        el.style.height = height + 'px';
        
        var clickX = 0;
        var clickY = 0;     
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
    }
}

$$$.scrollable(document.body);

function drawBoard(){
    cx.beginPath(); 
    for(var x = 0; x <= canvas.width; x += 16) {
        cx.moveTo(0,x);
        cx.lineTo(canvas.width,x);
    }
    for(var x = 0; x <= canvas.width; x += 16) {
        cx.moveTo(x,0);
        cx.lineTo(x,canvas.height);
    }
    cx.strokeStyle = "lightblue";
    cx.stroke();
    cx.beginPath(); 
    for(var x = 0; x <= canvas.width; x += 32) {
        cx.moveTo(0,x);
        cx.lineTo(canvas.width,x);
    }
    for(var x = 0; x <= canvas.width; x += 32) {
        cx.moveTo(x,0);
        cx.lineTo(x,canvas.height);
    }
    cx.strokeStyle = "blue";
    cx.stroke();
}

drawBoard();

//load old map
socket.emit('GetMap');
socket.on('MapInfo', function(data){
    var Tiles = data && JSON.parse(data.tiles);
    for(var t in Tiles){
        PlaceTile(Tiles[t].left,Tiles[t].top,Tiles[t].sx,Tiles[t].sy);
    }
    var Objects = data && JSON.parse(data.objects);
    for(var o in Objects){
        PlaceObject(Objects[o].tiles,Objects[o].left + 'px',Objects[o].top + 'px',Objects[o].collision);
    }
    if(data && data.spawn){
        try{
            var Spawn = JSON.parse(data.spawn);
            var clone = document.getElementById('spawn').cloneNode();
            clone.addEventListener('mousedown', function(){
                if(remove){
                    document.getElementById('world').removeChild(clone);
                    settings.spawn = [];
                }
            });
            settings.spawn = Spawn;
            clone.textContent = 'Spawn';
            clone.style.position = 'absolute';
            clone.style.zIndex = '99';
            clone.style.left = Spawn[0] + 'px';
            clone.style.top = Spawn[1] + 'px';
            clone.style.display = 'none';
            document.getElementById('world').appendChild(clone);
        } catch(err){
            data.spawn = [0,0];
        }
    }
});

function TileIndex(object,tile){
	if(object){
		for(var i in settings.objects){
			if(settings.objects[i].left == object.left && settings.objects[i].top == object.top && settings.objects[i].order == object.order){
				return i;
			}
		}
	} else {
        for(var i = 0; i < settings.tiles.length; i++){
			if(settings.tiles[i].left == tile.x && settings.tiles[i].top == tile.y){
                return i;
			}
        }
	}
    return -1;
}

function PlaceTile(x,y,sx,sy){
    var index = TileIndex(null,{
		x : x,
		y : y,
		sx : sx,
		sy : sy
	});
    if(index == -1 && x >= 0 && y >= 0){
        var x = parseInt(x);
        var y = parseInt(y);
        //create Item div
        var item = document.createElement('div');
        document.getElementById('world').appendChild(item);
        item.id = settings.tiles.length;
        item.style.position = 'absolute';
        item.className = 'item placed-item';
        item.style.left = x + 'px';
        item.style.top = y + 'px';
		item.style.width = '16px';
		item.style.height = '16px';
		item.style.background = 'url(\'../images/tiles/Tileset.png\') -' + sx + 'px -' + sy + 'px';
        //highlight item on hover
        item.addEventListener('mouseover',function(){
            if(remove) item.style.border = 'solid 1px red';
        });
        //remove highlight on leave
        item.addEventListener('mouseleave',function(){
            item.style.border = '';
        });
        //remove item on click
        item.addEventListener('click',function(){
            if(remove){
                var index = TileIndex(null,{
					x : x,
					y : y,
					sx : sx,
					sy : sy
				});
                settings.tiles.splice(index,1);
                this.remove();
            }
        });
		
        //store last move
        settings.lastclick = {
            left : parseInt(x),
            top : parseInt(y),
            sx : sx,
            sy : sy,
            order : settings.tiles.length
        }
		
		settings.tiles.push(settings.lastclick);
        
        //add to history
        settings.history.push({
            tile : item,
            type : 'tiles'
        });
    }
}

function PlaceObject(Tiles,startX,startY,collision){
        var ObjectData = [];
        var Height = 0;
        if(Tiles && Tiles.length){//If tiles, object
            var ObjectContainer = document.createElement('div');
            ObjectContainer.id = settings.objects.length;
            ObjectContainer.style.position = 'absolute';
            ObjectContainer.className = 'item placed-object';
            ObjectContainer.style.left = startX;
            ObjectContainer.style.top = startY;
            //Append all tiles to ObjectContainer
            for(var o = 0; o < Tiles.length; o++){
                var Tile = Tiles[o];
                var item = document.createElement('div');
                item.style.position = 'absolute';
                item.style.left = Tile.left + 'px';
                item.style.top = Tile.top + 'px';
                item.style.width = '16px';
                item.style.height = '16px';
                item.style.background = 'url(\'../images/tiles/Tileset.png\') -' + Tile.sx + 'px -' + Tile.sy + 'px';
                ObjectContainer.appendChild(item);
                ObjectData.push({
                    left : parseInt(item.style.left),
                    top : parseInt(item.style.top),
                    sx : Tile.sx,
                    sy : Tile.sy
                });
                if(parseInt(item.style.top) > Height) Height = parseInt(item.style.top);
            }
            document.getElementById('world').appendChild(ObjectContainer);
            //highlight ObjectContainer on hover
            ObjectContainer.addEventListener('mouseover',function(){
                if(remove){
                    var Children = ObjectContainer.children;
                    for(var i = 0; i < Children.length; i++){
                        Children[i].style.border = 'solid 1px blue';
                    }
                }
            });
            //remove highlight on leave
            ObjectContainer.addEventListener('mouseleave',function(){
                var Children = ObjectContainer.children;
                for(var i = 0; i < Children.length; i++){
                    Children[i].style.border = '';
                }        
            });
            //remove ObjectContainer on click
            ObjectContainer.addEventListener('click',function(e){
                if(remove){
                    var index = TileIndex({
                        left : parseInt(startX),
                        top : parseInt(startY),
                        order : parseInt(e.target.parentNode.id)
                    });
                    settings.objects.splice(index,1);
                    document.getElementById('world').removeChild(ObjectContainer);
                }
            });
            //Load into object settings on double click
            ObjectContainer.addEventListener('dblclick',function(){
                var ThisObject = settings.objects[this.id];
                setCollison(ThisObject.tiles,ThisObject)
            });
        } else {//no tiles, collision block
            var cblock = document.getElementById('cblock').cloneNode();
            cblock.style.position = 'absolute';
            cblock.style.zIndex = '99';
            cblock.style.left = startX;
            cblock.style.top = startY;
            cblock.style.display = 'none';
			cblock.id = settings.objects.length;
            cblock.addEventListener('click', function(e){
                if(remove){
                    var index = TileIndex({
                        left : parseInt(startX),
                        top : parseInt(startY),
                        order : parseInt(e.target.id)
                    });
                    settings.objects.splice(index,1);
                    document.getElementById('world').removeChild(cblock);
                }
            });
            document.getElementById('world').appendChild(cblock);
        }
        
        //store last move
        settings.lastclick = {
            left : parseInt(startX),
            top : parseInt(startY),
            tiles : ObjectData,
            height : Height + 16,
            order : settings.objects.length
        }
		
		settings.objects.push(settings.lastclick);
        
        //If no collision set collision for object
        if(!collision){
            setCollison(Tiles,settings.objects[settings.objects.length-1]);
        } else {
            settings.objects[settings.objects.length-1].collision = collision;
        }
		
        //add to history
        settings.history.push({
            tile : item,
            type : 'objects'
        });
        pen.innerHTML = '<img draggable="false">';
}

var table;
var pen = document.getElementById('pen');
var fixed = false;
var remove = false;
var QuickPlace = false;
var tilesheet = new Image();
var StartPoint = [];

var settings = {
    lastclick : null,
    tiles : [],
    objects : [],
    history : [],
    spawn : []
}

socket.on('connect', function(){
   console.log('connected');
});

//Grab all objects and tiles image name
socket.emit('RequestTiles');
socket.on('Tiles',function(a){
	tilesheet.src = '../images/tiles/Tileset.png';
	var tilecanvas = document.createElement('canvas');
	tilecanvas.width = 16;
	tilecanvas.height = 16;
	var tilectx = tilecanvas.getContext('2d');
	document.body.appendChild(tilecanvas);
	table = document.createElement('table');
	
	var moving = false;
	var selected = [];
    var started = [];
	
	tilesheet.onload = function(){
		table.width = tilesheet.width;
		var width = tilesheet.width;
		var height = tilesheet.height;
		for(var h = 0; h <= height; h+=16){
			var tr = document.createElement('tr');
			table.appendChild(tr);
			for(var w = 0; w <= width; w+=16){
				var td = document.createElement('td');
				tilectx.clearRect(0, 0, tilesheet.width, tilesheet.height);
				tilectx.drawImage(tilesheet,w,h,16,16,0,0,16,16);
				var tile = new Image();
				tile.src = tilecanvas.toDataURL();
				tile.draggable = false;
				td.appendChild(tile);
				tr.appendChild(td);
			}
			table.appendChild(tr);
		}
        document.body.removeChild(tilecanvas);
        
        function mouseDown(e){
			for(var i = 0; i < selected.length; i++){//remove highlighted tiles
				selected[i].tile.style.boxShadow = '';
			}
			selected = [];
            pen.innerHTML = '<img draggable="false">';
            var td = e.target.parentNode;
            var cell = td.cellIndex;
            var row = td.parentNode.rowIndex;
            started = [cell,row];
			moving = true;
        }
        
        function mouseUp(e){
			moving = false;
            var td = e.target.parentNode;
            var cell = td.cellIndex;
            var row = td.parentNode.rowIndex;
            var finished = [cell+1,row+1];
            
            var CurrentTable = e.target.parentNode.parentNode.parentNode
            for(var x = started[0]; x < finished[0]; x++){
                for(var y = started[1]; y < finished[1]; y++){
                    var td = CurrentTable.children[y].children[x];
                    td.getElementsByTagName('img')[0].style.boxShadow = '0px 0px 0px 1px #f00';
                    selected.push({
                        tile : td.getElementsByTagName('img')[0],
                        cell : x,
                        row : y
                    });
                }
            }
            
			var minusX = selected[0].cell;
			var minuxY = selected[0].row;
            var maxX = 0;
            var maxY = 0;
            pen.innerHTML = '';
            
            for(var r = 0; r < selected.length; r++){
                var tile = selected[r];
                var TileImage = new Image();
                if(maxX < tile.cell-minusX) maxX = tile.cell-minusX;
                if(maxY < tile.row-minuxY) maxY = tile.row-minuxY;
                TileImage.src = tile.tile.src;
                TileImage.style.position = 'absolute';
				TileImage.style.left = ((tile.cell*16)-(minusX*16)) + 'px';
				TileImage.style.top = ((tile.row*16)-(minuxY*16)) + 'px';
                TileImage.draggable = false;
				TileImage.attributes.pos = {
					x : tile.cell*16,
					y : tile.row*16
				}
                if(e.target.offsetParent.offsetParent.parentNode.id == 'tiles'){
                    if(!pen.classList.contains('tiles')){
                        pen.classList.add('tiles');
                    }
                } else {
                    pen.classList.remove('tiles');
                }
                pen.appendChild(TileImage);
            }
            pen.attributes.maxX = maxX+1;
            pen.attributes.maxY = maxY+1;
        }
        
        function mouseMove(e){
			if(moving && e.target.tagName == 'IMG'){
				var row = e.target.parentNode.parentNode.rowIndex;
				var cell = e.target.parentNode.cellIndex;
                var finished = [cell+1,row+1];
                var CurrentTable = e.target.parentNode.parentNode.parentNode
                for(var x = started[0]; x < finished[0]; x++){
                    for(var y = started[1]; y < finished[1]; y++){
                        var td = CurrentTable.children[y].children[x];
                        td.getElementsByTagName('img')[0].style.boxShadow = '0px 0px 0px 1px #f00';
                    }
                }
			}
        }
        
		table.addEventListener('mousedown', mouseDown);
		table.addEventListener('mousemove', mouseMove);
        table.addEventListener('mouseup', mouseUp);		
        
		document.getElementById('tiles').appendChild(table);
        var TableClone = table.cloneNode(true);
        
		TableClone.addEventListener('mousedown', mouseDown);	
		TableClone.addEventListener('mousemove', mouseMove);
        TableClone.addEventListener('mouseup', mouseUp);	
        
        document.getElementById('objects').appendChild(TableClone);
	}
});

var ExtraTiles = document.getElementsByClassName('extra');
for(var i = 0; i < ExtraTiles.length; i++){
    ExtraTiles[i].addEventListener('click', function(){
        var clone = this.cloneNode();
        clone.style.zIndex = '99';
        pen.innerHTML = '';
        pen.appendChild(clone);
    });
}

function setCollison(Tiles,obj){
    var check = document.getElementById('CollisionSettings');
    if(check) document.body.removeChild(check);
    var container = document.getElementById('world');
    var Cover = document.createElement('div');
    Cover.id = 'CollisionSettings';
    Cover.style.height = screen.height + 'px';
    Cover.style.width = screen.width + 'px';
    Cover.style.position = 'fixed';
    Cover.style.zIndex = '100';
    Cover.style.left = '0px';
    Cover.style.top = '0px';
    Cover.style.backgroundColor = 'rgba(0,0,0,0.5)';
    var Panel = document.createElement('div');
    Panel.style.position = 'relative';
    Panel.style.width = '300px';
    Panel.style.height = '300px';
    Panel.style.backgroundColor = 'white';
    Panel.style.border = '3px solid grey';
    Panel.style.left = ((screen.width/2)-150) + 'px';
    Panel.style.top = ((screen.height/2)-150) + 'px';
    var ColCanvas = document.createElement('canvas');
    ColCanvas.width = '300';
    ColCanvas.height = '275';
    var ctx = ColCanvas.getContext('2d');
    Panel.appendChild(ColCanvas);
    for(var i = 0; i < Tiles.length; i++){//load images
        var Tile = Tiles[i];
        ctx.drawImage(tilesheet,Tile.sx,Tile.sy,16,16,Tile.left,Tile.top,16,16);
    }
    Cover.appendChild(Panel);;
    var footer = document.createElement('div');
    footer.style.cssText = 'width:100%;height:25px;position:absolute;bottom:0px;background-color:grey;text-align:center;';
    footer.textContent = 'Ok';
    footer.addEventListener('click',function(){
        obj.collision = [RedBox.offsetLeft,RedBox.offsetLeft+RedBox.offsetWidth,RedBox.offsetTop,RedBox.offsetTop+RedBox.offsetHeight];
        obj.height = HeightLine.offsetTop;
        document.body.removeChild(Cover);
    });
    Panel.appendChild(footer);
    var RedBox = document.createElement('div');
    RedBox.style.width = '16px';
    RedBox.style.height = '16px';
    RedBox.style.backgroundColor = 'red';
    RedBox.style.position = 'absolute';
    RedBox.style.top = '0px';
    RedBox.style.left = '0px';
    Panel.appendChild(RedBox);
    $(RedBox).draggable({
        containment: "parent"
    }).resizable({
        StartPoint: [ 16, 16 ]
    });
    var HeightLine = document.createElement('div');
    HeightLine.style.position = 'absolute';
    HeightLine.style.top = '0px';
    HeightLine.style.left = '0px';
    HeightLine.style.width = '100%';
    HeightLine.style.height = '5px';
    HeightLine.style.backgroundColor = 'blue';
    Panel.appendChild(HeightLine);
    $(HeightLine).draggable({
        containment : "parent"
    })
    document.body.appendChild(Cover);
}

$('#world').mousemove(function(e){
    var tile = pen.getElementsByTagName('img')[0];
    var extra = pen.getElementsByClassName('extra')[0];
    if(extra){
        var x = Math.floor(((e.clientX + document.body.scrollLeft) - (parseInt(extra.style.width)/2))/16)*16
        var y = Math.floor(((e.clientY + document.body.scrollTop) - (parseInt(extra.style.height)/2))/16)*16;
        pen.style.left = x + 'px';
        pen.style.top = y + 'px';
    } else if(tile && tile.src){
        var pos = {};
        var x, y;
        if(remove){return;};
        if(fixed){
            if(settings.lastclick){
                x = settings.lastclick.left;
                y = settings.lastclick.top;
                if(e.clientX > x + (tile.width/2)){
                    x = x + tile.width;
                } 
                if(e.clientX < x - (tile.width/2)){
                    x = x - tile.width;
                }
                if(e.clientY > y + tile.height){
                    y = y + tile.height;
                } 
                if(e.clientY < y - tile.height){
                    y = y - tile.height;
                }   
            } else {
                x = 0;
                y = 0;
            }
        } else {
            x = Math.floor(((e.clientX + document.body.scrollLeft) - (tile.width/2))/16)*16;
            y = Math.floor(((e.clientY + document.body.scrollTop) - (tile.height/2))/16)*16;
            if(e.shiftKey){
                //
            }
        }
        if(QuickPlace){
            var tiles = pen.getElementsByTagName('img');
            for(var i = 0; i < tiles.length; i++){
                var tile = tiles[i];
                if(tile && tile.src){
                    var ItemType = tile.src.length > 100 ? 'tiles' : tile.src.split('/')[4];
                    if(ItemType == 'tiles'){
                        if(!remove){
                            var minusX = tiles[0].attributes.pos.x;
                            var minusY = tiles[0].attributes.pos.y;
                            pos = {
                                left : parseInt(pen.style.left) + (tile.attributes.pos.x-minusX),
                                top : parseInt(pen.style.top) + (tile.attributes.pos.y-minusY)
                            }
                            PlaceTile(pos.left,pos.top,tile.attributes.pos.x,tile.attributes.pos.y);
                        }
                    }
                }
            }
        }
        pen.style.left = x + 'px';
        pen.style.top = y + 'px';
    }
}).mousedown(function(e){
    var tile = pen.getElementsByTagName('img');
    if(tile[0].src.length){
        StartPoint = [parseInt(pen.style.left),parseInt(pen.style.top),e.shiftKey];
    }
}).mouseup(function(){
	var tiles = pen.getElementsByTagName('img');
    var extra = pen.getElementsByClassName('extra')[0];
    if(extra){
        document.getElementById('world').appendChild(extra);
        extra.addEventListener('mousedown', function(){
            if(remove){
                if(extra.id == 'spawn'){
                    settings.spawn = [];
                }
                document.getElementById('world').removeChild(extra);
            }
        });
        extra.style.position = 'absolute';
        extra.style.left = pen.style.left;
        extra.style.top = pen.style.top;
        if(extra.id == 'spawn') {
            settings.spawn = [parseInt(pen.style.left),parseInt(pen.style.top)];
        } else {
            PlaceObject([],pen.style.left,pen.style.top,[0,48,0,48]);
        }
    } else {
        if(!remove){
            if(pen.classList.contains('tiles')){
                function placeTileCluster(tiles,Sx,Sy){
                    for(var i = 0; i < tiles.length; i++){
                        var tile = tiles[i];
                        if(tile && tile.src){
                            var pos = {};
                            if(StartPoint[2]){
                                pos = {
                                    left : StartPoint[0],
                                    top : StartPoint[1]
                                }
                            } else {
                                pos = {
                                    left : parseInt(tile.style.left) + parseInt(pen.style.left),
                                    top : parseInt(tile.style.top) + parseInt(pen.style.top)
                                } 
                            }
                            PlaceTile(pos.left+(Sx*16),pos.top+(Sy*16),tile.attributes.pos.x,tile.attributes.pos.y);
                        }	
                    } 
                }
                var Px = (StartPoint[0] - parseInt(pen.style.left))/16;
                var Py = (StartPoint[1] - parseInt(pen.style.top))/16;
                if(StartPoint[2]){
                    /*for(var Sx = Px; Sx <= 0; Sx+=pen.attributes.maxX){
                        for(var Sy = Py; Sy <= 0; Sy+=pen.attributes.maxY){
                            placeTileCluster(tiles,Sx,Sy);
                        }
                    }*/
                    Px = Math.abs(Px);
                    Py = Math.abs(Py);
                    for(var Sx = 0; Sx < Px; Sx++){
                        for(var Sy = 0; Sy < Py; Sy++){
                            var tile;
                            var TileNumber = 4;
                            if(Sx == 0 && Sy == 0){
                                TileNumber = 0;  
                            } else if(Sx == Px-1 && Sy == 0){//top right corner
                                TileNumber = 6; 
                            } else if(Sx == 0 && Sy == Py-1){//bottom left corner
                                TileNumber = 2;
                            } else if(Sx == Px-1 && Sy == Py-1){//bottom right corner
                                TileNumber = 8;
                            } else if(Sy == 0){//top middle
                                TileNumber = 3; 
                            } else if(Sy == Py-1){//bottom center
                                TileNumber = 5;
                            } else if(Sx == 0){//left center
                                TileNumber = 1;
                            } else if(Sx == Px-1){//right center
                                TileNumber = 7; 
                            }
                            
                            var tile = tiles[TileNumber].cloneNode();
                            tile.attributes.pos = {
                                x : tiles[TileNumber].attributes.pos.x,
                                y : tiles[TileNumber].attributes.pos.y
                            }
                            placeTileCluster([tile],Sx,Sy);
                        }
                    }
                } else {
                    placeTileCluster(tiles,0,0);
                }
            } else {
                var SendTiles = [];
                for(var i = 0; i < tiles.length; i++){
                    var tile = tiles[i];
                    if(tile && tile.src){
                        SendTiles.push({
                            left : parseInt(tile.style.left),
                            top : parseInt(tile.style.top),
                            sx : tile.attributes.pos.x,
                            sy : tile.attributes.pos.y
                        });
                    }
                }
                if(SendTiles.length) PlaceObject(SendTiles,pen.style.left,pen.style.top);
            }
        }   
    }
});

document.getElementById('tabs').addEventListener('click', function(e){
    var tab = e.target;
    if(tab.classList.contains('tab')){
        var otherTabs = document.getElementsByClassName('tab');
        for(var i = 0; i < otherTabs.length; i++){
            document.getElementById(otherTabs[i].classList[1]).style.display = 'none';
            otherTabs[i].classList.remove('selected');
        }
        if(tab.classList[1] == 'settings'){
            var extras = document.getElementsByClassName('extra');
            for(var i = 0; i < extras.length; i++){
                extras[i].style.display = 'block';
            }
        } else {
            var extras = document.getElementsByClassName('extra');
            if(extras[0].style.display == 'block'){
                for(var i = 0; i < extras.length; i++){
                    extras[i].style.display = 'none';
                }   
            }
        }
        tab.classList.add('selected');
        document.getElementById(tab.classList[1]).style.display = 'block';
    }
});

document.getElementById('OBJdisplay').addEventListener('click', function(e){
	var checked = e.target.checked;
	if(checked){
		var objects = settings.objects;
		for(var i = 0; i < objects.length; i++){
			var ThisObj = settings.objects[i];
			var CollisonBlob = document.createElement('div');
			CollisonBlob.classList.add('CollisonBlob');
			console.log(ThisObj)
			CollisonBlob.style.left = ThisObj.left + ThisObj.collision[0] + 'px';
			CollisonBlob.style.width = ThisObj.collision[1] - ThisObj.collision[0] + 'px';
			CollisonBlob.style.top = ThisObj.top + ThisObj.collision[2] + 'px';
			CollisonBlob.style.height = ThisObj.collision[3] - ThisObj.collision[2] + 'px';
			CollisonBlob.style.backgroundColor = 'red';
			CollisonBlob.style.position = 'absolute';
			CollisonBlob.style.zIndex = '9999';
			document.getElementById('world').appendChild(CollisonBlob);
			
		}
	} else {
		var CollisonBlobs = document.getElementsByClassName('CollisonBlob');
		while(CollisonBlobs.length){
			document.getElementById('world').removeChild(CollisonBlobs[0]);
		}
	}
});

function save(){
    socket.emit('SaveMapTiles',{
        tiles : settings.tiles,
        objects : settings.objects,
        spawn : settings.spawn
    });
}

$(document).keydown(function(e){
    var key = e.which
    if(key == 77) fixed = !fixed;
    if(key == 88) QuickPlace = !QuickPlace;
    if(key == 90){
        var tile = settings.history.slice(-1)[0];
        if(tile && tile.tile){
            tile.tile.remove();
            settings.history.pop();
            settings[tile.type].pop();   
        }
    }
    if(key == 17) remove = !remove;
});

var side = document.getElementById('side');
$$$.draggable(side);
$$$.resizable(side);

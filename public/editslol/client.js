/*
newlined speech bubbles
probably will need login protection for the editor
*/

var socket = io(window.location.pathname);

(function(){//draw grid 
    var canvas = document.getElementById('grid');
    canvas.width = $('#world').width();
    canvas.height = $('#world').height();
    var cx = canvas.getContext("2d");
    
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
    
    //drag to scroll
    $$$.scrollable(document.body);
    
    var sideMenu = document.getElementById('side');
    $$$.draggable(sideMenu);
    $$$.resizable(sideMenu);
    
})();

var build = {
    object : function (tilesheetsrc, startX, startY, tileInfo){
        var conatiner = document.createElement('div');
        conatiner.id = settings.objects.length;
        conatiner.className = 'item placed-object ' + tilesheetsrc;
        conatiner.style.left = startX;
        conatiner.style.top = startY;            
        conatiner.style.width = tileInfo.MaxX + 'px';
        conatiner.style.height = tileInfo.MaxY + 'px';
        conatiner.style.background = 'url(\'' + tilesheetsrc + '\') -' + tileInfo.MinX + 'px -' + tileInfo.MinY + 'px';
        return conatiner;
    },
    tile : function (tilesheetsrc, x, y, sx, sy){
        var conatiner = document.createElement('div');
        conatiner.id = settings.tiles.length;
        conatiner.className = 'item placed-tile';
        conatiner.style.left = x + 'px';
        conatiner.style.top = y + 'px';
		conatiner.style.background = 'url(\'' + tilesheetsrc + '\') -' + sx + 'px -' + sy + 'px';
        return conatiner;
    },
    editor : function (){
        var Cover = document.createElement('div');
        Cover.id = 'CollisionSettings';

        var Panel = document.createElement('div');
        Panel.id = 'Panel';

        var ColCanvas = document.createElement('canvas');
        ColCanvas.width = '300';
        ColCanvas.height = '275';

        var footer = document.createElement('div');
        footer.className = 'footer';
        footer.textContent = 'Ok';

        var RedBox = document.createElement('div');
        RedBox.className = 'RedBox';

        var HeightLine = document.createElement('div');
        HeightLine.className = 'HeightLine';
        
        Cover.appendChild(Panel);
        Panel.appendChild(HeightLine);
        Panel.appendChild(ColCanvas);
        Panel.appendChild(footer);
        Panel.appendChild(RedBox);
        
        return {
            main : Cover,
            canvas : ColCanvas,
            footer : footer,
            RedBox : RedBox,
            HeightLine : HeightLine
        };
    }
}

function TileIndex(type,data){
    
    if(type == 'tile'){
        var tilesheet = data && data.tilesheetsrc;
        if(!settings.tiles[tilesheet] || !settings.tiles[tilesheet].length) return -1;
        for(var i = 0; i < settings.tiles[tilesheet].length; i++){
			if(settings.tiles[tilesheet][i].left == data.x && settings.tiles[tilesheet][i].top == data.y){
                return i;
			}
        }
    } else {
		for(var i in settings.objects){
			if(settings.objects[i].left == data.left && settings.objects[i].top == data.top && settings.objects[i].order == data.order){
				return i;
			}
		}
    }
    
    return -1;
}

function PlaceTile(x, y, sx, sy, tilesheetsrc = srcTable){
    var index = TileIndex('tile',{x,y,sx,sy,tilesheetsrc});
    var x = parseInt(x);
    var y = parseInt(y);
    
    if(index == -1 && x >= 0 && y >= 0){
        //create tile div
        var tile = build.tile(tilesheetsrc, x, y, sx, sy);
        
        //remove item on click
        tile.addEventListener('click',function(){
            if(remove){
                var index = TileIndex('tile',{x,y,sx,sy,tilesheetsrc});
                settings.tiles[tilesheetsrc].splice(index,1);
				document.getElementById('world-tiles').removeChild(tile);
            }
        });
        
        document.getElementById('world-tiles').appendChild(tile);
				
        if(!settings.tiles[tilesheetsrc]) settings.tiles[tilesheetsrc] = [];
		settings.tiles[tilesheetsrc].push({
            left : x,
            top : y,
            sx : sx,
            sy : sy,
            order : settings.tiles.length
        });
        
        //add to history
        settings.history.push({
            tile : tile,
            type : 'tiles'
        });
    }
}

function PlaceObject(tileInfo,startX,startY,collision,setHeight,tilesheetsrc = srcTable){  
        if(tileInfo && tileInfo.MaxX && collision){
            var ObjectContainer = build.object(tilesheetsrc, startX, startY, tileInfo);
            
            //remove ObjectContainer on click
            ObjectContainer.addEventListener('click',function(e){
                if(remove){
                    var index = TileIndex('object',{
                        left : parseInt(startX),
                        top : parseInt(startY),
                        order : parseInt(e.target.parentNode.id)
                    });
                    settings.objects[tilesheetsrc].splice(index,1);
                    document.getElementById('world-objects').removeChild(ObjectContainer);
                }
            });
            
            //Load into object settings on double click
            ObjectContainer.addEventListener('dblclick',function(){
                console.log(settings.objects[this.id])
                var ThisObject = settings.objects[this.id];
                //setCollison(ThisObject.tiles,ThisObject)
            });
            
            document.getElementById('world-objects').appendChild(ObjectContainer);
            
            if(!settings.objects[tilesheetsrc]) settings.objects[tilesheetsrc] = [];
            
            settings.objects[tilesheetsrc].push({
                left : parseInt(startX),
                top : parseInt(startY),
                tiles : tileInfo,
                height : setHeight || tileInfo.MaxY,
                order : settings.objects.length,
                collision : collision
            });
            
            //add to history
            settings.history.push({
                tile : tileInfo,
                type : 'objects'
            });
        }
}

function placeColBlock (startX, startY) {
    var cblock = document.createElement('div');
    cblock.style.cssText = `position:absolute;z-index:99;display:none;left:${startX};top:${startY}`;
    cblock.id = settings.objects.length;
    cblock.addEventListener('click', function(e){
        if(remove){
            var index = TileIndex('object',{
                left : parseInt(startX),
                top : parseInt(startY),
                order : parseInt(e.target.id)
            });
            settings.objects.splice(index,1);
            document.getElementById('world-objects').removeChild(cblock);
        }
    });
    document.getElementById('world-objects').appendChild(cblock);
}

var pen = document.getElementById('pen');
var remove = false;
var QuickPlace = false;
var currentTileSheet;
var srcTable;
var StartPoint = [];

var settings = {
    tiles : {},
    objects : {},
    history : [],
    spawn : [],
    AI : []
}

function setCollison(tilesheet, startX, startY, tiles){
    var check = document.getElementById('CollisionSettings');
    if(check) document.body.removeChild(check);
    
    var editorWindowParts = build.editor();
    var editorWindow = editorWindowParts.main;
    
    var ctx = editorWindowParts.canvas.getContext('2d');
    var RedBox = editorWindowParts.RedBox;
    var HeightLine = editorWindowParts.HeightLine;
    
    ctx.drawImage(tilesheet, tiles.MinX, tiles.MinY, tiles.MaxX, tiles.MaxY, 0, 0, tiles.MaxX, tiles.MaxY);
    
    editorWindowParts.footer.addEventListener('click',function(){
        var collision = [RedBox.offsetLeft,RedBox.offsetLeft+RedBox.offsetWidth,RedBox.offsetTop,RedBox.offsetTop+RedBox.offsetHeight];
        var height = HeightLine.offsetTop;
        document.body.removeChild(editorWindow);
        PlaceObject(tiles, startX, startY, collision, height);
    });
    
    $(RedBox).draggable({
        containment: "parent"
    }).resizable({
        StartPoint: [ 16, 16 ]
    });
    
    $(HeightLine).draggable({
        containment : "parent"
    });
    
    document.body.appendChild(editorWindow);
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
        if(remove) return;
        
        var x = Math.floor(((e.clientX + document.body.scrollLeft) - (tile.width/2))/16)*16;
        var y = Math.floor(((e.clientY + document.body.scrollTop) - (tile.height/2))/16)*16;
                
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
                            
                            var RealX = parseInt(pen.style.left) + (tile.attributes.pos.x-minusX);
                            var RealY = parseInt(pen.style.top) + (tile.attributes.pos.y-minusY);

                            PlaceTile(RealX, RealY, tile.attributes.pos.x, tile.attributes.pos.y,srcTable);
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
        StartPoint = [parseInt(pen.style.left),parseInt(pen.style.top)];
        StartPoint.spread = e.shiftKey;
    }
}).mouseup(function(){
    if(remove) return;
    
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
        var tiles = pen.getElementsByTagName('img');
        if(pen.classList.contains('tiles')){
            function placeTileCluster(tiles,Sx,Sy){
                for(var i = 0; i < tiles.length; i++){
                    var tile = tiles[i];
                    if(tile && tile.src){
                        var pos = {};
                        if(StartPoint.spread){
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
                        PlaceTile(pos.left+(Sx*16),pos.top+(Sy*16),tile.attributes.pos.x,tile.attributes.pos.y,srcTable);
                    }	
                } 
            }
            if(StartPoint.spread){
                var Px = Math.abs((StartPoint[0] - parseInt(pen.style.left))/16);
                var Py = Math.abs((StartPoint[1] - parseInt(pen.style.top))/16);
                
                
                var topleftcorner = 0;
                var toprightcorner = Px;
                
                var totalX = pen.attributes.TileData.MaxX;
                var totalY = pen.attributes.TileData.MaxY;

                var amountInMiddle = Px-2;
                
                for(var Sx = 0; Sx < Px; Sx++){
                    for(var Sy = 0; Sy < Py; Sy++){
                        console.log(Sx,Px-1,Sy)
                        var TileNumber = 3;
                        
                        if(Sx == 0 && Sy == 0){
                            TileNumber = 0;  
                        } else if(Sx == Px-1 && Sy == 0){//top right corner
                            TileNumber = (totalX*totalY)-totalY;
                        } else if(Sx == 0 && Sy == Py-1){//bottom left corner
                            TileNumber = totalY-1;
                        } else if(Sx == Px-1 && Sy == Py-1){//bottom right corner
                            TileNumber = (totalX*totalY)-1;
                        } else if(Sy == 0){//top middle
                            TileNumber = totalY; 
                        } else if(Sy == Py-1){//bottom center
                            TileNumber = (totalX*2)-1;
                        } else if(Sx == 0){//left center
                            TileNumber = 1;
                        } else if(Sx == Px-1){//right center
                            TileNumber = (totalX*totalY)-2;
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
            var SendTiles = {
                MaxX : pen.attributes.TileData.MaxX*16,
                MaxY : pen.attributes.TileData.MaxY*16,
                MinX : pen.attributes.TileData.MinX*16,
                MinY : pen.attributes.TileData.MinY*16
            };
            
            var theTileSheet = new Image();
            theTileSheet.src = srcTable;
            setCollison(theTileSheet, pen.style.left, pen.style.top, SendTiles);
        }  
    }
});

document.getElementById('tabs').addEventListener('click', function(e){
    var tab = e.target;
    if(tab.classList.contains('tab')){
        var allTabs = document.getElementsByClassName('tab');
                
        var selectedTab = document.getElementsByClassName('selected')[0];
        if(selectedTab){
            var oldWindowName = selectedTab.classList[1];
            if(oldWindowName == 'objects') oldWindowName = 'tiles';
            document.getElementById(oldWindowName).style.display = 'none';
            selectedTab.classList.remove('selected');
            
            var newWindowName = tab.classList[1];
            if(newWindowName == 'objects') newWindowName = 'tiles';
            document.getElementById(newWindowName).style.display = 'block';
            
            if(newWindowName == 'settings' && oldWindowName != 'settings'){
                var extras = document.getElementsByClassName('extra');
                for(var i = 0; i < extras.length; i++){
                    extras[i].style.display = 'block';
                }
            } else if(newWindowName == 'settings'){
                var extras = document.getElementsByClassName('extra');
                for(var i = 0; i < extras.length; i++){
                    extras[i].style.display = 'none';
                } 
            }
            tab.classList.add('selected');
        }
    }
});

document.getElementById('settingsOptions').addEventListener('click', function(e){
	let Checkbox = e.target;
	if(Checkbox.tagName == 'INPUT'){
		if(Checkbox.id == 'DisplayCollision'){
			if(Checkbox.checked){
				var objects = settings.objects;
                
                function makeBox(ele,dem){
                    let cssText = '';
                    cssText += 'left:' + (ele.left + dem[0]) + 'px;';
                    cssText += 'width:' + (dem[1] - dem[0]) + 'px;';
                    cssText += 'top:' + (ele.top + dem[2]) + 'px;';
                    cssText += 'height:' + (dem[3] - dem[2]) + 'px;';
                    cssText += 'background-color:red;position:absolute;z-index:999;';
                    return cssText;
                }
                
                for(let i = 0; i < objects.length; i++){
                    let ThisObj = settings.objects[i];
                    let CollisonBlob = document.createElement('div');
                    CollisonBlob.classList.add('CollisonBlob');
                    CollisonBlob.style.cssText = makeBox(ThisObj,ThisObj.collision);
                    document.getElementById('world').appendChild(CollisonBlob);
                    
                }
			} else {
                var CollisonBlobs = document.getElementsByClassName('CollisonBlob');
                while(CollisonBlobs.length){
                    document.getElementById('world').removeChild(CollisonBlobs[0]);
                }
			}
		} else if(Checkbox.id == 'DisplayObjects'){
            if(Checkbox.checked){
                document.getElementById('world-objects').style.display = 'block';
            } else {
                document.getElementById('world-objects').style.display = 'none';
            }
        }
	}
});

document.getElementById('newAI').addEventListener('click', function(){

    var overlay = document.createElement('div'),
        container = document.createElement('div'),
        holdSpriteSheet = document.createElement('div'),
        spriteUploader = document.createElement('input'),
        animateSpriteHolder = document.createElement('div'),
        nameTitle = document.createElement('h2'),
        nameInput = document.createElement('input'),
        dialogTitle = document.createElement('h2'),
        dialogBox = document.createElement('div'),
        aiTalk = document.createElement('input'),
        humanTalk = document.createElement('input'),
        submitButton = document.createElement('button');
    
    overlay.className = 'overlay';
    overlay.id = 'newAI';
    container.id = 'container';
    holdSpriteSheet.id = 'holdSpriteSheet';
    dialogBox.className = 'dialogBox';
    aiTalk.className = 'aiTalk';
    humanTalk.className = 'humanTalk';
    submitButton.className = 'submitButton';
    nameInput.className = 'nameInput';
    
    holdSpriteSheet.textContent = 'Click here to select sprite sheet';
    dialogTitle.textContent = 'AI dialog';
    nameTitle.textContent = 'AI name';
    submitButton.textContent = 'create AI'
    
    spriteUploader.type = 'file';
    
    holdSpriteSheet.addEventListener('click', function(){
        var event;
        if(document.createEvent){
          event = document.createEvent("HTMLEvents");
          event.initEvent("click", true, true);
        } else {
          event = document.createEventObject();
          event.eventType = "click";
        }
        event.eventName = "click";

        if (document.createEvent) {
          spriteUploader.dispatchEvent(event);
        } else {
          spriteUploader.fireEvent("on" + event.eventType, event);
        }
    });
    
    spriteUploader.addEventListener('change', function(){
        var file = this.files[0];
        var reader = new FileReader();
        reader.onload = function(evt){
            holdSpriteSheet.textContent = '';
            var newImg = new Image();
            newImg.src = evt.target.result;
            holdSpriteSheet.appendChild(newImg);
        };
        reader.readAsDataURL(file);   
    });
    
    submitButton.addEventListener('click', function(){
        var firstKey = document.getElementsByClassName('aiTalk')[0],
            answers = document.getElementsByClassName('humanTalk'),
            imageData = holdSpriteSheet.getElementsByTagName('img')[0],
            AIname = document.getElementsByClassName('nameInput')[0].value,
            aiSettings = {};
        
        if(AIname){
            aiSettings[firstKey.value] = {};

            for(var i = 0; i < answers.length; i++){
                var answerInput = answers[i].value;
                if(answerInput){
                    aiSettings[firstKey.value][answerInput] = 'EXIT';
                }
            }

            socket.emit('saveAI', {
                avy : imageData.src,
                name : AIname
            });


            settings.AI.push({
                name : AIname,
                dialogue : aiSettings
            }); 
            
            document.body.removeChild(overlay);
        }
    });
    
    container.appendChild(holdSpriteSheet);
    container.appendChild(nameTitle);
    container.appendChild(nameInput);
    container.appendChild(dialogTitle);
    dialogBox.appendChild(aiTalk);
    dialogBox.appendChild(humanTalk);
    dialogBox.appendChild(humanTalk.cloneNode());
    dialogBox.appendChild(humanTalk.cloneNode());
    dialogBox.appendChild(submitButton);
    container.appendChild(dialogBox);
    overlay.appendChild(container);
    
    document.body.appendChild(overlay);
});

function save(){
    socket.emit('SaveMapTiles',{
        tiles : JSON.stringify(settings.tiles),
        objects : JSON.stringify(settings.objects),
        spawn : JSON.stringify(settings.spawn),
        AI : JSON.stringify(settings.AI)
    });
}

$(document).keydown(function(e){
    var key = e.which
    if(key == 88) QuickPlace = !QuickPlace;
    if(key == 90){
        var tile = settings.history.slice(-1)[0];
        if(tile && tile.tile){
            tile.tile.remove();
            settings.history.pop();
            settings[tile.type].pop();   
        }
    }
    if(key == 17){
        remove = !remove;
        if(remove){
            document.getElementById('world').classList.add('remove');
        } else {
            document.getElementById('world').classList.remove('remove');
        }
    }
});

function LoadTileSheet(url,name){
    let TileSheet = new Image();
	TileSheet.src = url;
	var tilecanvas = document.createElement('canvas');
	tilecanvas.width = 16;
	tilecanvas.height = 16;
	var tilectx = tilecanvas.getContext('2d');
	document.body.appendChild(tilecanvas);
	var table = document.createElement('table');
	
	var moving = false;
	var selected = [];
    var started = [];
	
	TileSheet.onload = function(){
        currentTileSheet = TileSheet;
		table.width = TileSheet.width;
		var width = TileSheet.width;
		var height = TileSheet.height;
		for(var h = 0; h <= height; h+=16){
			var tr = document.createElement('tr');
			table.appendChild(tr);
			for(var w = 0; w <= width; w+=16){
				var td = document.createElement('td');
				tilectx.clearRect(0, 0, TileSheet.width, TileSheet.height);
				tilectx.drawImage(TileSheet,w,h,16,16,0,0,16,16);
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
            for(var x = started[0]; x < finished[0]; x++){//highlighting the table code
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
				};
                if(document.getElementsByClassName('selected')[0].classList.contains('tiles')){
                    if(!pen.classList.contains('tiles')){
                        pen.classList.add('tiles');
                    }
                } else {
                    pen.classList.remove('tiles');
                }
                pen.appendChild(TileImage);
            }
            
            pen.attributes.TileData = {
                MaxX : maxX+1,
                MaxY : maxY+1,
                MinX : started[0],
                MinY : started[1]
            }
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
        
        var Tabpanels = document.getElementsByClassName('TabPanels')[0];
        var Panel = document.createElement('div');
        Panel.id = url;
        
		Panel.appendChild(table);
        Tabpanels.appendChild(Panel);
                
        var tab = document.createElement('li');
        tab.textContent = name;
        tab.onclick = function(){
            let panels = Tabpanels.getElementsByTagName('div');
            for(let i = 0; i < panels.length; i++){
                panels[i].style.display = 'none';
            }
            Panel.style.display = 'block';
            srcTable = Panel.id;
        }

        document.getElementsByClassName('tilesets')[0].appendChild(tab);
        
	}
};

socket.on('connect', function(){
   console.log('connected');
});

//Grab all objects and tiles image name
socket.emit('RequestTiles');
socket.on('Tiles',function(urls){
    for(var i = 0; i < urls.length; i++){
        var split = urls[i].split('/')
        var name = split[split.length-1];
        LoadTileSheet('../images/tiles/' + urls[i],name);
    }
    socket.emit('GetMap');
});

//load old map
socket.on('MapInfo', function(data){
    var Tiles = data && JSON.parse(data.tiles);
    for(var t in Tiles){
        var src = Tiles[t];
        for(var tile in src){
            PlaceTile(src[tile].left,src[tile].top,src[tile].sx,src[tile].sy,t);
        }
    }
    var Objects = data && JSON.parse(data.objects);
    for(var o in Objects){
        var src = Objects[o];
        for(var obj in src){
            PlaceObject(src[obj].tiles, src[obj].left + 'px', src[obj].top + 'px', src[obj].collision, src[obj].height, o);
        }
    }
    if(data && data.spawn){
        try{
            var Spawn = JSON.parse(data.spawn);
            var SpawnBlock = document.createElement('div');
            SpawnBlock.addEventListener('mousedown', function(){
                if(remove){
                    document.getElementById('world').removeChild(SpawnBlock);
                    settings.spawn = [];
                }
            });
            settings.spawn = Spawn;
            SpawnBlock.textContent = 'Spawn';
            SpawnBlock.style.left = Spawn[0] + 'px';
            SpawnBlock.style.top = Spawn[1] + 'px';
            document.getElementById('world').appendChild(SpawnBlock);
        } catch(err){
            data.spawn = [0,0];
        }
    }
    if(data.ai){
        settings.AI = JSON.parse(data.ai);
    }
});

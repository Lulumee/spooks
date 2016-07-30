/*jslint browser: true*/
/*global $, io, $$$*/

/*
newlined speech bubbles
probably will need login protection for the editor
*/

var socket = io(window.location.pathname);

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
};

(function () {//draw grid 
    var canvas = document.getElementById('grid'),
        cx = canvas.getContext('2d'),
        x;
    
    canvas.width = $('#world').width();
    canvas.height = $('#world').height();
    
    cx.beginPath();
    for (x = 0; x <= canvas.width; x += 16) {
        cx.moveTo(0, x);
        cx.lineTo(canvas.width, x);
    }
    for (x = 0; x <= canvas.width; x += 16) {
        cx.moveTo(x, 0);
        cx.lineTo(x, canvas.height);
    }
    cx.strokeStyle = "lightblue";
    cx.stroke();
    cx.beginPath();
    for (x = 0; x <= canvas.width; x += 32) {
        cx.moveTo(0, x);
        cx.lineTo(canvas.width, x);
    }
    for (x = 0; x <= canvas.width; x += 32) {
        cx.moveTo(x, 0);
        cx.lineTo(x, canvas.height);
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
    object : function (tilesheetsrc, startX, startY, tileInfo) {
        var conatiner = document.createElement('div');
        if (settings.objects[tilesheetsrc]) {
            conatiner.id = settings.objects[tilesheetsrc].length;
        } else {
            conatiner.id = 0;
        }
        conatiner.className = 'item placed-object ' + tilesheetsrc;
        conatiner.style.left = startX;
        conatiner.style.top = startY;
        conatiner.style.width = tileInfo.MaxX + 'px';
        conatiner.style.height = tileInfo.MaxY + 'px';
        conatiner.style.background = 'url(\'' + tilesheetsrc + '\') -' + tileInfo.MinX + 'px -' + tileInfo.MinY + 'px';
        return conatiner;
    },
    tile : function (tilesheetsrc, x, y, sx, sy) {
        var conatiner = document.createElement('div');
        if (settings.tiles[tilesheetsrc]) {
            conatiner.id = settings.tiles[tilesheetsrc].length;
        } else {
            conatiner.id = 0;
        }
        conatiner.className = 'item placed-tile';
        conatiner.style.left = x + 'px';
        conatiner.style.top = y + 'px';
		conatiner.style.background = 'url(\'' + tilesheetsrc + '\') -' + sx + 'px -' + sy + 'px';
        return conatiner;
    },
    editor : function () {
        var Cover = document.createElement('div'),
            Panel = document.createElement('div'),
            ColCanvas = document.createElement('canvas'),
            footer = document.createElement('div'),
            RedBox = document.createElement('div'),
            HeightLine = document.createElement('div');
            
        Cover.id = 'CollisionSettings';
        Panel.id = 'Panel';

        ColCanvas.width = '300';
        ColCanvas.height = '275';

        footer.className = 'footer';
        footer.textContent = 'Ok';

        RedBox.className = 'RedBox';

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
};

function placeTile(x, y, sx, sy, tilesheetsrc) {
    if (!tilesheetsrc) {
        tilesheetsrc = srcTable;
    }
    
    x = parseInt(x, 10);
    y = parseInt(y, 10);
    
    if (x >= 0 && y >= 0) {
        //create tile div
        var tile = build.tile(tilesheetsrc, x, y, sx, sy);
        
        //remove item on click
        tile.addEventListener('click', function () {
            if (remove) {
                var index = parseInt(this.id, 10);
                settings.tiles[tilesheetsrc].splice(index, 1);
				document.getElementById('world-tiles').removeChild(tile);
            }
        });
        
        document.getElementById('world-tiles').appendChild(tile);
				
        if (!settings.tiles[tilesheetsrc]) {
            settings.tiles[tilesheetsrc] = [];
        }
        
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

function setCollison(tileSheetSrc, startX, startY, tiles) {
    var check = document.getElementById('CollisionSettings');
    if (check) {
        document.body.removeChild(check);
    }
    
    var editorWindowParts = build.editor(),
        editorWindow = editorWindowParts.main,
        ctx = editorWindowParts.canvas.getContext('2d'),
        RedBox = editorWindowParts.RedBox,
        HeightLine = editorWindowParts.HeightLine,
        tileSheet = new Image();

    tileSheet.src = tileSheetSrc;
    tileSheet.onload = function () {
        ctx.drawImage(tileSheet, tiles.MinX, tiles.MinY, tiles.MaxX, tiles.MaxY, 0, 0, tiles.MaxX, tiles.MaxY);
    };
    
    editorWindowParts.footer.addEventListener('click', function () {
        var collision = [RedBox.offsetLeft, RedBox.offsetLeft + RedBox.offsetWidth, RedBox.offsetTop, RedBox.offsetTop + RedBox.offsetHeight],
            height = HeightLine.offsetHeight;
        document.body.removeChild(editorWindow);
        placeObject(tiles, startX, startY, collision, height, tileSheetSrc);
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

function placeObject(tileInfo, startX, startY, collision, setHeight, tilesheetsrc) {
    if (!tilesheetsrc) {
        tilesheetsrc = srcTable;
    }
    
    if (tileInfo && tileInfo.MaxX && collision) {
        var ObjectContainer = build.object(tilesheetsrc, startX, startY, tileInfo);
        
        //remove ObjectContainer on click
        ObjectContainer.addEventListener('click', function (e) {
            if (remove) {
                var index = parseInt(this.id, 10);
                settings.objects[tilesheetsrc].splice(index, 1);
                document.getElementById('world-objects').removeChild(ObjectContainer);
            }
        });
        
        //Load into object settings on double click
        ObjectContainer.addEventListener('dblclick', function () {
            var index = parseInt(this.id, 10);
            settings.objects[tilesheetsrc].splice(index, 1);
            setCollison(tilesheetsrc, startX, startY, tileInfo);
        });
        
        document.getElementById('world-objects').appendChild(ObjectContainer);
        
        if (!settings.objects[tilesheetsrc]) {
            settings.objects[tilesheetsrc] = [];
        }
        
        settings.objects[tilesheetsrc].push({
            left : parseInt(startX, 10),
            top : parseInt(startY, 10),
            tiles : tileInfo,
            height : setHeight || tileInfo.MaxY,
            collision : collision
        });
        
        //add to history
        settings.history.push({
            tile : tileInfo,
            type : 'objects'
        });
    }
}

function placeColBlock(startX, startY) {
    /*var cblock = document.createElement('div');
    cblock.style.cssText = 'position:absolute;z-index:99;display:none;left:' + startX + ';top:' + startY;
    cblock.id = settings.objects.length;
    cblock.addEventListener('click', function (e) {
        if (remove) {
            settings.objects.splice(index, 1);
            document.getElementById('world-objects').removeChild(cblock);
        }
    });
    document.getElementById('world-objects').appendChild(cblock);*/
}

function placeTileCluster(tiles, X, Y) {
    var i,
        tile,
        adjustedX,
        adjustedY;
    
    for (i = 0; i < tiles.length; i++) {
        tile = tiles[i];
        if (tile && tile.src) {
            adjustedX = parseInt(tile.style.left, 10) + X;
            adjustedY = parseInt(tile.style.top, 10) + Y;
            placeTile(adjustedX, adjustedY, tile.attributes.pos.x, tile.attributes.pos.y, srcTable);
        }
    }
}

function placeTileClusterRepeat(tiles, totalX, totalY, X, Y, repeatX, repeatY) {
    var clusterX,
        clusterY,
        adjustedClusterX,
        adjustedClusterY;
    
    for (clusterX = 0; clusterX + totalX <= repeatX; clusterX += totalX) {
        for (clusterY = 0; clusterY <= repeatY; clusterY += totalY) {
            adjustedClusterX = (clusterX * 16) + X;
            adjustedClusterY = (clusterY * 16) + Y;
            
            placeTileCluster(tiles, adjustedClusterX, adjustedClusterY);
        }
    }
}

document.getElementById('world').addEventListener('mousemove', function (e) {
    var tile = pen.getElementsByTagName('img')[0];
    if (tile && tile.src && !remove) {
        var x = Math.floor(((e.clientX + document.body.scrollLeft) - (tile.width / 2)) / 16) * 16,
            y = Math.floor(((e.clientY + document.body.scrollTop) - (tile.height / 2)) / 16) * 16;
        
        pen.style.left = x + 'px';
        pen.style.top = y + 'px';
    }
});
    
document.getElementById('world').addEventListener('mousedown', function (e) {
    var tile = pen.getElementsByTagName('img');
    if (tile[0].src.length) {
        StartPoint = [parseInt(pen.style.left, 10), parseInt(pen.style.top, 10)];
        StartPoint.spread = e.shiftKey;
    }
});

document.getElementById('world').addEventListener('mouseup', function() {
    if (remove) return;
    
    var extra = pen.getElementsByClassName('extra')[0];
    if (extra) {
        /*document.getElementById('world').appendChild(extra);
        extra.addEventListener('mousedown', function () {
            if (remove) {
                if (extra.id === 'spawn') {
                    settings.spawn = [];
                }
                document.getElementById('world').removeChild(extra);
            }
        });
        extra.style.position = 'absolute';
        extra.style.left = pen.style.left;
        extra.style.top = pen.style.top;
        if (extra.id === 'spawn') {
            settings.spawn = [parseInt(pen.style.left, 10), parseInt(pen.style.top, 10)];
        } else {
            placeObject([],pen.style.left,pen.style.top,[0,48,0,48]);
        }*/
    } else {
        var tiles = pen.getElementsByTagName('img'),
            penX = parseInt(pen.style.left, 10),
            penY = parseInt(pen.style.top, 10);
        
        if (pen.classList.contains('tiles')) {
            if (StartPoint.spread) {
                var repeatX = Math.abs((StartPoint[0] - penX) / 16),
                    repeatY = Math.abs((StartPoint[1] - penY) / 16),
                    totalX = pen.attributes.TileData.MaxX,
                    totalY = pen.attributes.TileData.MaxY;
                    
                    placeTileClusterRepeat(tiles, totalX, totalY, StartPoint[0], StartPoint[1], repeatX, repeatY);
            } else {
                placeTileCluster(tiles, penX, penY);
            }
        } else if(pen.attributes.TileData) {
            var SendTiles = {
                MaxX : pen.attributes.TileData.MaxX * 16,
                MaxY : pen.attributes.TileData.MaxY * 16,
                MinX : pen.attributes.TileData.MinX * 16,
                MinY : pen.attributes.TileData.MinY * 16
            };
            
            setCollison(srcTable, pen.style.left, pen.style.top, SendTiles);
        }  
    }
});

document.getElementById('tabs').addEventListener('click', function(e) {
    var tab = e.target;
    if (tab.classList.contains('tab')) {
        var allTabs = document.getElementsByClassName('tab');
                
        var selectedTab = document.getElementsByClassName('selected')[0];
        if(selectedTab){
            var oldWindowName = selectedTab.classList[1];
            if (oldWindowName === 'objects') {
                oldWindowName = 'tiles';
            }
            document.getElementById(oldWindowName).style.display = 'none';
            selectedTab.classList.remove('selected');
            
            var newWindowName = tab.classList[1];
            if (newWindowName === 'objects') {
                newWindowName = 'tiles';
            }
            document.getElementById(newWindowName).style.display = 'block';
            
            if(newWindowName === 'settings' && oldWindowName !== 'settings') {
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
    if(key == 67){
        pen.innerHTML = '';
        pen.attributes.TileData = null;
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
    console.log(data)
    var Tiles = data && JSON.parse(data.tiles);
    for(var t in Tiles){
        var src = Tiles[t];
        for(var tile in src){
            placeTile(src[tile].left,src[tile].top,src[tile].sx,src[tile].sy,t);
        }
    }
    var Objects = data && JSON.parse(data.objects);
    for(var o in Objects){
        var src = Objects[o];
        for(var obj in src){
            placeObject(src[obj].tiles, src[obj].left + 'px', src[obj].top + 'px', src[obj].collision, src[obj].height, o);
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
    if(data && data.ai){
        settings.AI = JSON.parse(data.ai);
    }
});

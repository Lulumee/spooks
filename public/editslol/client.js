/*jslint browser: true*/
/*global $, io, $$$*/

/*
newlined speech bubbles
probably will need login protection for the editor
*/

var socket = io(window.location.pathname);

var pen = document.getElementById('pen');
var penCanvas = pen.getElementsByTagName('canvas')[0];
var penCtx = penCanvas.getContext('2d');
var remove = false;
var QuickPlace = false;
var srcTable;
var StartPoint = [];

var settings = {
    tiles : {},
    objects : {},
    history : [],
    spawn : [],
    AI : []
};

var penSettings = {
    tool : 'drag',
    type : 'Tile',
    tileData : {},
    pos : {
        x : 0,
        y : 0
    }
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
})();

var build = {
    object : function (tilesheetsrc, startX, startY, tileInfo) {
        var conatiner = document.createElement('div'),
            width = (tileInfo.MaxX - tileInfo.MinX) * 16,
            height = (tileInfo.MaxY - tileInfo.MinY) * 16;
        if (settings.objects[tilesheetsrc]) {
            conatiner.id = settings.objects[tilesheetsrc].length;
        } else {
            conatiner.id = 0;
        }
        conatiner.className = 'item placed-object ' + tilesheetsrc;
        conatiner.style.left = startX + 'px';
        conatiner.style.top = startY + 'px';
        conatiner.style.width = width + 'px';
        conatiner.style.height = height + 'px';
        conatiner.style.background = 'url(\'' + tilesheetsrc + '\') -' + (tileInfo.MinX * 16) + 'px -' + (tileInfo.MinY * 16) + 'px';
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

function tileIndex (ary, order) {
    var i;
    for(i = 0; i < ary.length; i++){
        if(ary[i].order == order){
            return i;
        }
    }
    return -1;
}

function placeTile(x, y, sx, sy, tilesheetsrc) {
    if (x >= 0 && y >= 0) {
        //create tile div
        var tile = build.tile(tilesheetsrc, x, y, sx, sy);
        
        //remove item on click
        tile.addEventListener('click', function () {
            if (remove) {
                var index = tileIndex(settings.tiles[tilesheetsrc], parseInt(this.id, 10));
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
            order : settings.tiles[tilesheetsrc].length
        });
        
        //add to history
        settings.history.push({
            tile : tile,
            type : 'tiles'
        });
    }
}

function setCollison(tileSheetSrc, startX, startY, tiles) {
    var editorWindowParts = build.editor(),
        editorWindow = editorWindowParts.main,
        ctx = editorWindowParts.canvas.getContext('2d'),
        RedBox = editorWindowParts.RedBox,
        HeightLine = editorWindowParts.HeightLine,
        tileSheet = new Image(),
        width = tiles.MaxX - tiles.MinX,
        height = tiles.MaxY - tiles.MinY;

    tileSheet.src = tileSheetSrc;
    tileSheet.onload = function () {
        ctx.drawImage(tileSheet, tiles.MinX * 16, tiles.MinY * 16, width * 16, height * 16, 0, 0, width * 16, height * 16);
    };
    
    editorWindowParts.footer.addEventListener('click', function () {
        var collision = [RedBox.offsetLeft, RedBox.offsetLeft + RedBox.offsetWidth, RedBox.offsetTop, RedBox.offsetTop + RedBox.offsetHeight],
            height = HeightLine.offsetHeight;
        document.body.removeChild(editorWindow);
        placeObject(tiles, startX, startY, collision, height, tileSheetSrc);
    });
    
    $(RedBox).draggable({
        containment: "parent"
    }).resizable();
    
    $(HeightLine).draggable({
        containment : "parent"
    });
    
    document.body.appendChild(editorWindow);
}

function placeObject(tileInfo, startX, startY, collision, setHeight, tilesheetsrc) {
    
    var ObjectContainer = build.object(tilesheetsrc, startX, startY, tileInfo);
    
    //remove ObjectContainer on click
    ObjectContainer.addEventListener('click', function (e) {
        if (remove) {
            var index = tileIndex(settings.objects[tilesheetsrc], parseInt(this.id, 10));
            settings.objects[tilesheetsrc].splice(index, 1);
            document.getElementById('world-objects').removeChild(ObjectContainer);
        }
    });
    
    //Load into object settings on double click
    ObjectContainer.addEventListener('dblclick', function () {
        var index = tileIndex(settings.objects[tilesheetsrc], parseInt(this.id, 10));
        settings.objects[tilesheetsrc].splice(index, 1);
        setCollison(tilesheetsrc, startX, startY, tileInfo);
    });
    
    document.getElementById('world-objects').appendChild(ObjectContainer);
    
    if (!settings.objects[tilesheetsrc]) {
        settings.objects[tilesheetsrc] = [];
    }
    
    settings.objects[tilesheetsrc].push({
        left : startX,
        top : startY,
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

function placeTileCluster(tileData, tileSheetSrc, X, Y) {
    var sX,
        sY,
        adjustedX,
        adjustedY;
    
    for (sX = tileData.MinX; sX < tileData.MaxX; sX++) {
        for (sY = tileData.MinY; sY < tileData.MaxY; sY++) {
            adjustedX = X + ((sX - tileData.MinX) * 16);
            adjustedY = Y + ((sY - tileData.MinY) * 16);
            
            placeTile(adjustedX, adjustedY, sX * 16, sY * 16, tileSheetSrc);
        }
    }
}

function placeTileClusterRepeat(tileData, tileSheetSrc, X, Y, repeatX, repeatY) {
    var clusterX,
        clusterY,
        adjustedClusterX,
        adjustedClusterY,
        totalX = tileData.MaxX - tileData.MinX,
        totalY = tileData.MaxY - tileData.MinY;
    
    for (clusterX = 0; clusterX + totalX <= repeatX; clusterX += totalX) {
        for (clusterY = 0; clusterY + totalY <= repeatY; clusterY += totalY) {
            adjustedClusterX = (clusterX * 16) + X;
            adjustedClusterY = (clusterY * 16) + Y;
            
            placeTileCluster(tileData, tileSheetSrc, adjustedClusterX, adjustedClusterY);
        }
    }
}

function createSpreadDisplay () {
    var spreadCanvas = document.createElement('canvas');
    
    spreadCanvas.id = 'spreadCanvas';
    spreadCanvas.style.position = 'absolute';
    spreadCanvas.style.left = StartPoint[0] + 'px';
    spreadCanvas.style.top = StartPoint[1] + 'px';
    spreadCanvas.width = penSettings.pos.x;
    spreadCanvas.height = penSettings.pos.y;
    
    document.getElementById('world').appendChild(spreadCanvas);
}

function resizeSpread () {
    var spreadCanvas = document.getElementById('spreadCanvas'),
        spreadCtx = spreadCanvas.getContext('2d'),
        tileCtx = penSettings.tileSheetInfo.ctx,
        totalX = penSettings.tileData.MaxX - penSettings.tileData.MinX,
        totalY = penSettings.tileData.MaxY - penSettings.tileData.MinY,
        imageData = tileCtx.getImageData(penSettings.tileData.MinX * 16, penSettings.tileData.MinY * 16, totalX * 16, totalY * 16),
        sX,
        sY;
    
    spreadCanvas.width = penSettings.pos.x - StartPoint[0];
    spreadCanvas.height = penSettings.pos.y - StartPoint[1];
    
    for(sX = 0; sX < spreadCanvas.width; sX += (totalX * 16)){
        for(sY = 0; sY < spreadCanvas.height; sY += (totalY * 16)){
            spreadCtx.putImageData(imageData, sX, sY);
        }
    }
}

document.getElementById('world').addEventListener('mousemove', function (e) {
    if (!remove) {
        
        penSettings.pos.x = Math.floor(((e.clientX + document.body.scrollLeft)) / 16) * 16;
        penSettings.pos.y = Math.floor(((e.clientY + document.body.scrollTop)) / 16) * 16;
                
        if (penSettings.tool == 'tilePlacer') {
            pen.style.left = penSettings.pos.x + 'px';
            pen.style.top = penSettings.pos.y + 'px';
        }
        
        if (StartPoint.spread && penSettings.type == 'Tile') {
            if(document.getElementById('spreadCanvas')){
                resizeSpread();
            } else {
                createSpreadDisplay();
            }
        }
    }
});

document.getElementById('world').addEventListener('mousedown', function (e) {
    StartPoint = [penSettings.pos.x, penSettings.pos.y];
    StartPoint.spread = e.shiftKey;
});

document.getElementById('world').addEventListener('mouseup', function() {
    if (remove) return;
    
    var extra = pen.getElementsByClassName('extra')[0];
    if (extra) {
        //
    } else {
        var tiles = pen.getElementsByTagName('img'),
            penX = penSettings.pos.x,
            penY = penSettings.pos.y;
        
        if (penSettings.type == 'Tile') {
            if (StartPoint.spread) {
                var repeatX = Math.abs((StartPoint[0] - penX) / 16),
                    repeatY = Math.abs((StartPoint[1] - penY) / 16);
                
                StartPoint.spread = false;
                document.getElementById('world').removeChild(document.getElementById('spreadCanvas'));
                placeTileClusterRepeat(penSettings.tileData, penSettings.tileSheetInfo.imageSrc, StartPoint[0], StartPoint[1], repeatX, repeatY);
            } else {
                placeTileCluster(penSettings.tileData, penSettings.tileSheetInfo.imageSrc, penX, penY);
            }
        } else if(penSettings.type == 'Object') {            
            setCollison(penSettings.tileSheetInfo.imageSrc, penSettings.pos.x, penSettings.pos.y, penSettings.tileData);
        }  
    }
});

document.getElementById('tabs').addEventListener('click', function(e) {
    var tab = e.target;
    if (tab.classList.contains('tab')) {      
        var selectedTab = document.getElementsByClassName('selected')[0];
        if(selectedTab){
            var oldWindowName = selectedTab.classList[1];
            document.getElementById(oldWindowName).style.display = 'none';
            selectedTab.classList.remove('selected');
            
            var newWindowName = tab.classList[1];
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
        
        if(tab.classList.contains('tiles')){
            penSettings.type = tab.textContent;
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
        penSettings.tool = 'drag';
    }
});

function buildPanelandTab(source, name) {
    var tileSheetPanels = document.getElementsByClassName('tileSheetPanels')[0],
        newPanel = document.createElement('div'),
        tileSheetTabs = document.getElementsByClassName('tileSheetTabs')[0],
        newTab = document.createElement('li');
        
    newPanel.id = name;
    tileSheetPanels.appendChild(newPanel);
    
    newTab.textContent = name;
    tileSheetTabs.appendChild(newTab);
    newTab.addEventListener('click', function() {
        var selectedTab = newTab.parentNode.getElementsByClassName('selected')[0];
        if (selectedTab) {
            document.getElementById(selectedTab.textContent).style.display = 'none';
            selectedTab.classList.remove('selected');
        }
        newTab.classList.add('selected');
        document.getElementById(newTab.textContent).style.display = 'block';
    });
    
    return newPanel;
}

function initiateTileSheet(tileSheetImage, name) {
    
    var tileCanvas = document.createElement('canvas'),
        tileCtx = tileCanvas.getContext('2d'),
        displayCanvas = document.createElement('canvas'),
        displayCtx = displayCanvas.getContext('2d'),
        startingXY = [],
        dragging = false;
    
    tileCanvas.width = tileSheetImage.width;
    tileCanvas.height = tileSheetImage.height;
    tileCtx.drawImage(tileSheetImage, 0, 0);
    
    displayCanvas.width = tileSheetImage.width;
    displayCanvas.height = tileSheetImage.height;
    displayCanvas.style.position = 'absolute';
    displayCanvas.style.top = '18px';
    
    function mouseDown (e) {
        var X = Math.floor(e.offsetX / 16) * 16,
            Y = Math.floor(e.offsetY / 16) * 16;
        
        startingXY = [X, Y];
        dragging = true;
    }
    
    function mouseUp (e) {
        var X = (Math.floor(e.offsetX / 16) * 16) + 16,
            Y = (Math.floor(e.offsetY / 16) * 16) + 16,
            ImageData = tileCtx.getImageData(startingXY[0], startingXY[1], X , Y);
        
        penCanvas.width = X - startingXY[0];
        penCanvas.height = Y - startingXY[1];
        penCtx.putImageData(ImageData, 0, 0);
        
        penSettings.tool = 'tilePlacer';
        penSettings.tileSheetInfo = {
            ctx : tileCtx,
            imageSrc : tileSheetImage.src
        }
        penSettings.tileData = {
            MaxX : (penCanvas.width + startingXY[0]) / 16,
            MaxY : (penCanvas.height + startingXY[1]) / 16,
            MinX : startingXY[0] / 16,
            MinY : startingXY[1] / 16
        }
        dragging = false;
        pen.classList.add('tiles');
    }
    
    function mouseMove (e) {
        var X = (Math.floor(e.offsetX / 16) * 16) + 16,
            Y = (Math.floor(e.offsetY / 16) * 16) + 16;
        
        if (dragging) {
            displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
            
            displayCtx.beginPath();
            displayCtx.strokeStyle = 'red';
            displayCtx.rect(startingXY[0], startingXY[1], X - startingXY[0], Y - startingXY[1]);
            displayCtx.stroke();
        }
    }
    
    var panel = buildPanelandTab(tileSheetImage.src, name);
    
    panel.addEventListener('mousedown', mouseDown);
    panel.addEventListener('mouseup', mouseUp);
    panel.addEventListener('mousemove', mouseMove);
    
    panel.appendChild(tileCanvas);
    panel.appendChild(displayCanvas);   
}

function loadTileSheetCanvas(url, name) {
    var TileSheetImage = new Image();
    TileSheetImage.src = url;
    
    TileSheetImage.onload = function(){
        initiateTileSheet(this, name);
    };       
}

socket.on('connect', function(){
   console.log('connected');
});

//Grab all objects and tiles image name
socket.emit('RequestTiles');
socket.on('Tiles',function(urls){
    for(var i = 0; i < urls.length; i++){
        var split = urls[i].split('/')
        var name = split[split.length-1];
        loadTileSheetCanvas('../images/tiles/' + urls[i], name);
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
            placeTile(src[tile].left, src[tile].top, src[tile].sx, src[tile].sy, t);
        }
    }
    var Objects = data && JSON.parse(data.objects);
    for(var o in Objects){
        var src = Objects[o];
        for(var obj in src){
            placeObject(src[obj].tiles, src[obj].left, src[obj].top, src[obj].collision, src[obj].height, o);
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

/*jslint browser: true*/
/*global $, io, $$$, console, FileReader*/

/*
newlined speech bubbles
probably will need login protection for the editor
*/

//10
//earnistein

/*


*/

var socket = io('/' + window.location.host + window.location.pathname);

var pen = document.getElementById('pen');
var penCanvas = pen.getElementsByTagName('canvas')[0];
var penCtx = penCanvas.getContext('2d');
var QuickPlace = false;
var srcTable;

var settings = {
    tiles: {},
    objects: {},
    history: [],
    spawn: [],
    AI: []
};

var penSettings = {
    tool: 'drag',
    type: 'Tile',
    tileData: {},
    pos: {
        x: 0,
        y: 0
    }
};

var defaultTilesheets = ['caves.png', 'house.png', 'sand.png', 'snow.png', 'tileset.png'];

(function() { // Draw grid
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
    
    // Drag to scroll
    $$$.scrollable(document.body);
})();

var build = {
    object: function(tilesheetsrc, startX, startY, tileInfo) {
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
        conatiner.style.background = 'url(\'' + window.location.origin + (defaultTilesheets.indexOf(tilesheetsrc) !== -1 ? "/images/tiles/" : "/data/images/tiles/") + tilesheetsrc + '\') -' + (tileInfo.MinX * 16) + 'px -' + (tileInfo.MinY * 16) + 'px'; // Change how map data is saved, used to be: tilesheetsrc
        return conatiner;
    },
    tile: function(tilesheetsrc, x, y, sx, sy) {
        var conatiner = document.createElement('div');
        if (settings.tiles[tilesheetsrc]) {
            conatiner.id = settings.tiles[tilesheetsrc].length;
        } else {
            conatiner.id = 0;
        }
        
        conatiner.className = 'item placed-tile';
        conatiner.style.left = x + 'px';
        conatiner.style.top = y + 'px';
		conatiner.style.background = 'url(\'' + window.location.origin + (defaultTilesheets.indexOf(tilesheetsrc) !== -1 ? "/images/tiles/" : "/data/images/tiles/") + tilesheetsrc + '\') -' + sx + 'px -' + sy + 'px'; // Change how map data is saved, used to be: tilesheetsrc
        return conatiner;
    },
    editor: function() {
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
            main: Cover,
            canvas: ColCanvas,
            footer: footer,
            RedBox: RedBox,
            HeightLine: HeightLine
        };
    }
};

function tileIndex(ary, order) {
    var i;
    for (i = 0; i < ary.length; i += 1) {
        if (ary[i].order === order) {
            return i;
        }
    }
    return -1;
}

function setCollison(tileData, tileSheetSrc, startX, startY) {
    var editorWindowParts = build.editor(),
        editorWindow = editorWindowParts.main,
        ctx = editorWindowParts.canvas.getContext('2d'),
        RedBox = editorWindowParts.RedBox,
        HeightLine = editorWindowParts.HeightLine,
        tileSheet = new Image(),
        width = tileData.MaxX - tileData.MinX,
        height = tileData.MaxY - tileData.MinY;

    tileSheet.src = tileSheetSrc;
    tileSheet.onload = function() {
        ctx.drawImage(tileSheet, tileData.MinX * 16, tileData.MinY * 16, width * 16, height * 16, 0, 0, width * 16, height * 16);
    };
    
    editorWindowParts.footer.addEventListener('click', function() {
        var collision = [RedBox.offsetLeft, RedBox.offsetLeft + RedBox.offsetWidth, RedBox.offsetTop, RedBox.offsetTop + RedBox.offsetHeight],
            height = HeightLine.offsetHeight;
        document.body.removeChild(editorWindow);
        placeObject(tileData, startX, startY, collision, height, tileSheetSrc);
    });
    
    $(RedBox).draggable({
        containment: "parent"
    }).resizable();
    
    $(HeightLine).draggable({
        containment: "parent"
    });
    
    document.body.appendChild(editorWindow);
}

function placeObject(tileInfo, startX, startY, collision, setHeight, tilesheetsrc) {
    
    var ObjectContainer = build.object(tilesheetsrc, startX, startY, tileInfo);
    
    // Remove ObjectContainer on click
    ObjectContainer.addEventListener('click', function(e) {
        if (penSettings.tool == 'delete') {
            var index = tileIndex(settings.objects[tilesheetsrc], parseInt(this.id, 10));
            settings.objects[tilesheetsrc].splice(index, 1);
            document.getElementById('world-objects').removeChild(ObjectContainer);
        }
    });
    
    // Load into object settings on double click
    ObjectContainer.addEventListener('dblclick', function() {
        var index = tileIndex(settings.objects[tilesheetsrc], parseInt(this.id, 10));
        settings.objects[tilesheetsrc].splice(index, 1);
        setCollison(tileInfo, tilesheetsrc, startX, startY);
    });
    
    document.getElementById('world-objects').appendChild(ObjectContainer);
    
    if (!settings.objects[tilesheetsrc]) {
        settings.objects[tilesheetsrc] = [];
    }
    
    settings.objects[tilesheetsrc].push({
        left: startX,
        top: startY,
        tiles: tileInfo,
        height: setHeight || tileInfo.MaxY,
        collision: collision
    });
    
    // Add to history
    settings.history.push({
        tile: tileInfo,
        type: 'objects'
    });
}

function placeColBlock(startX, startY) {
    /*
    var cblock = document.createElement('div');
    cblock.style.cssText = 'position:absolute;z-index:99;display:none;left:' + startX + ';top:' + startY;
    cblock.id = settings.objects.length;
    cblock.addEventListener('click', function(e) {
        if (remove) {
            settings.objects.splice(index, 1);
            document.getElementById('world-objects').removeChild(cblock);
        }
    });
    document.getElementById('world-objects').appendChild(cblock);
    */
}

function placeTile(x, y, sx, sy, tilesheetsrc) {
    if (x >= 0 && y >= 0) {
        // Create tile div
        var tile = build.tile(tilesheetsrc, x, y, sx, sy);
        
        // Remove item on click
        tile.addEventListener('click', function() {
            if (penSettings.tool == 'delete') {
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
            left: x,
            top: y,
            sx: sx,
            sy: sy,
            order: settings.tiles[tilesheetsrc].length
        });
        
        // Add to history
        settings.history.push({
            tile: tile,
            type: 'tiles'
        });
    }
}

function placeTileCluster(tileData, tileSheetSrc, X, Y) {
    var sX,
        sY,
        adjustedX,
        adjustedY;
    
    for (sX = tileData.MinX; sX < tileData.MaxX; sX += 1) {
        for (sY = tileData.MinY; sY < tileData.MaxY; sY += 1) {
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

function createSpreadDisplay(spreadFrom) {
    var spreadCanvas = document.createElement('canvas');
    
    spreadCanvas.id = 'spreadCanvas';
    spreadCanvas.style.position = 'absolute';
    spreadCanvas.style.left = spreadFrom.x + 'px';
    spreadCanvas.style.top = spreadFrom.y + 'px';
    spreadCanvas.width = penSettings.pos.x;
    spreadCanvas.height = penSettings.pos.y;
    
    document.getElementById('world').appendChild(spreadCanvas);
}

function resizeSpread(tileData, tileSheetCtx, spreadFrom, pos) {
    var spreadCanvas = document.getElementById('spreadCanvas'),
        spreadCtx = spreadCanvas.getContext('2d'),
        totalX = (tileData.MaxX - tileData.MinX) * 16,
        totalY = (tileData.MaxY - tileData.MinY) * 16,
        imageData = tileSheetCtx.getImageData(tileData.MinX * 16, tileData.MinY * 16, totalX, totalY),
        sX,
        sY;
    
    spreadCanvas.width = pos.x - spreadFrom.x;
    spreadCanvas.height = pos.y - spreadFrom.y;
    
    for (sX = 0; sX < spreadCanvas.width; sX += totalX) {
        for (sY = 0; sY < spreadCanvas.height; sY += totalY) {
            spreadCtx.putImageData(imageData, sX, sY);
        }
    }
}

function dealWithSpread(tileData, tileSheetImageSrc, spreadFrom, pos) {
    var repeatX = Math.abs((spreadFrom.x - pos.x) / 16),
        repeatY = Math.abs((spreadFrom.y - pos.y) / 16);
    
    penSettings.spreadFrom = false;
    document.getElementById('world').removeChild(document.getElementById('spreadCanvas'));
    placeTileClusterRepeat(tileData, tileSheetImageSrc, spreadFrom.x, spreadFrom.y, repeatX, repeatY);
}

function place() {
    var tileData = penSettings.tileData,
        tileSheetImageSrc = penSettings.tileSheetInfo.imageSrc,
        pos = penSettings.pos;

    if (penSettings.type === 'Tile') {
        if (penSettings.spreadFrom) {
            dealWithSpread(tileData, tileSheetImageSrc, penSettings.spreadFrom, pos);
        } else {
            placeTileCluster(tileData, tileSheetImageSrc, pos.x, pos.y);
        }
    } else if (penSettings.type === 'Object') {
        setCollison(tileData, tileSheetImageSrc, pos.x, pos.y);
    }
}

document.getElementById('world').addEventListener('mousemove', function(e) {
    penSettings.pos.x = Math.floor(((e.clientX + document.body.scrollLeft)) / 16) * 16;
    penSettings.pos.y = Math.floor(((e.clientY + document.body.scrollTop)) / 16) * 16;
    
    if (penSettings.tool === 'tilePlacer') {
        pen.style.left = penSettings.pos.x + 'px';
        pen.style.top = penSettings.pos.y + 'px';
    }
    
    if (penSettings.spreadFrom && penSettings.type === 'Tile') {
        if (document.getElementById('spreadCanvas')) {
            resizeSpread(penSettings.tileData, penSettings.tileSheetInfo.ctx, penSettings.spreadFrom, penSettings.pos);
        } else {
            createSpreadDisplay(penSettings.spreadFrom);
        }
    }
});

document.getElementById('world').addEventListener('mousedown', function(e) {
    if (e.shiftKey) {
        penSettings.spreadFrom = {
            x: penSettings.pos.x,
            y: penSettings.pos.y
        };
    }
});

document.getElementById('world').addEventListener('mouseup', function() {
    if (penSettings.tileSheetInfo !== undefined && penSettings.tool != 'delete') {
        place();
    }
});

// Switch menu tabs
document.getElementById('tabs').addEventListener('click', function(e) {
    var tab = e.target,
        oldWindowName,
        newWindowName,
        selectedTab = document.getElementsByClassName('selected')[0],
        extras = document.getElementsByClassName('extra'),
        i;
    
    if (tab.classList.contains('tab')) {
        if (selectedTab) {
            oldWindowName = selectedTab.classList[1];
            newWindowName = tab.classList[1];
            
            document.getElementById(oldWindowName).style.display = 'none';
            selectedTab.classList.remove('selected');
            
            document.getElementById(newWindowName).style.display = 'block';
            
            if (newWindowName === 'settings' && oldWindowName !== 'settings') {
                for (i = 0; i < extras.length; i += 1) {
                    extras[i].style.display = 'block';
                }
            } else if (oldWindowName === 'settings') {
                for (i = 0; i < extras.length; i += 1) {
                    extras[i].style.display = 'none';
                }
            }
            tab.classList.add('selected');
        }
        
        if (tab.classList.contains('tiles')) {
            penSettings.type = tab.textContent;
        }
    }
});

// Display all objects collision
document.getElementById('settingsOptions').addEventListener('click', function(e) {
    var checkBox = e.target;
        
	if (checkBox.tagName === 'INPUT') {
		if (checkBox.id === 'DisplayCollision') {
			if (checkBox.checked) {
                map.showCollisonOfObjects(settings.objects);
			} else {
                map.hideCollisonOfObjects();
			}
		} else if (checkBox.id === 'DisplayObjects') {
            if (checkBox.checked) {
                document.getElementById('world-objects').style.display = 'block';
            } else {
                document.getElementById('world-objects').style.display = 'none';
            }
        }
	}
});

document.getElementById('newAI').addEventListener('click', function() {
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
    submitButton.textContent = 'create AI';
    
    spriteUploader.type = 'file';
    
    holdSpriteSheet.addEventListener('click', function() {
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
            spriteUploader.dispatchEvent(event);
        } else {
            spriteUploader.fireEvent("on" + event.eventType, event);
        }
    });
    
    spriteUploader.addEventListener('change', function() {
        var file = this.files[0],
            reader = new FileReader();
        
        reader.onload = function(evt) {
            holdSpriteSheet.textContent = '';
            var newImg = new Image();
            newImg.src = evt.target.result;
            holdSpriteSheet.appendChild(newImg);
        };
        reader.readAsDataURL(file);
    });
    
    submitButton.addEventListener('click', function() {
        var firstKey = document.getElementsByClassName('aiTalk')[0],
            answers = document.getElementsByClassName('humanTalk'),
            imageData = holdSpriteSheet.getElementsByTagName('img')[0],
            AIname = document.getElementsByClassName('nameInput')[0].value,
            aiSettings = {},
            i,
            answerInput;
        
        if (AIname) {
            aiSettings[firstKey.value] = {};

            for (i = 0; i < answers.length; i += 1) {
                answerInput = answers[i].value;
                if (answerInput) {
                    aiSettings[firstKey.value][answerInput] = 'EXIT';
                }
            }

            socket.emit('saveAI', {
                avy: imageData.src,
                name: AIname
            });


            settings.AI.push({
                name: AIname,
                dialogue: aiSettings
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

// Map controls
$(document).keydown(function(e) {
    var key = e.which,
        tile;
    
    if (key === 88) {
        QuickPlace = !QuickPlace;
    }
    if (key === 90) {
        tile = settings.history.slice(-1)[0];
        if (tile && tile.tile) {
            tile.tile.remove();
            settings.history.pop();
            settings[tile.type].pop();
        }
    }
    if (key === 17) {
        if (penSettings.tool != 'delete') {
            penSettings.tool = 'delete'
            document.getElementById('world').classList.add('remove');
        } else {
            penSettings.tool = 'tilePlacer';
            document.getElementById('world').classList.remove('remove');
        }
    }
    if (key === 67) {
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
        dragging = false,
        panel;
    
    tileCanvas.width = tileSheetImage.width;
    tileCanvas.height = tileSheetImage.height;
    tileCtx.drawImage(tileSheetImage, 0, 0);
    
    displayCanvas.width = tileSheetImage.width;
    displayCanvas.height = tileSheetImage.height;
    displayCanvas.style.position = 'absolute';
    displayCanvas.style.top = '18px';
    
    function mouseDown(e) {
        var X = Math.floor(e.offsetX / 16) * 16,
            Y = Math.floor(e.offsetY / 16) * 16;
        
        startingXY = [X, Y];
        dragging = true;
    }
    
    function mouseUp(e) {
        var X = (Math.floor(e.offsetX / 16) * 16) + 16,
            Y = (Math.floor(e.offsetY / 16) * 16) + 16,
            ImageData = tileCtx.getImageData(startingXY[0], startingXY[1], X, Y);
        
        penCanvas.width = X - startingXY[0];
        penCanvas.height = Y - startingXY[1];
        penCtx.putImageData(ImageData, 0, 0);
        
        penSettings.tool = 'tilePlacer';
        penSettings.tileSheetInfo = {
            ctx: tileCtx,
            imageSrc: tileSheetImage.src.substr(tileSheetImage.src.lastIndexOf('/') + 1) // Change how map data is saved, used to be tileSheetImage.src
        };
        penSettings.tileData = {
            MaxX: (penCanvas.width + startingXY[0]) / 16,
            MaxY: (penCanvas.height + startingXY[1]) / 16,
            MinX: startingXY[0] / 16,
            MinY: startingXY[1] / 16
        };
        dragging = false;
        pen.classList.add('tiles');
    }
    
    function mouseMove(e) {
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
    
    panel = buildPanelandTab(tileSheetImage.src, name);
    
    panel.addEventListener('mousedown', mouseDown);
    panel.addEventListener('mouseup', mouseUp);
    panel.addEventListener('mousemove', mouseMove);
    
    panel.appendChild(tileCanvas);
    panel.appendChild(displayCanvas);
}

function loadTileSheetCanvas(url, name) {
    var TileSheetImage = new Image();
    TileSheetImage.src = url;
    
    TileSheetImage.onload = function() {
        initiateTileSheet(this, name);
    };
}

function save() {
    socket.emit('SaveMapTiles', {
        tiles: JSON.stringify(settings.tiles),
        objects: JSON.stringify(settings.objects),
        spawn: JSON.stringify(settings.spawn),
        AI: JSON.stringify(settings.AI)
    });
}

socket.on('connect', function() {
    console.log('%cConnected to editor: ' + window.location.host + window.location.pathname.replace('/edit', ''), 'background: #000000; color: #00FF00;');
    if (window.location.pathname === '/edit') {
        console.log('%cWarning: There\'s simply no channel for this map :O or it points to a completely different channel than the one intended\nTip: Type a slash after "/edit"', 'background: #000000; color: #FFFF00;');
    }
});

socket.on('disconnect', function(e) {
    console.log('%cDisconnected, error: ' + e, 'background: #000000; color: #FF0000;');
});

// Grab all objects and tiles image name
socket.emit('RequestTiles');
socket.on('Tiles', function(urls) {
    var i,
        split,
        name;
    
    for (i = 0; i < urls.length; i += 1) {
        split = urls[i].split('/');
        name = split[split.length - 1];
        loadTileSheetCanvas((defaultTilesheets.indexOf(name) !== -1 ? "../images/tiles/" : "../data/images/tiles/") + urls[i], name);
    }
    socket.emit('GetMap');
});

var map = {
    loadTiles: function(tiles) {
        var tileSources = Object.keys(tiles),
            tilesFromOneSource,
            t,
            k,
            tile;
            
        for (t = 0; t < tileSources.length; t += 1) {
            tilesFromOneSource = tiles[tileSources[t]];
            for (k = 0; k < tilesFromOneSource.length; k += 1) {
                tile = tilesFromOneSource[k];
                placeTile(tile.left, tile.top, tile.sx, tile.sy, tileSources[t]);
            }
        }
    },
    loadObjects: function(objects) {
        var objectSources = Object.keys(objects),
            objectsFromOneSource,
            t,
            k,
            object;
        
        for (t = 0; t < objectSources.length; t += 1) {
            objectsFromOneSource = objects[objectSources[t]];
            for (k = 0; k < objectsFromOneSource.length; k += 1) {
                object = objectsFromOneSource[k];
                placeObject(object.tiles, object.left, object.top, object.collision, object.height, objectSources[t]);
            }
        }
    },
    placeSpawn: function(X, Y) {
        var spawnBlock = document.createElement('div');
        
        if (document.getElementById('SpawnBlock')) {
            document.getElementById('world-tiles').removeChild(document.getElementById('SpawnBlock'));
        }
        
        spawnBlock.className = 'SpawnBlock extra';
        spawnBlock.textContent = 'Spawn';
        spawnBlock.style.left = X + 'px';
        spawnBlock.style.top = Y + 'px';
        settings.spawn = [X, Y];
        
        document.getElementById('world-tiles').appendChild(spawnBlock);
    },
    showCollisonOfObjects: function(objects) {
        var objectSrcs = Object.keys(objects),
            objectsFromOneSrc,
            oneObj,
            collisonBlob,
            t,
            k;
            
        function makeBox(ele, dem) {
            var cssText = '';
            cssText += 'left:' + (ele.left + dem[0]) + 'px;';
            cssText += 'width:' + (dem[1] - dem[0]) + 'px;';
            cssText += 'top:' + (ele.top + dem[2]) + 'px;';
            cssText += 'height:' + (dem[3] - dem[2]) + 'px;';
            return cssText;
        }
        
        for (t = 0; t < objectSrcs.length; t += 1) {
            objectsFromOneSrc = objects[objectSrcs[t]];
            for (k = 0; k < objectsFromOneSrc.length; k += 1) {
                oneObj = objectsFromOneSrc[k];
                collisonBlob = document.createElement('div');
                collisonBlob.classList.add('collisonBlob');
                collisonBlob.style.cssText = makeBox(oneObj, oneObj.collision);
                document.getElementById('world').appendChild(collisonBlob);   
            }
        }
    },
    hideCollisonOfObjects: function() {
        var allCollisonBlobs = document.getElementsByClassName('collisonBlob');
        while (allCollisonBlobs.length) {
            document.getElementById('world').removeChild(allCollisonBlobs[0]);
        }
    }
};

// Load old map
socket.on('MapInfo', function(data) {
    var tiles,
        objects,
        spawn,
        spawnblock;
    
    if (data) {
        if (data.tiles) {
            try {
                tiles = JSON.parse(data.tiles);
                map.loadTiles(tiles);
            } catch (err) {
                console.log('Tiles didn\'t load');
            }
        }
        if (data.objects) {
            try {
                objects = JSON.parse(data.objects);
                map.loadObjects(objects);
            } catch (err) {
                console.log('Objects didn\'t load');
            }
        }
        if (data.spawn) {
            try {
                spawn = JSON.parse(data.spawn);
                map.placeSpawn(spawn[0], spawn[1]);
            } catch (err) {
                console.log('Spawn didn\'t load', err);
            }
        }
        if (data.ai) {
            try {
                settings.AI = JSON.parse(data.ai);
            } catch (err) {
                console.log('AI didn\'t load');
            }
        }
    }
});

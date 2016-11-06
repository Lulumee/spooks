var avatarControl = {
    loadAvatar: function(id, file) {
        var user = ONLINE.players[id];
        if (user) {
            var avatar = new Image();
            avatar.src = file;
            avatar.onload = function() {
                var Sizes = FrameSizes(avatar);
                if (Sizes) {
                    user.avy = avatar;
                    user.frame = Sizes;
                } else {
                    user.avy = DefaultAvatar;
                }
            }
        } else { // If doesn't show player online, pend data
            ONLINE.Pend(id, 'avy', file);
        }
    },
    saveAvatar: function(avy, filename) {
        var AvyList = document.getElementById('Avatars');

        function save(AvyFrame) {
            if (AvyFrame.w > 120) {
                AvyFrame.w = 120;
            }
            var myavy = document.createElement('li');
            myavy.className = 'myavy';
            myavy.style.cssText = `background-position:0px 0px;overflow:hidden;display:block;width:${AvyFrame.w}px;height:${AvyFrame.h}px`;
            myavy.appendChild(avy);

            var remove = document.createElement('button');
            remove.style.cssText = `background:none;border:none;cursor:pointer;position:relative;left:${AvyFrame.w}px;top:-${AvyFrame.h/2}px;`;
            remove.textContent = 'x';
            myavy.appendChild(remove);

            remove.addEventListener('click', function() {
                CHAT.submit('/removeavy ' + filename);
                AvyList.removeChild(myavy);
                AvyList.removeChild(remove);
            });

            function toDataUrl(url, callback, outputFormat) {
                var img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = function() {
                    var canvas = document.createElement('CANVAS');
                    var ctx = canvas.getContext('2d');
                    var dataURL;
                    canvas.height = this.height;
                    canvas.width = this.width;
                    ctx.drawImage(this, 0, 0);
                    dataURL = canvas.toDataURL(outputFormat);
                    callback(dataURL);
                    canvas = null;
                };
                img.src = url;
            }

            myavy.addEventListener('click', function() {
                socket.emit('command', { // Find image on server
                    name: 'avy',
                    params: {
                        name: filename
                    }
                });
            });
            AvyList.appendChild(myavy);
            AvyList.appendChild(remove);
        }

        avy.onload = function() {
            save(FrameSizes(avy));
        }
    }
}


// ----------------------------------------------------
//  Gets the frame width and height of the given avatar
// ----------------------------------------------------

//ZOOM IN METHODD

function FrameSizes(avy) {
    var frame = document.createElement('canvas');
    frame.id = 'frame';
    frame.style.position = 'absolute';
    frame.style.left = '50px';
    document.body.appendChild(frame);
    var q = frame.getContext('2d');
    frame.width = avy.width;
    frame.height = avy.height;
    q.drawImage(avy, 0, 0);
    var frameW = false,
        frameH = false,
        frameX = 0,
        frameY = 0;

    var pixels = q.getImageData(0, 0, avy.width, avy.height);
    // var cocks = q.getImageData(0, 0, avy.width, avy.height);

    var height = 16;
    var width = 0;
    var findend = false;

    var pixelCount = 0;
    var LowestPixelCount = 128;
    var StartingWidth = 0;

    var bestWidth = 128;
    var WidthMax = avy.width < 128 ? avy.width : 128;

    // Get width
    for (; height <= 128; height++) {
        var alpha = pixels.data[((width * 4) + (height * (avy.width * 4))) + 3];
        // cocks.data[((width * 4) + (height * (avy.width * 4))) + 3] = 255;
        // cocks.data[((width * 4) + (height * (avy.width * 4)))] = 255;
        if (alpha) {
            if (!findend) {
                findend = true;
                StartingWidth = width;
            }
            pixelCount++;
        }
        if (height >= 128) {
            width++;
            height = 15;
            if (findend && pixelCount == 0) { // Scanned full height, found no pixels, must be end of frame
                width += StartingWidth;
                // Guess work
                var guess = width;
                var frameX = Math.round(avy.width / guess);
                frameW = avy.width / frameX;
                break;
            } else { // Scanned full height
                if (LowestPixelCount > pixelCount) { // Found less pixels than before, save width
                    LowestPixelCount = pixelCount;
                    bestWidth = width;
                }
            }
            pixelCount = 0;
            if (width > WidthMax) { // Reached end of image, scan is over
                break;
            }
        }
    }

    if (!frameW) {
        var guess = bestWidth;
        var frameX = Math.round(avy.width / guess);
        frameW = avy.width / frameX;
    }

    var height = 0;
    var width = 0;
    var findend = false;
    var pixelCount = 0;
    var StartingHeight = 0;

    // Get height
    for (; width <= frameW; width++) {
        var alpha = pixels.data[((width * 4) + (height * (avy.width * 4))) + 3];
        // cocks.data[((width * 4)+(height * (avy.width * 4))) + 3] = 255;
        // cocks.data[((width * 4)+(height * (avy.width * 4)))] = 255;
        if (alpha) {
            if (!findend) {
                findend = true;
                StartingHeight = height;
            }
            pixelCount++;
        }
        if (width >= (frameW-10)) {
            height++;
            width = 0;
            if (findend && pixelCount == 0) {
                // Guess work
                var guess = height;
                var frameY = Math.round(avy.height / guess);
                if (frameY > 8) {
                    frameY = 8;
                }
                frameH = avy.height / frameY;
                break;
            }
            pixelCount = 0;
            if (height > avy.height) {
                break;
            }
        }
    }

    document.body.removeChild(frame);
    // q.putImageData(cocks, 0, 0);
    if (frameW && frameH) {
        return {
            w: frameW,
            h: frameH,
            y: 0,
            x: 0,
            maxX: frameX - 1,
            maxY: frameY - 1
        };
    } else {
        return false;
    }
}

// -----------------------------------------------------
// Remove the solid background color of the given avatar
// -----------------------------------------------------

function removebg(source) {
    var color = document.createElement('canvas');
    document.body.appendChild(color);
    var q = color.getContext('2d');
    color.width = source.width;
    color.height = source.height;
    q.drawImage(source, 0, 0);
    var pixels = q.getImageData(0, 0, source.width, source.height);
    var remove = {
        r: pixels.data[0],
        g: pixels.data[1],
        b: pixels.data[2]
    };
    for (var i = 0, len = pixels.data.length; i < len; i += 4) {
        var r = pixels.data[i];
        var g = pixels.data[i+1];
        var b = pixels.data[i+2];

        if (r == remove.r && g == remove.g && b == remove.b) {
            if (remove.r || remove.g || remove.b) {
                pixels.data[i+3] = 0;
            }
        }
    }
    q.putImageData(pixels, 0, 0);
    document.body.removeChild(color);
    return color.toDataURL();
}

// --------------------------------------------------
// Modify avatar and convert before sending to server
// --------------------------------------------------

function SpriteGif(imagedata, filename) {
    var img = new Image();
    img.src = imagedata;
    img.onload = function() {
        var width = img.width;
        var height = img.height;
        document.getElementById('menu').appendChild(img);
        var superGif = new SuperGif({gif: img});
        var splitCanvas = document.createElement('canvas');
        splitCanvas.height = height;
        var sc = splitCanvas.getContext('2d');
        superGif.load(function() {
            var TotalFrames = superGif.get_length();
            splitCanvas.width = width * TotalFrames;
            superGif.pause();
            for (var i = 0; i < TotalFrames; i++) {
                superGif.move_to(i);
                var Gifcanvas = superGif.get_canvas();
                var IMGdata = Gifcanvas.toDataURL();
                var frame = new Image();
                frame.src = IMGdata;
                sc.drawImage(frame, i * width, 0);
            }
            var SpriteFrames = {
                h: height,
                w: width,
                maxY: 0,
                maxX: superGif.get_length(),
                x: 0,
                y: 0
            }
            var SpriteSheet = splitCanvas.toDataURL();
            SendAvy(SpriteSheet, filename, SpriteFrames);
        });
    };
}

function SendAvy(imgdata, name, SpriteFrames) {
    var source = new Image();
    source.src = imgdata;
    source.onload = function() {
        var pixs = removebg(source);
        var user = player.info;
        TestAvatar = new Image(); // Update client side immediately
        TestAvatar.src = pixs;
        var Sizes = SpriteFrames || FrameSizes(TestAvatar);
        if (Sizes) {
            user.avy = TestAvatar;
            user.frame = Sizes;
            avatarControl.saveAvatar(user.avy, name);
            socket.emit('core', { // Send image data to server
                command: 'uploadAvy',
                data: {
                    avy: pixs,
                    name: name
                }
            });
        } else {
            CHAT.show({
                message: 'Unable to detect frame sizes',
                style: 'error'
            });
        }
    };
}

document.getElementById('upload').onchange = function() {
    var file = this.files[0];
    var reader = new FileReader();
    reader.onload = function(evt) {
        if (file.type == 'image/gif') {
            SpriteGif(evt.target.result, file.name);
        } else {
            SendAvy(evt.target.result, file.name);
        }
    };
    reader.readAsDataURL(file);
};

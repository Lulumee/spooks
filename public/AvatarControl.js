// ----------------------------------------------------
//  Gets the frame width and height of the given avatar 
// ----------------------------------------------------

//ZOOM IN METHODD

function FrameSizes(avy){
    var frame = document.createElement('canvas');
    frame.id = 'frame';
    frame.style.position = 'absolute';
    frame.style.left = '50px';
    document.body.appendChild(frame);
    var q = frame.getContext('2d');
    frame.width = avy.width;
    frame.height = avy.height;
    q.drawImage(avy,0,0);
    var frameW = false,
        frameH = false,
        frameX = 0,
        frameY = 0;

    var pixels = q.getImageData(0,0,avy.width,avy.height);
    //var cocks = q.getImageData(0,0,avy.width,avy.height);

    var height = 16;
    var width = 0;
    var findend = false;

    var pixelCount = 0;
    var LowestPixelCount = 128;
    var StartingWidth = 0;

    var bestWidth = 128;
    var WidthMax = avy.width < 128 ? avy.width : 128;

    //get width
    for(; height <= 128; height++){
        var alpha = pixels.data[((width*4)+(height*(avy.width*4)))+3];
        //cocks.data[((width*4)+(height*(avy.width*4)))+3] = 255;
        //cocks.data[((width*4)+(height*(avy.width*4)))] = 255;
        if(alpha){
            if(!findend){
                findend = true;
                StartingWidth = width;
            }
            pixelCount++;
        }
        if(height >= 128){
            width++;
            height = 15;
            if(findend && pixelCount == 0){//scaned full height, found no pixels, must be end of frame
                width += StartingWidth;
                //guess work
                var guess = width;
                var frameX = Math.round(avy.width/guess);
                frameW = avy.width/frameX;
                break;
            } else {//scanned full height
                if(LowestPixelCount > pixelCount){//found less pixels than before, save width
                    LowestPixelCount = pixelCount;
                    bestWidth = width;
                }
            }
            pixelCount = 0;
            if(width > WidthMax) break;//reached end of image, scan is over
        }
    }

    if(!frameW){
        var guess = bestWidth;
        var frameX = Math.round(avy.width/guess);
        frameW = avy.width/frameX;
    }

    var height = 0;
    var width = 0;
    var findend = false;
    var pixelCount = 0;
    var StartingHeight = 0;

    //get height
    for(; width <= frameW; width++){
        var alpha = pixels.data[((width*4)+(height*(avy.width*4)))+3];
        //cocks.data[((width*4)+(height*(avy.width*4)))+3] = 255;
        //cocks.data[((width*4)+(height*(avy.width*4)))] = 255;
        if(alpha){
            if(!findend){
                findend = true;
                StartingHeight = height;
            }
            pixelCount++;
        }
        if(width >= (frameW-10)){
            height++;
            width = 0;
            if(findend && pixelCount == 0){
                //guess work
                var guess = height;
                var frameY = Math.round(avy.height/guess);
                if(frameY > 8) frameY = 8;
                frameH = avy.height/frameY;
                break;
            }
            pixelCount = 0;
            if(height > avy.height) break;
        }
    }

    document.body.removeChild(frame);
    //q.putImageData(cocks,0,0);
    if(frameW && frameH){
        return {
            w : frameW,
            h : frameH,
            y : 0,
            x : 0,
            maxX : frameX-1,
            maxY : frameY-1
        };
    } else {
        return false;
    }
};

// -----------------------------------------------------
// Remove the solid background color of the given avatar
// -----------------------------------------------------

function removebg(source){
    var color = document.createElement('canvas');
    document.body.appendChild(color);
    var q = color.getContext('2d');
    color.width = source.width;
    color.height = source.height;
    q.drawImage(source,0,0);
    var pixels = q.getImageData(0, 0, source.width, source.height);
    var remove = {
        r : pixels.data[0],
        g : pixels.data[1],
        b : pixels.data[2]
    };
    for(var i = 0, len = pixels.data.length; i < len; i += 4){
        var r = pixels.data[i];
        var g = pixels.data[i+1];
        var b = pixels.data[i+2];

        if(r == remove.r && g == remove.g && b == remove.b){
            if(remove.r || remove.g || remove.b){
                pixels.data[i+3] = 0;
            }
        }
    }
    q.putImageData(pixels,0,0);
    document.body.removeChild(color);
    return color.toDataURL();
};

// --------------------------------------------------
// modify avatar and convert before sending to server
// --------------------------------------------------

function SpriteGif(imagedata, filename){
    var img = new Image();
    img.src = imagedata;
    img.onload = function(){
        var width = img.width;
        var height = img.height;
        document.getElementById('menu').appendChild(img);
        var superGif = new SuperGif({ gif: img});
        var splitCanvas = document.createElement('canvas');
        splitCanvas.height = height;
        var sc = splitCanvas.getContext('2d');
        superGif.load(function(){
            var TotalFrames = superGif.get_length();
            splitCanvas.width = width*TotalFrames;
            superGif.pause();
            for(var i = 0; i < TotalFrames; i++){
                superGif.move_to(i);
                var Gifcanvas = superGif.get_canvas();
                var IMGdata = Gifcanvas.toDataURL();
                var frame = new Image();
                frame.src = IMGdata;
                sc.drawImage(frame,i*width,0);
            }
            var SpriteFrames = {
                h : height,
                w : width,
                maxY : 0,
                maxX : superGif.get_length(),
                x : 0,
                y : 0
            }
            var SpriteSheet = splitCanvas.toDataURL();
            SendAvy(SpriteSheet,filename,SpriteFrames);
        });
    };
};

function SendAvy(imgdata, name, SpriteFrames){
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
                    name : name
                }
            });
        } else {
            CHAT.show({
                message : 'Unable to detect frame sizes',
                style : 'error'
            });
        }
    };
};

document.getElementById('upload').onchange = function(){
    var file = this.files[0];
    var reader = new FileReader();
    reader.onload = function(evt){
        if(file.type == 'image/gif'){
            SpriteGif(evt.target.result,file.name);
        } else {
            SendAvy(evt.target.result,file.name);
        }
    };
    reader.readAsDataURL(file);   
};
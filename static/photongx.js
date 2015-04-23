var photongx = (function($container, $items) {
    var slideshow = false,
        currentimage = 0,
        slideshowtimer,
        interval = 3000,
        offset = 4;

    $.fn.preload = function() {
        this.each(function(){
            // Check if url starts with /
            if (this[0] == '/') {
                $('<img>')[0].src = this;
            }
        });
    }
    $(window).on("debouncedresize", function(event) {
        setColumnwidth();
        $container.trigger('refreshWookmark');
    });

    // calculate and set optimal column size
    this.setColumnwidth = function() {
        var docwidth = document.body.clientWidth;
        var cwidth = 0;
        var columns = 0;
        // Decide on the best column width depending on docwidth
        // people with huge screens can tolerate more columns
        if (docwidth > 2500) 
            columns = 5;
        else if (docwidth > 1900) 
            columns = 4;
        else if (docwidth > 1000) 
            columns = 3;
        else if (docwidth >= 790)
            columns = 2;
        else if (docwidth < 790)
            columns = 1;

        // also subtract columns*offsett, since every item got offset px margin, offset/2 on each side
        cwidth = docwidth / columns - (offset*(columns-1)); 
        //$('.item').css('max-width', cwidth + 'px');
        $items.find('img').css('width', cwidth + 'px');
        console.log('Decided on ', columns, ' columns with docwidth ', docwidth);
    }
    setColumnwidth();

    this.wookmarkIt = function() {
        setColumnwidth();
        $items.wookmark({
            container: $container,
            autoResize: false,
            flexibleWidth: false,
            outerOffset: 0,
            offset: offset
        });
    }

    
    $container.imagesLoaded(function( $images, $proper, $broken ) {
        //setColumnwidth();

        wookmarkIt();

        // We are loaded, so hide the spinner
        $('.spinner').addClass('hidden');
    });

    // We got a new browser state from pressing prev or next buttons
    window.addEventListener("popstate", function (evt) {
        if (evt.state && evt.state.image) {
            navigateImage(evt.state.image);
        }
        else {
            // Assume we got an url that doesn't show an image
            hideLB();
        }
    });
    
    $('.lb').click(function(e) {
        // Show spinner
        $('#spinner').removeClass('hidden');
        
        //prevent default action (hyperlink)
        e.preventDefault();
        
        //Get clicked link href
        var image_href = $(this).attr("href");

        // Save the current image
        currentimage = parseInt($(this).attr('id').split('-')[1]);
        
        // Push inn <albumurl>/<image_id>/ to history
        history.pushState({ image: currentimage }, null, window.location.href + currentimage + "/");
        
        /*  
        If the lightbox window HTML already exists in document, 
        change the img src to to match the href of whatever link was clicked
        
        If the lightbox window HTML doesn't exists, create it and insert it.
        (This will only happen the first time around)
        */
        
        createLB();

        setLBimage(image_href);
        countView($(this).data('filename'));

        showLB();
    });

    this.createLB = function() {
        if ($('#lightbox').length == 0) { // #lightbox does not exist
            //create HTML markup for lightbox window
            var lightbox = 
            '<div id="lightbox" class="hidden">' +
                '<div class="action-group">' +
                '<a id="play" href="#" title="Toggle slideshow"><i class="fa fa-play"></i></a>' +
                '<a id="goFS" href="#" title="Toggle full screen"><i class="fa fa-arrows-alt"></i></a>' +
                '<a id="hideLB" href="# title="Close image""><i class="fa fa-times"></i></a></div>' +
                '<a href="#prev" id="prev" title="Previous image"><div><i class="fa fa-backward"></i></div></a>' +
                    '<div id="lbcontent">' + //insert clicked link's href into img src
                        '<img class="lbimg" id="img-front" src="">' +
                    '</div>' +  
                '<a href="#next" id="next" title="Next image"><div><i class="fa fa-forward"></i></div></a>' +
            '</div>';
                
            //insert lightbox HTML into page
            $('body').append(lightbox);

            // Run the set here to, to trigger click
            $('#next').bind('click touchstart', function(e) {
                // Reset timer so we don't doubleskip
                if (slideshow) {
                    pause(); 
                    play(); 
                }
                $(document).trigger("next_image");
                return false;
            });
            // Handle clicks on the prev link
            $('#prev').bind('click touchstart', function(e) {
                if (slideshow) {
                    // Reset timer so we don't doubleskip
                    pause();
                    play(); 
                }
                $(document).trigger("prev_image");
                return false;
            });

            // Handle clicks on the fs link
            $('#goFS').bind('click', function(e) {
                e.preventDefault();
                goFS();
                return false;
            });

            // Handle clicks on the play link
            $('#play').bind('click', function(e) {
                if($('#play i').hasClass('fa-play')) {
                    play();
                }else {
                    pause();
                }
                e.preventDefault();
                return false;
            });

            // Handle all clicks in lb-mode
            $('#lightbox').bind('click', function(e) {
                var target = $(e.target);
                var id = target.attr('id');
                hideLB();
                return false;
            });
        }
    }

    var setLBimage = function(image_href) {
        /* ANIM slideshow */
        if(slideshow) {

            $('#img-front').css('opacity', 0).bind("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function(){ 
                $('#lbcontent').html('<img class="lbimg" id="img-front" src="' + image_href +'">');
                //$('#img-front').attr('src', image_href);
                $('#img-front').css('opacity', 0.999).bind("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function(){ 
                    $('#img-front').css('opacity', 1);
                });

            });
        }else {
            $('#img-front').attr('src', image_href);
        }
        // TODO scrollto background pos img

    };
    this.showLB = function() {
        $('#lbcontent').imagesLoaded(function( $images, $proper, $broken ) {
            // effects for background
            $container.addClass('backgrounded');
            //show lightbox window - you could use .show('fast') for a transition
            $('#lightbox').removeClass('hidden').show();
            // We are loaded, so hide the spinner
            $('.spinner').addClass('hidden');
            $('#img-front').css('opacity', 1);
        });
    };
        
    var hideLB = function() {
        if($('#goFS i').hasClass('fa fa-compress')) {
            document.cancelFullScreen();
        }
        // effects for background
        $container.removeClass('backgrounded');
        //$('#lightbox').hide();
        $('#lightbox').hide();
        // Stop any running slideshow;
        pause();

        // Push away image number path
        var base_parts = window.location.href.split("/");
        if (base_parts[base_parts.length-2] == currentimage) {
            base = base_parts.slice(0, base_parts.length - 2).join("/") + "/";
            history.pushState({ image: null }, null, base);
        }
    };
    
    document.cancelFullScreen = document.webkitExitFullscreen || document.mozCancelFullScreen || document.exitFullscreen;
    
    var goFS = function(e) {
        if($('#goFS i').hasClass('fa-arrows-alt')) {

            var elem = document.getElementById('lightbox');

            if (elem.requestFullScreen) {
                elem.requestFullScreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullScreen) {
                elem.webkitRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullScreen();
            }
            elem.onwebkitfullscreenchange = onFullScreenExit;
            elem.onmozfullscreenchange = onFullScreenExit;

            $('#goFS i').removeClass('fa-arrows-alt').addClass('fa-compress');
        }else {
            document.cancelFullScreen();
            $('#goFS i').removeClass('fa-compress').addClass('fa-arrows-alt');
        }
    }
    var onFullScreenExit = function() {
        console.log('onFSExit');
    }
    

    // Slideshow
    var play = function() {
        $('#play i').removeClass('fa-play').addClass('fa-pause');
        slideshow = true;
        slideshowtimer = setInterval(function(){ $(document).trigger("next_image"); }, interval);
    }
    // Slideshow
    var pause = function() {
        $('#play i').removeClass('fa-pause').addClass('fa-play');
        slideshow = false;
        window.clearInterval(slideshowtimer);
    }

    // Clamp skip to images available
    var clampSkip = function (c) {
        if (c == 0) {
            // we are at the start, figure out the amount of items and
            // go to the end
            c = $items.length;
        }else if (c > ($items.length)) {
            c = 1; // Lua starts at 1 :)
        }

        return c;
    }
    // Function responsible for swapping the current lightbox image
    // it wraps on start and end, and preloads 3 images in the current 
    // scrolling direction
    this.navigateImage = function(c) {
        var imageelement = $('#image-'+c);
        var image_href = imageelement.attr('href');
        setLBimage(image_href);
        countView(imageelement.data('filename'));

        var cone = c+1, ctwo = c+2 , cthree = c+3;
        // We are going backwards
        if (c - currentimage) {
            cone = c-1, ctwo = c-2, cthree = c-3;
        }
        // Only load 1 image, faster swapping 
        $([
            $('#image-'+String(parseInt(cone))).attr('href'),
            ]).preload();

            //$('#image-'+String(parseInt(ctwo))).attr('href'),
            //$('#image-'+String(parseInt(cthree))).attr('href')
        currentimage = c;
    }

    //
    // Function responsible for counting clicks/views in the backend
    //
    this.countView = function(file_name) {
        // Backend wants the original file name as a key to use for counting
        $.getJSON('/api/img/click/', { 'img':file_name}, function(data) {
            if (!data.views > 0) {
                console.log('Error counting clicks. Response from backend was',data);
            }
        });
    }

    $(document).on('next_image', function (evt) {
        // Get image number corrected for skipping passed last image
        var image_num = clampSkip(currentimage + 1);

        // Cut out the image number we are at and replace with next image
        var base_parts = window.location.href.split("/");
        if (base_parts[base_parts.length-2] == currentimage)
            base = base_parts.slice(0, base_parts.length - 2).join("/") + "/";
        else
            base = window.location.href;

        // Push new url for to history for the image we are about to display
        history.pushState({ image: image_num }, null, base + image_num + "/");
        navigateImage(image_num);
    });

    $(document).on('prev_image', function (evt) {
        // Get image number corrected for skipping passed first image
        var image_num = clampSkip(currentimage - 1);
        
        // Cut out the image number we are at and replace with next image
        var base_parts = window.location.href.split("/");
        if (base_parts[base_parts.length-2] == currentimage)
            base = base_parts.slice(0, base_parts.length - 2).join("/") + "/";
        else
            base = window.location.href;
    
        // Push new url for to history for the image we are about to display
        history.pushState({ image: image_num }, null, base + image_num + "/");
        navigateImage(image_num);
    });

    $(document).keydown(function(e){
        if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey ) return true;
        if (e.keyCode == 27) { 
            hideLB();
            return false;
        }
        else if (e.keyCode == 37 || e.keyCode == 39) {
            if (slideshow) {
                // Reset timer so we don't doubleskip
                pause(); 
                play(); 
            }
            if (e.keyCode == 37) {
                $(document).trigger("prev_image");
            }
            else if (e.keyCode == 39) {
                $(document).trigger("next_image");
            }
            return false;
        }
        else if (e.keyCode == 70) {
            goFS();
        }
        else if (e.keyCode == 32) {
            $('#play').click();
        }
    });


    return this;
});

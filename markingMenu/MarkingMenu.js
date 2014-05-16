define ("markingMenu/MarkingMenu", [
"dojo/on",
"dojo/dom",
"dojo/_base/declare",
"dojo/_base/config",
"dojo/_base/lang",
"dojo/_base/window",
"dojo/_base/event",
"dojo/dom-geometry",
"dojo/touch",
"./_MarkingMenuGestureView",
"./_MarkingMenuView"
],function(on, dom, declare, config, lang, win, event, domGeometry, touch, MarkingMenuGestureView, MarkingMenuView) {

    return declare("markingMenu.MarkingMenu", null, {
		// summary:
		//		A marking menu you can connect to one node element

       constructor: function(/*Integer*/ numberOfItems){
            // summary:
            //      Create a Marking Menu with a given number of items.
            //      After instantiating the marking menu, use connectTo to trigger the menu on a right click.
            // numberOfItems: Integer
            //      Number of items in the menu. Must be 4 or 8.

            if (numberOfItems != 4 && numberOfItems != 8){
                console.error("MarkingMenu.constructor: Number of Items must be 4 or 8");
                return;
            }

            this._numberOfItems = numberOfItems;

            // initialize the item holder / when item used -> _items[i] = { _description, _actionOrMarkingMenu };
            this._items = new Array(this._numberOfItems+1);
            for(i=0;i<this._numberOfItems+1;i++){
                this._items[i] = null;
            }

            // initialize local structures
            this._markingMenuView = new MarkingMenuView(this._numberOfItems, this._const.neutralZoneRadius);
            this._origin 		  = { x:0, y:0 };
            this._lastPoint		  = { pageX: 0, pageY: 0 };
            this._currentMove     = { x1: 0, y1: 0, x2: 0, y2: 0 };

            if(config.isDebug)
                this._descriptions = new Array(numberOfItems);
        },

        // marking menu items
        _numberOfItems: 		null, // marking menu must be 4 or 8 portions
        _items:					null, // marking menu items (action or sub marking menu)
        _descriptions:			null, // for debugging

        // graphic representation of the marking menu
        _markingMenuView:		null, // graphic representation of the marking menu
        _lastPoint:				null, // used to start a sub menu when the view is visible
        _gestureView:			new MarkingMenuGestureView(), // static as one gesture can involve multiple marking menus

        //
        _origin:				null, // center of the marking menu
        _pauseTimerToShowView:	null, // timer to delay showing the marking menu
        _pauseTimerToActivateMenu: null, // timer to trigger a sub menu when the marking menu is visible

        // gesture
        _currentMove:			null, // last significant move
        _firstMove: 			null, // first significant move to be compared with following moves to detect a change of direction

        // static
        _const:{
            angleThresholdFor8Items:	(30*Math.PI)/180, // [const] 8 items / perfect angle is 45d, minimum angle is 22.5d => 33.75 ~ 30 degrees
            angleThresholdFor4Items:	(65*Math.PI)/180, // [const] 4 items / perfect angle is 90d, minimum angle is 45.0d => 67.50 ~ 65 degrees
            vectorThreshold: 			10,	// [const] minimum size in pixels of a vector created from a mouse move
            neutralZoneRadius: 			10,	// [const] distance in pixels to create a inactive zone at the center of the visible menu
            pauseTime: 					200 // [const] time in milliseconds before showing the marking menu
        },

        // Signal Handlers
        _contextSignalHandler:	null, // catch contextmenu event and disable it when used on connected node
        _pressSignalHandler:	null, // right mouse click triggers the menu
        _moveSignalHandler:		null, // after right click, listen to mouse move to analyse gesture
        _releaseSignalHandler:	null, // mouse up hide the menu and possibly trigger an action, if on an item


        connectToNodeId: function(/*String|DomNode*/ node){
            // summary:
            //      Attach to a given node
            //      Marking menu will open on a right click
            // returns:
            //      true if not already connected, false if already connected

            if (this._contextSignalHandler != null){
                console.log("MarkingMenu: already connected");
                return false;
            }

            node = dom.byId(node);

            var cn;
            // cn = node; // does not work
            // cn = win.body(); // works

            if (node == win.doc){
                cn = node;
                // deactivate the context menu (a bit like dijit.Menu)
                this._contextSignalHandler = on(cn,"contextmenu",function(evt){
                                                                        // stop event propagation
                                                                        event.stop(evt);
                                                                 });

            }else{
                // can only capture context menu event at the top level
                cn = node.ownerDocument.documentElement;

                // deactivate the context menu (a bit like dijit.Menu)
                this._contextSignalHandler = on(cn,"contextmenu",function(evt){
                                                                    //if(config.isDebug) console.log("MarkingMenu: context menu");
                                                                    var np = domGeometry.position(node); // w h x y
                                                                    // if inside the node element do not show the context menu
                                                                    if ( np.x < evt.clientX && evt.clientX < np.x + np.w &&
                                                                         np.y < evt.clientY && evt.clientY < np.y + np.h)
                                                                        // stop event propagation
                                                                        event.stop(evt);
                                                                 });
            }


            // activate marking menu on right click
            this._pressSignalHandler = on(node,touch.press,lang.hitch(this,this._down));

            return true;
        },

        addItemToPortion: function(/*Integer*/ portion, /*String*/ description, /*MarkingMenu|function*/ actionOrMarkingMenu){
            // summary:
            //      Set a description and action for a given portion number
            // portion: Integer
            //      Can be between 1 and the number of items set a the creation
            // description: String
            //      Text shown on the item when the menu is visible
            // actionOrMarkingMenu: MarkingMenu|function
            //      Use a MarkingMenu to create a sub-menu or a function to trigger an action when the item is selected

            if (portion < 1 || portion > this._numberOfItems){
                console.error("MarkingMenu.addItemToPortion: portion " + portion + " is not between 1 and " + this._numberOfItems);
                return;
            }

            if(this._items[portion]){
                console.error("MarkingMenu.addItemToPortion: portion already set");
                return;
            }

            // item info
            this._items[portion] = { _description: description,
                                     _actionOrMarkingMenu: actionOrMarkingMenu };
            // create the item in the Marking Menu View
            // FIXME: find a better way to check for sub marking menu
            var isMarkingMenu =  ( actionOrMarkingMenu == '[object Object]' );
            this._markingMenuView.addItemToPortion(description, portion, isMarkingMenu);

            if(config.isDebug)
                this._descriptions[portion] = description;
         },

        removeItemFromPortion: function(/*Integer*/ portion){
            // summary:
            //      Unset an item at a given portion number
            // portion: Integer
            //      Can be between 1 and the number of items set a the creation

            // setting it to null and removing the drawing in the view
            this._items[portion] = null;
            // remove the graphic item in the view
            this._markingMenuView.removeItemFromPortion(portion);
        },

        disconnect: function(){
            // summary:
            //      Deactivate the marking menu, it will not be connected to any node
            //      Marking menu can be reconnected to a node later on

            if (this._contextSignalHandler != null)
                this._contextSignalHandler.remove();

            if (this._pressSignalHandler != null)
                this._pressSignalHandler.remove();
        },

        _down: function(/*Object*/ evt){
            // summary:
            //      Setup the marking menu timer and mouse events

            // TODO: fix the fact that Chrome and Safari still select text

            if (evt.button == dojo.mouseButtons.RIGHT || evt.ctrlKey == true){

                event.stop(evt);

                // set the marking menu center and mousemove & mouseup events
                this._setOriginAndHandlers(evt);

                // set the current vector start to the origin (beginning of the first move)
                this._currentMove.x1 = this._origin.x; // == evt.pageX
                this._currentMove.y1 = this._origin.y; // == evt.pageY

                // place the gesture view and show it
                this._gestureView.setCenterPosition(this._origin.x,this._origin.y);
                this._gestureView.show();

                // timer to show the view if the user pause
                this._pauseTimerToShowView = setTimeout(lang.hitch(this, function(){ this._activateView(); }),
                                                        this._const.pauseTime);
            }
        },

        _setOriginAndHandlers: function(/*Object*/ evt){
            // summary:
            //      Set starting point of the menu and of the first move
            //      listen to mousemove and mouseup events
            // evt: Object
            //      Event coordinates


            // set origin of the marking menu
            this._origin.x = evt.pageX;
            this._origin.y = evt.pageY;

            // LIMITATION: Starting with a right click does not get event outside the window.
            //             Though, starting with left mousedown we can get mousemove event outside the window.

            // capture events on drag
            this._moveSignalHandler = on(win.doc.documentElement,touch.move,lang.hitch(this,this._drag));

            // capture event on release
            this._releaseSignalHandler = on(win.doc.documentElement,touch.release,lang.hitch(this,this._up));

        },

        _drag: function(/*Object*/ evt){
            // summary:
            //      Follow mouse events after right click. Gesture detection
            // evt: Object
            //      Event coordinates

            // LIMITATION: do not be detected events on areas like firebug view

            event.stop(evt);

            this._lastPoint.pageX = evt.pageX;
            this._lastPoint.pageY = evt.pageY;

            // stop the timer when moving
            clearTimeout(this._pauseTimerToShowView);

            // if the view is visible
            if (this._markingMenuView.isVisible()){
                var portion = this._getMarkingMenuPortionNumber(this._origin, evt, this._numberOfItems, this._const.neutralZoneRadius);
                // FIXME: find a better way to check for sub marking menu
                var isMarkingMenu =  ( this._items[portion] != null && this._items[portion]._actionOrMarkingMenu == '[object Object]');
                // send the event to the view
                this._markingMenuView.handleEvent(evt, portion, isMarkingMenu);

                // if under a sub menu start a timer to activate it
                if (isMarkingMenu){
                    clearTimeout(this._pauseTimerToActivateMenu); // delete this._pauseTimerToActivateMenu;
                    this._pauseTimerToActivateMenu = setTimeout(lang.hitch(this, function(){ this._activateSubMenuFromView(); }), this._const.pauseTime);
                }else{
                    clearTimeout(this._pauseTimerToActivateMenu);
                }
            }else{
                // if the view is not visible
                //      ignore the neutralZoneRadius in "expert mode" (no view visible), find the portion

                // restart the timer (to show the view) if we pause
                this._pauseTimerToShowView = setTimeout(lang.hitch(this, function(){ this._activateView(); }), this._const.pauseTime);

                // analyze the gesture

                // build the current vector until it reaches the distance threshold
                this._currentMove.x2 = evt.pageX;
                this._currentMove.y2 = evt.pageY;
                var distance = Math.sqrt( Math.pow(this._currentMove.x2 - this._currentMove.x1,2) +
                                          Math.pow(this._currentMove.y1 - this._currentMove.y2,2) );

                // the current vector has reached the distance threshold
                if (distance >= this._const.vectorThreshold){

                    //if we do not have the first move, register the first move as a reference
                    if(this._firstMove == null){
                        // reference vector is set to current vector and some other useful info (portion number under the reference and portion type) are saved
                        this._firstMove = this._buildFirstMoveFromCurrentVector();
                        // draw the reference vector
                        this._gestureView.drawVector(this._firstMove.referenceVector,"reference");
                    }else{
                    // we have the first move and will compare the angle between current vector and first vector

                        // draw the current vector
                        this._gestureView.drawVector(this._currentMove,"current");

                        // if under a sub menu (if not, mouseup will manage the action)
                        if (this._firstMove.isUnderASubMenu){
                            // compute the angle threshold depending of the sub menu we are under
                            var angleThreshold;
                            var subMenu = this._items[this._firstMove.portion]._actionOrMarkingMenu;

                            if (subMenu._numberOfItems == 4)
                                angleThreshold = this._const.angleThresholdFor4Items;
                            else // == 8
                                angleThreshold = this._const.angleThresholdFor8Items;

                            //var angle = Math.acos( current.x / distance ) * (current.y >= 0 ? 1 : -1); // angle is in [Pi,-Pi[
                            var angleDifference = this._getAngleDifference(this._firstMove.referenceVector, this._currentMove);

                            // if we detect a change of direction (angle difference is always positive from acos)
                            if (angleDifference >= angleThreshold){
                                // deactivate the current menu and transition to the sub menu
                                this._deactivate();
                                subMenu._setOriginAndHandlers({ pageX:this._currentMove.x1,
                                                                pageY:this._currentMove.y1 });
                                subMenu._currentMove = this._currentMove;
                                // make sure the sub menu reference vector is build from the current vector
                                // by calling drag() instead of waiting for the net event
                                subMenu._drag(evt);
                                //return;
                            }
                        }
                    }
                    // new vector start / set the start of the new current vector to the end of the current vector
                    this._currentMove.x1 = this._currentMove.x2; this._currentMove.y1 = this._currentMove.y2;
                } // distance >= this._const.vectorThreshold
            }
        },

        _up: function(/*Object*/ evt){
            // summary:
            //      Item selection or nothing if in the neutral zone and the view is visible
            // evt: Object
            //      Event coordinates

            event.stop(evt);

            // hide and clear the gesture
            this._gestureView.hide();
            this._gestureView.clear();

            // find the portion from the event
            var portion = this._getMarkingMenuPortionNumber(this._origin, evt, this._numberOfItems, this._const.neutralZoneRadius);
            // NOTE: Neutral zone radius could be different if the view is visible or not

            // if the item has a function call it
            // FIXME: find a better way to check for sub marking menu
            if (this._items[portion] && !( this._items[portion]._actionOrMarkingMenu == '[object Object]')){
                if(config.isDebug)
                    console.log("item description: " + this._descriptions[portion]);
                (this._items[portion]._actionOrMarkingMenu)();

            }else if( this._items[portion] && !this._markingMenuView.isVisible() ){
                // if we are under a sub marking menu and if view is not visible, propagate the direction to the sub menu
                // if visible do not do anything, timer handles that

                var subMenu = this._items[portion]._actionOrMarkingMenu;
                // propagate the origin to the sub menu and fire the _up with event
                // the two menus will have the same origin
                subMenu._origin = { x:this._origin.x ,y:this._origin.y };
                subMenu._up(evt);
            }

            // deactivate the current marking menu
            this._deactivate();
        },

        _deactivate: function(){
            // summary:
            //      Stop timers, handlers, and hide the view

            //stop the timers
            clearTimeout(this._pauseTimerToShowView); // delete this._pauseTimerToShowView;
            clearTimeout(this._pauseTimerToActivateMenu);

            // disconnect mousemove and mouseup, until the next mousedown
            if (this._moveSignalHandler != null)
                this._moveSignalHandler.remove();

            if (this._releaseSignalHandler != null)
                this._releaseSignalHandler.remove();

            // if the view is visible hide it
            //if (this._markingMenuView.isVisible()){
                this._markingMenuView.hide();
            //}

            // reset the first move (and the reference vector)
            // NOTE: Reset on mousedown instead?
            this._firstMove = null;
        },

        _activateView: function(){
            // summary:
            //      Show the Marking Menu View when the user hesitate/wait

            // hide the gesture view
            this._gestureView.hide();
            // center the view
            this._markingMenuView.setCenterPosition(this._origin.x,this._origin.y);
            // show the view
            this._markingMenuView.show();
        },

        _activateSubMenuFromView: function(){
            // summary:
            //      Activate a visible sub marking menu view when the use pause on it

            // deactivate the current marking menu
            this._deactivate();
            // get the portion
            var portion = this._getMarkingMenuPortionNumber(this._origin, this._lastPoint, this._numberOfItems, this._const.neutralZoneRadius);
            // get the sub menu
            var subMenu = this._items[portion]._actionOrMarkingMenu;
            // activate the sub menu
            subMenu._setOriginAndHandlers(this._lastPoint);
            // as the view is visible, no need to set the submenu._currentMove()

            // activate view
            subMenu._activateView();
        },

        _getMarkingMenuPortionNumber: function (/*Object*/ origin, /*Object*/ event, /*Integer*/ numberOfPortions, /*Integer*/ neutralZoneRadius){
            // summary:
            //      Find which marking menu portion is under the event coordinates
            //      Used as a class/static method
            // origin: Object
            //      Center of the marking menu, {x, y}
            // event: Object
            //      Event coordinates
            // numberOfPortions: Integer
            //      Number of items in the marking menu (4 or 8)
            // neutralZoneRadius: Integer
            //      Distance in pixels for the inactive zone
            // returns:
            //      Portion number, 0 for neutral zone, 1 for top portion, etc.


            // find the vector from the origin
            var y = (origin.y - event.pageY);
            var x = (event.pageX - origin.x);

            // distance from the origin
            var distance = Math.sqrt( Math.pow(x,2) + Math.pow(y,2) );

            // if distance is too close from the center we are still in the neutral zone
            if ( distance < neutralZoneRadius )
                return 0;

            // angle from the origin
            var angleCos = Math.acos( x / distance );
            var angle = Math.PI + angleCos * (y >= 0 ? -1 : 1); // angle is in [ 0 -> 2*Pi [ clockwise // angle 0 is at Pi

            angle = ( Math.PI*2 + angle - (Math.PI/2 - Math.PI/numberOfPortions) ) % (Math.PI*2); // angle is 0 left of first portion
            var portion = Math.floor( 1 + (angle / (Math.PI*2/numberOfPortions)));

            return portion;
        },

        _getAngleDifference: function(/*Object*/ vector1, /*Object*/ vector2){
            // summary:
            //      Compute angle between two vectors, acos(v1.v2) -> [0,Pi]
            // vector1: Object
            //      First vector = {x1,y1,x2,y2} in screen coordinates (0,0 is top left)
            // vector2: Object
            //      Second vector = {x1,y1,x2,y2} in screen coordinates (0,0 is top left)
            // returns:
            //      return angle difference

            var r = { x:vector1.x2 - vector1.x1,
                      y:vector1.y1 - vector1.y2 };

            var c = { x:vector2.x2 - vector2.x1,
                      y:vector2.y1 - vector2.y2 };

            var rl = Math.sqrt( Math.pow(r.x,2) + Math.pow(r.y,2) );

            var cl = Math.sqrt( Math.pow(c.x,2) + Math.pow(c.y,2) );

            r.x = r.x/rl; r.y = r.y/rl; c.x = c.x/cl; c.y = c.y/cl;

            return Math.acos(r.x*c.x + r.y*c.y);
        },

        _buildFirstMoveFromCurrentVector: function(){
            // summary:
            //      Create the reference vector from the current vector
            //      Save on which portion the reference vector is on and if under a sub menu
            // returns:
            //      A vector that represents the first move

            // find the portion from the reference vector move
            var portion = this._getMarkingMenuPortionNumber(this._origin,
                                                           {pageX:this._currentMove.x2, pageY:this._currentMove.y2},
                                                           this._numberOfItems, 0); // no neutral zone in gesture/ vectors are at least 5 or 10 pixels anyway

            // adjust the reference vector to be in the middle of the portion
            var angle = (portion-1) * ( (2*Math.PI) / this._numberOfItems );

            // 0 degree angle is on the right
            angle =  (Math.PI*2 + angle - Math.PI/2) % (Math.PI*2);
            var x = Math.cos(angle) * this._const.vectorThreshold;
            var y = Math.sin(angle) * this._const.vectorThreshold; // ok because the y coordinate in the screen start from the top
            var referenceVector = {x1:this._origin.x,  y1:this._origin.y , x2:this._origin.x+x , y2:this._origin.y+y, portion:portion};

            // no adjustment
            //var referenceVector = {x1:this._currentMove.x1,  y1:this._currentMove.y1 , x2:this._currentMove.x2 , y2:this._currentMove.y2, portion:portion};

            // find out if it is a sub menu or not
            // FIXME: find a better way to check for sub marking menu
            var isUnderASubMenu = (this._items[referenceVector.portion] &&
                                  (this._items[referenceVector.portion]._actionOrMarkingMenu == '[object Object]'));

            var firstMove = { referenceVector:referenceVector,
                              portion:portion,
                              isUnderASubMenu:isUnderASubMenu
            };

            return firstMove;
        }

        // [YLB] Marking Menu Improvements
        // TODO: check if MarkingMenu can inherit from dijit.Menu / wait for DOJO 2.0
        // TODO: assign menu to multiple elements
        // TODO: for mobile and tablet, create a tap.press event (timer after a tap to wait for a press)
        // TODO: add a visual feedback to know which item was selected/triggered
        // TODO: when visible, add a way to go back to the previous marking menu (zone and timer to go back to the previous menu)
        // TODO: allow icons/widgets to be used as menu items representation
        // TODO: create a marking menu builder interface to let users personalize menus and place items where it makes sense to them
        // NOTE: marking menus could be 8 portions only. Use the portions you want, let the rest inactive.
        //
    });
});
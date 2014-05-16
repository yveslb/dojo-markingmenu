define ("markingMenu/_MarkingMenuView", [
"dojo/dom-construct",
"dojo/dom-style",
"dojo/_base/config",
"dojo/_base/declare",
"dojo/_base/window",
"dojox/gfx"
],function(domConstruct, domStyle, config, declare, win, gfx) {

    return declare("markingMenu._MarkingMenuView", null, {

        // static
        _const:{
            wide: 300,              // [const] size of the transparent drawing square area
            defaultColor: "#999",   // [const] color for separation between portions, neutral zone, and item selection
            menuColor: "blue",      // [const] color to indicate we are under a sub menu
            textColor: "black"      // [const] text color describing items
        },

        _numberOfItems:		null,   // number of items in the marking menu (4 or 8)
        _neutralZoneRadius: null,   // distance in pixels to define the inactive area in the center of the marking menu

        _graphicItems:		null,   // [0] neutral zone and separations, [1] text on top, [2] clockwise next to [1], etc.
        _graphicSelection:	null,   // graphic indicator to know which portion is selected
        _divViewNode:		null,   // DOM element to host the GFX surface
        _surfaceGFX:		null,   // drawing area
        _selectedPortion:	0,      // currently selected portion: 0 neutral zone, 1 portion on top, 2 clockwise to top, etc.


        constructor: function(/*Integer*/ numberOfItems, /*Integer*/ neutralZoneRadius){
            // summary:
            //      Create a graphic representation of a marking menu
            // numberOfItems: Integer
            //      number of items in the marking menu (4 or 8)
            // neutralZoneRadius: Integer
            //      Distance in pixels to define the inactive area in the center of the marking menu

            this._numberOfItems = numberOfItems;
            this._neutralZoneRadius = neutralZoneRadius;

            // initialize the array of graphic components
            // [0] neutral zone and portion separations, [1] text on top, [2] text clockwise to top, etc.
            this._graphicItems = new Array(this._numberOfItems+1);
            for(i=0;i<this._numberOfItems+1;i++) {
                this._graphicItems[i]=null;
            }

            // create the drawing surface
            this._divViewNode = domConstruct.create("div", { style: {position: "absolute"} },win.body());
            this._surfaceGFX = gfx.createSurface(this._divViewNode, this._const.wide, this._const.wide);
            // keep visible for now, because IE does not draw in a hidden surface

            //draw center portion (neutral zone and portion separators)
            this._createNeutralZoneAndSelections();

            // hide the view
            domStyle.set(this._divViewNode, "visibility", "hidden");
        },

        _createNeutralZoneAndSelections: function(){
            // summary:
            //      Draw the neutral zone and the separations between portions

            // neutral zone circle
            var neutralZoneGroup = this._surfaceGFX.createGroup();
            neutralZoneGroup.createCircle({ cx: this._const.wide/2,
                                            cy: this._const.wide/2,
                                            r: this._neutralZoneRadius })
                            .setStroke(this._const.defaultColor);

            var centerX = this._const.wide/2;
            var centerY = this._const.wide/2; // square view

            // separation between portions
            for(var portion = 0; portion < this._numberOfItems; portion++){
                var angle = portion * Math.PI*2/this._numberOfItems + Math.PI*2/(this._numberOfItems*2);
                var cosAngle = Math.cos(angle);
                var sinAngle = Math.sin(angle);
                neutralZoneGroup.createLine({ 	x1: (centerX + cosAngle * this._neutralZoneRadius),
                                                y1: (centerY + sinAngle * this._neutralZoneRadius),
                                                x2: (centerX + cosAngle * this._neutralZoneRadius * 2),
                                                y2: (centerY + sinAngle * this._neutralZoneRadius * 2) })
                                .setStroke(this._const.defaultColor);
            }

            this._graphicItems[0] = neutralZoneGroup;

            // indicator to know which portion is selected
            this._graphicSelection = this._surfaceGFX.createCircle({ 	cx: this._const.wide/2,
                                                                        cy: this._const.wide/2,
                                                                        r:  this._neutralZoneRadius/2 })
                                                     .setStroke(this._const.defaultColor);

            // place the indicator outside the surface to hide it and use it later
            this._graphicSelection.applyTransform(gfx.matrix.translate( - this._const.wide, - this._const.wide ));
            //this._graphicSelection.moveToFront();
        },


        addItemToPortion: function(/*String*/ description, /*Integer*/ portion, /*Boolean*/ isMarkingMenu){
            // summary:
            //      Create a graphic representation of the description to a marking menu portion
            // description: String
            //      Text to write on the marking menu portion
            // portion: Integer
            //      Portion number where the description text should be placed
            //      Can be between 1 and the number of items (4 or 8)
            // isMarkingMenu: Boolean
            //      If the portion is a sub marking menu, the text color will be different

            // if it is invisible IE will not draw
            domStyle.set(this._divViewNode, "visibility", "visible");

            // find the position to draw the text
            // TODO: distribute vertically in a 8 portion menu
            var angleFromOrigin = Math.PI/2 - (portion-1) * ( Math.PI*2/this._numberOfItems );
            var xText = Math.round ( (this._const.wide/3) * Math.cos(angleFromOrigin) );
            var yText = Math.round ( (this._const.wide/3) * Math.sin(angleFromOrigin) );

            // TODO: use a text background color for better readability
            //       find boundingbox before writing the text or check if we can use moveToFront()/moveToBack()

            // draw/write the text
            this._graphicItems[portion] = this._surfaceGFX.createText({	x: this._const.wide/2 + xText,
                                                                        y: this._const.wide/2 - yText,
                                                                        text: description, align: "middle" })
                                                          .setFont({ family: "Arial", size: "11pt" });
            if (isMarkingMenu){
                this._graphicItems[portion].setFill(this._const.menuColor);
            }else{
                this._graphicItems[portion].setFill(this._const.textColor);
            }

            // see comment about IE at the top of the method
            domStyle.set(this._divViewNode, "visibility", "hidden");
        },

        removeItemFromPortion: function(/*Integer*/ portion){
            // summary:
            //      Remove the graphic representation associated with the portion
            //      Used by MarkingMenu.removeItemFromPortion
            // portion: Integer
            //      Can be between 1 and the number of items (4 or 8)

            this._graphicItems[portion].removeShape();
        },

        show: function(){
            // Make the View visible
            domStyle.set(this._divViewNode, "visibility", "visible");
        },

        hide: function(){
            // Make the view invisible
            domStyle.set(this._divViewNode, "visibility", "hidden");
            this._graphicSelection.setTransform({dx: -this._const.wide, dy: -this._const.wide});
        },

        isVisible: function(){
            // returns true if the view is visible, false if invisible
            return (domStyle.get(this._divViewNode, "visibility") != "hidden");
        },


        handleEvent: function(/*Object*/ evt, /*Integer*/ underPortion, /*Boolean*/ isMarkingMenu){
            // summary:
            //      Used when the marking menu view is visible. Shows which item is currently selected
            // evt: Object
            //      Coordinate of the mouse
            // underPortion: Integer
            //      number of the item that should be selected.
            //      Between 0 (neutral zone) and the number portions of the marking menu
            // isMarkingMenu: Boolean
            //      true if the item is a sub marking menu, false otherwise

            // if we are under a portion different than the one selected
            if (this._selectedPortion != underPortion){
                this._selectedPortion = underPortion;

                // move the _graphicSelection to indicate which portion we are under
                if ( underPortion != 0 ){
                    var angle = Math.PI/2 - (underPortion-1) * ( Math.PI*2/this._numberOfItems );
                    this._graphicSelection.setTransform({	dx: ( + Math.cos(angle) * this._neutralZoneRadius*2),
                                                            dy: ( - Math.sin(angle) * this._neutralZoneRadius*2) });
                    // change the color if we are about to select a sub menu
                    if (isMarkingMenu) {
                        //this._graphicSelection.setFill("");
                        this._graphicSelection.setStroke(this._const.menuColor);
                    }
                    else {
                        //this._graphicSelection.setFill("");
                        this._graphicSelection.setStroke(this._const.defaultColor);
                    }
                }else{
                    // we are under the neutral zone, move the selection item outside the canvas (gfx renderer) to hide it
                    // FIXME: find a better way to hide the selection
                    this._graphicSelection.setTransform({dx: -this._const.wide, dy: -this._const.wide});
                }
            }
        },

        setCenterPosition: function(x, y){
            // summary:
            //      Center the view at x,y coordinates (evt.pageX, evt.pageY)
            // x: Integer
            //      Horizontal coordinate
            // y: Integer
            //      Vertical coordinate

            domStyle.set(this._divViewNode, { left: x - this._const.wide/2 + "px",
                                              top:  y - this._const.wide/2 + "px" });
        }

        // [YLB] Marking Menu View Improvements
        // TODO: marking menu view should expand if necessary
        //

    });
});

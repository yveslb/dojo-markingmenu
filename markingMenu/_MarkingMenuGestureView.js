define ("markingMenu/_MarkingMenuGestureView", [
"dojo/dom-construct",
"dojo/dom-style",
"dojo/_base/config",
"dojo/_base/declare",
"dojo/_base/window",
"dojox/gfx"
],function(domConstruct, domStyle, config, declare, win, gfx) {

    return declare("markingMenu._MarkingMenuGestureView", null, {
		// summary:
		//		A view to draw marking menu gestures

        // graphic elements
        _divViewNode:	null, // DOM element used to create the GFX surface
        _surfaceGFX:	null, // Surface used to draw the gestures

        // static
        _const: {
            wide: 800,                  // [const] size of the transparent drawing area
            color: "#999",              // [const] default color used to draw vectors
            colorReference: "green",    // [const] color for first move vector
            colorCurrent: "gray",       // [const] color for following move in the the same direction
            colorError: "red"           // [const] color for change of direction on an item that is not a menu
        },

        constructor: function(){
            // graphic gesture
            this._divViewNode = domConstruct.create("div", { style: {position: "absolute", visibility: "hidden"} },win.body());
            this._surfaceGFX = gfx.createSurface(this._divViewNode, this._const.wide, this._const.wide);
        },

        show: function(){
            // make the View visible
            domStyle.set(this._divViewNode, "visibility", "visible");
        },

        hide: function(){
            // set the view to invisible
            domStyle.set(this._divViewNode, "visibility", "hidden"); //domStyle.set("surfaceElement", "opacity", 0);
        },

        isVisible: function(){
            // return true if the view is visible, false if invisible
            return (domStyle.get(this._divViewNode, "visibility") != "hidden");
        },

        clear: function(){
            // erase all the gestures
            this._surfaceGFX.clear();
        },

        setCenterPosition: function(/*Integer*/ x, /*Integer*/ y){
            // summary:
            //      Center the view at x,y coordinates (evt.pageX, evt.pageY)
            // x: Integer
            //      Horizontal coordinate
            // y: Integer
            //      Vertical coordinate

            domStyle.set(this._divViewNode, { left: x - this._const.wide/2 + "px",
                                              top:  y - this._const.wide/2 + "px" });
        },

        drawVector: function(/*Object*/ vector, /*String*/ type){
            // summary:
            //      draw a vector with a circle at the end, color depends of the type
            // vector: Object
            //      Move information {x1,y1,x2,y2} from evt.pageX, evt.pageY
            // type: String
            //      Description of the vector type, "reference"|"current"|"directionChangeOnItem"

            var top = domStyle.get(this._divViewNode, "top");
            var left = domStyle.get(this._divViewNode, "left");
            // default color in case of the type is not one of the three below
            var color = this._const.color;

            // select the color depending of the type
            if (type == "reference") color = this._const.colorReference;
            else if (type == "current") color = this._const.colorCurrent;
            else if (type == "directionChangeOnItem") color = this._const.colorError;

            // draw the two components of the vector representation, line and circle == --o
            this._surfaceGFX.createLine({ x1: vector.x1-left, y1: vector.y1-top, x2: vector.x2-left, y2: vector.y2-top }).setStroke(color);
            this._surfaceGFX.createCircle({ cx: vector.x2-left, cy: vector.y2-top, r:2 }).setStroke(color);
        }

        // [YLB] Marking Menu Gesture View Improvements
        // TODO: marking menu view size should take into account the window size
        //

    });
});
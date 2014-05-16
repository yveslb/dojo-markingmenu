#DOJO Marking Menu

Marking Menu implementation in DOJO.

`\markingMenu` directory contains the DOJO Marking Menu source code.

`\images` directory is only used by [README.md](README.md) and [METHOD.md](METHOD.md).

`\local` directory is only used by [demo1.html](/demo1.html) and [demo2.html](/demo2.html).

A Marking Menu can be used like a pie menu.

You can also select items with gestures, by moving the mouse before the menu become visible.

##Radial or Pie Menu

![menus](/images/mmenus-trace.png)

##Gesture

![gesture](/images/gesture.png)

##Create Marking Menus

    require(["markingMenu/MarkingMenu"], function(MarkingMenu) {

        var my_marking_menu = new MarkingMenu(4);

        my_marking_menu.addItemToPortion(1, "text 1", function(){ console.log("text 1 selected"); });
        my_marking_menu.addItemToPortion(3, "text 3", function(){ console.log("text 3 selected"); });
        my_marking_menu.addItemToPortion(4, "text 4", function(){ console.log("text 4 selected"); });

        my_marking_menu.connectToNodeId("a-node-id");


        var my_sub_marking_menu = new MarkingMenu(4);

        my_sub_marking_menu.addItemToPortion(1, "text 2-1", function(){ console.log("text 2-1 selected"); });
        my_sub_marking_menu.addItemToPortion(2, "text 2-2", function(){ console.log("text 2-2 selected"); });
        my_sub_marking_menu.addItemToPortion(3, "text 2-3", function(){ console.log("text 2-3 selected"); });
        my_sub_marking_menu.addItemToPortion(4, "text 2-4", function(){ console.log("text 2-4 selected"); });

        my_marking_menu.addItemToPortion(2, "my sub menu", my_sub_marking_menu);

    });

See also [demo1.html](/demo1.html) and [demo2.html](/demo2.html)

##More Information

The method used for the gesture recognition is explained in [METHOD.md](/METHOD.md).

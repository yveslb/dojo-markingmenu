#Segmentation Method for  Directional Menu  Gesture Recognition

Based on ideas published at ACM UIST in 1994

Hierarchical Directional Menus (also called pie menus and marking menus in the literature) are circular menus that are composed of multiple items, typically 4 or 8. Each item can be an action or another directional menu. Selection of an item can be done by a gesture without showing the graphical representation of the menu.
Gesture can be realized by using a mouse, trackball, stylus, pen, finger or anything that can record a movement.

![MMExpert](/images/mmexpert.png)

Image from [www.billbuxton.com/MMExpert.html](http://www.billbuxton.com/MMExpert.html)

Directional Menus are functionally equivalent to standard linear pop-up or pull-down menus. Still they present some key advantages that have been extensively documented in the literature. Among others, they accelerate the selection time for an expert user and simplify the transition from novice to expert.

Our method uses gestures inputs and matches them through linked Directional Menus to select which item the user wants to select. Gestures with only one move are easy to detect. We just have to compute the angle between the origin point and the final point.

The main challenge we address is to detect changes of direction to signify the selection of a sub Directional Menu. The more level of embedded menus are used, the more difficult it is.

The change of direction must be detected even if the gesture goes beyond the size of the Directional Menu graphical representation.

![Direction](/images/direction.png)

The drawing generated from the user’s moves can create lines crossing or overlapping, this can lead to a misinterpretation of gesture.

![Overlap](/images/overlap.png)

There are a few scholarly articles documents available in the literature that document how directional menus can be implemented, available mostly through this Wikipedia page: [en.wikipedia.org/wiki/Pie_menu](http://en.wikipedia.org/wiki/Pie_menu)

Yet, while those directional menus interaction techniques are fairly well described in the abstract, the current known implementations of circular menus suffer segmentation issues: when users perform gestures in the fast mode, most “rounded angles” lead to gesture misinterpretations.

We want to provide a segmentation method that follows better the intent of the performer behind their gesture rather than what an exact geometric segmentation method would provide.
##Method
Our method is based on a segmentation of the movement and a comparison of angles to detect a change in direction. Each significant change of direction identifies a *gesture segment*, then restarts the recognition method to proceed from segment to segment.

![Significant Angle](/images/significant-angle.png)

We are using two constant to segment the user gesture: *Significant move* and *significant angle*. (also called thereafter *move threshold* and *angle threshold*).
###Move Threshold
The user needs to have a move threshold to register a segment.

A segment too short could detect a change of direction when the user thought it was a straight line.

![Too Short](/images/too-short-segment.png)

A segment too long can contain an undetected change of direction.

![Too Long](/images/too-long-segment.png)

In our current implementation, the distance threshold is set to 10 points/pixels = 0.36mm.
###Variable Angle Threshold
An angle threshold is a deviation from the original direction of the gesture large enough to consider it a change of direction.
The angle threshold depends of the number of items in the Directional Menu.
With 8 items, the minimum angle difference is 22.5 degrees and a perfect move is 45 degrees. We picked 30 degrees, to have a clear cut of the move (more than 22.5) and give some margin of error around the 45 degrees angle a user will try to achieve.
With 4 items, the minimum angle difference is 45 degrees and a perfect move should be at 90 degrees. We picked 65 degrees with the same reasoning.

If we wanted to use a constant angle threshold, we will have to use the angle that works for the maximum number of items. If we used the threshold angle of a 8-item in a 4-item menu, the angle threshold will trigger too soon and we will have an issue if we are going to another sub menu. See a curve gesture will trigger the menu on the top and not on the right:

![Curve 3 menu](/images/curve-3-menu.png)

###Starting Angle Tolerance
We have 2 approximations, the tolerance of the first move and the tolerance of the direction change. The first move tolerance can make it hard to detect a direction change. For instance if we are close to the left limit of the portion, a left move that seems clearly a change of direction is not taken into account.

![Starting Angle Menu](/images/starting-angle-1.png)

To solve this, we adjust the first move (or reference move) to place in the middle of the item the user directed the gesture.

![Starting Angle Gesture](/images/starting-angle-2.png)

###Linking Menus with Different Number of Items
Connecting Directional Menus with different number of items could generate gesture misinterpretation. If we link a 8-item sub menu to a 4-item parent menu, a straight gesture at the border of the portion, can be interpreted as a change of direction due to the reference move adjustment:

![Sub Menu](/images/submenu-angle-issue.png)

Users can link Directional Menu with sub menus having less or the same number of items than its parent. For instance a 8-item can include sub menu that are 4-item or 8-item, but a 4-item menu should only include sub menu with 4-item.
###Rounded Gesture
Rounded gesture works better with a 4-item Directional Menu.
In a 8-item, a rounded gesture will take the closest item from the direction change, and this is the correct behavior.

For instance if the user start straight up and curve slowly to the right the menu 1-2 will be chosen. If the user wants to select the menu 1-3 a sharper direction change gesture has to be made:

![Curve](/images/curve-1-menu.png) ![Sharp](/images/sharp-angle.png)
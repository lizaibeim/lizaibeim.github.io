---
layout: post
title: A Unity-based Motion Matching System
cover-img: /assets/img/the_bleeding_tree.png
thumbnail-img: /assets/img/the_bleeding_tree.png
gh-repo: lizaibeim/motion-matching
gh-badge: [star, fork, follow]
tags: [Motion Matching, Game Development, C#]
comments: true
---

The main objective of the project is to implement the basic functionality of a working Motion Matching system and integrate it into the game [The Bleeding Tree](https://dadiu.itch.io/the-bleeding-tree). The objectives consist of two parts; the first part is in data pre-processing phase building up the motion capture database; and the second part is in run-time phase finding out the best matching clip to play next. During the process of implementing the system, the Translate-Rotate-Scale affine matrix is used to convert the coordinates, the K Nearest Neighbour algorithm is used to narrow down the searching scope within the motion database, and the Principal Component Analysis method is used to reduce the dimensions of the comparing feature.

The [Motion Matching](https://www.gameanim.com/2016/05/03/motion-matching-ubisofts-honor/), a next-gen animation technology, is a novel method for generating high quality, smooth and complicated character movement. Rather than playing specific artificial animations, Motion Matching makes the characters in game more like performing some real-life actions which are recorded by motion capturing in reality. Motion Matching allows animator to specific the significant characteristics of animation clips which should be emphasized, and the best matching clip is selected based on the nearest neighbor search when doing the comparison among the motion capture database. Compared to the traditional animation system, Motion Matching demonstrates a simple and effective approach to modify the current animation system by directly generating new motion database. Since it is a data-driven method, to a certain extent the performance of the Motion Matching system is positively correlated with the size of the motion capture database. Apart from that, the performance of the system are bound by the CPU as well as the memory because it does the real-time computation consecutively by a very short time interval while on running. This results in the trade off among the responsiveness of the system, the accuracy of the system and the budgets on CPU, memory.  

## Motion caputre
Record the mocap data

<video width="320" height="240" controls>
  <source src="/assets/video/motion-matching-record.mp4" type="video/mp4">
Your browser does not support the video tag.
</video>

Export as usable animations  
<video width="320" height="240" controls>
  <source src="/assets/video/motion-matching-animation.mp4" type="video/mp4">
Your browser does not support the video tag.
</video>

## Motion matching
### Implementation logic
- Predicted the real-time future trajectory of the character based on the player’s input and the character’s
historical movement trajectory
- Selected predicted future trajectory’s K nearest neighboring animation clips from motion capture database
based on Frechet distance ´
- Calculated the cosine similarity between the current character’s pose and the starting pose of the nearest
neighbouring animation clips
- Linearly combined the pose cost and trajectory cost and selected the optimal animation clip to transit

### Demo
This video shows the basic locomotion with using the motion matching system. The left subtitle is the real-time matching results. The right part is the real-time controller’s input. There are two lines in the demonstration. The line which is straighter, and smoother is the predicted trajectory, and the other line is the matched trajectory. Both of these two lines are relative to the characters’ current position and rotation

<video width="320" height="240" controls>
  <source src="/assets/video/motion-matching-demo1.mp4" type="video/mp4">
Your browser does not support the video tag.
</video>

This video is to show that the system can simulate the deceleration process

<video width="320" height="240" controls>
  <source src="/assets/video/motion-matching-demo2.mp4" type="video/mp4">
Your browser does not support the video tag.
</video>


## Acknowledgement
[DADIU](http://www.dadiu.dk/)  
[Nicolas Simonsen](https://www.linkedin.com/in/nicklas-simonsen-443116201/)  
[Ubisoft Motion Matching](https://www.gameanim.com/2016/05/03/motion-matching-ubisofts-honor/)  
[Learned Motion Matching](https://montreal.ubisoft.com/en/introducing-learned-motion-matching/)  
[Deep Learning Motion](http://www.ipab.inf.ed.ac.uk/cgvu/deeplearningmotion.html)    
[Motion Fields](http://grail.cs.washington.edu/projects/motion-fields/)  
[Motion Graphs](https://research.cs.wisc.edu/graphics/Gallery/kovar.vol/MoGraphs/)  

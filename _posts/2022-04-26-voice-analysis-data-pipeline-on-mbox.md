---
layout: post
title: Voice Analysis Data Pipeline on MBOX
cover-img: /assets/img/viborg.jpg
thumbnail-img: /assets/img/raspberry.jpg
share-img: /assets/img/raspberry.jpg
gh-repo: lizaibeim/mmla-audio
gh-badge: [star, fork, follow]
tags: [Multimodal Learning Analytics, Machine Learning, Raspberry Pi]
---

This project is a lightweight voice analysis data pipeline as a part of [MBOX](https://ieeexplore.ieee.org/document/9499820)'s functionalities, which analyses different participants' conversational characteristics, indicating their engagement level during a group learning activity. We have implemented the overlap detector and the speaker recognizer. The overlap detector is trained with the [ZCR-enhanced spectrograms](https://user-images.githubusercontent.com/38242437/184141406-f36655c0-8e0f-45f3-bd58-289c1fafadb9.png) feature on the [TIMIT](https://catalog.ldc.upenn.edu/LDC93s1) corpus and the manually synthesized overlapped corpus. The speaker recognizer is pre-trained on the TIMIT corpus and then transferred-trained on the participants' recorded corpus, using the first 39 [MFCCs](https://en.wikipedia.org/wiki/Mel-frequency_cepstrum) feature.

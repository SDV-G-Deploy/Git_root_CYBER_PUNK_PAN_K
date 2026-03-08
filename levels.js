'use strict';

window.CHAIN_LAB_LEVELS = [
  {
    id: 'L01',
    shotsLimit: 1,
    targetScore: 120,
    difficultyTag: 'light',
    nodes: [
      { id: 'n1', type: 'bomb', x: 560, y: 180 },
      { id: 'n2', type: 'multiplier', x: 680, y: 260 },
      { id: 'n3', type: 'pusher', x: 760, y: 320 }
    ]
  },
  {
    id: 'L02',
    shotsLimit: 1,
    targetScore: 180,
    difficultyTag: 'light',
    nodes: [
      { id: 'n1', type: 'pusher', x: 540, y: 170 },
      { id: 'n2', type: 'bomb', x: 690, y: 210 },
      { id: 'n3', type: 'multiplier', x: 620, y: 330 },
      { id: 'n4', type: 'bomb', x: 800, y: 300 }
    ]
  },
  {
    id: 'L03',
    shotsLimit: 1,
    targetScore: 230,
    difficultyTag: 'light',
    nodes: [
      { id: 'n1', type: 'multiplier', x: 530, y: 220 },
      { id: 'n2', type: 'bomb', x: 650, y: 160 },
      { id: 'n3', type: 'pusher', x: 740, y: 230 },
      { id: 'n4', type: 'bomb', x: 830, y: 340 }
    ]
  },
  {
    id: 'L04',
    shotsLimit: 2,
    targetScore: 280,
    difficultyTag: 'light',
    nodes: [
      { id: 'n1', type: 'bomb', x: 520, y: 150 },
      { id: 'n2', type: 'multiplier', x: 620, y: 250 },
      { id: 'n3', type: 'pusher', x: 710, y: 170 },
      { id: 'n4', type: 'bomb', x: 780, y: 280 },
      { id: 'n5', type: 'multiplier', x: 860, y: 340 }
    ]
  },
  {
    id: 'L05',
    shotsLimit: 2,
    targetScore: 340,
    difficultyTag: 'medium',
    nodes: [
      { id: 'n1', type: 'pusher', x: 500, y: 220 },
      { id: 'n2', type: 'bomb', x: 610, y: 140 },
      { id: 'n3', type: 'bomb', x: 700, y: 240 },
      { id: 'n4', type: 'multiplier', x: 760, y: 340 },
      { id: 'n5', type: 'pusher', x: 860, y: 260 }
    ]
  },
  {
    id: 'L06',
    shotsLimit: 2,
    targetScore: 400,
    difficultyTag: 'medium',
    nodes: [
      { id: 'n1', type: 'multiplier', x: 520, y: 170 },
      { id: 'n2', type: 'bomb', x: 610, y: 290 },
      { id: 'n3', type: 'pusher', x: 700, y: 170 },
      { id: 'n4', type: 'bomb', x: 790, y: 250 },
      { id: 'n5', type: 'multiplier', x: 860, y: 150 },
      { id: 'n6', type: 'pusher', x: 870, y: 340 }
    ]
  },
  {
    id: 'L07',
    shotsLimit: 2,
    targetScore: 470,
    difficultyTag: 'medium',
    nodes: [
      { id: 'n1', type: 'bomb', x: 510, y: 160 },
      { id: 'n2', type: 'pusher', x: 570, y: 300 },
      { id: 'n3', type: 'multiplier', x: 670, y: 220 },
      { id: 'n4', type: 'bomb', x: 760, y: 170 },
      { id: 'n5', type: 'pusher', x: 820, y: 290 },
      { id: 'n6', type: 'multiplier', x: 890, y: 210 }
    ]
  },
  {
    id: 'L08',
    shotsLimit: 2,
    targetScore: 540,
    difficultyTag: 'medium',
    nodes: [
      { id: 'n1', type: 'multiplier', x: 520, y: 150 },
      { id: 'n2', type: 'bomb', x: 590, y: 260 },
      { id: 'n3', type: 'pusher', x: 670, y: 340 },
      { id: 'n4', type: 'bomb', x: 730, y: 200 },
      { id: 'n5', type: 'pusher', x: 820, y: 150 },
      { id: 'n6', type: 'multiplier', x: 900, y: 280 }
    ]
  },
  {
    id: 'L09',
    shotsLimit: 2,
    targetScore: 610,
    difficultyTag: 'hard',
    nodes: [
      { id: 'n1', type: 'bomb', x: 500, y: 190 },
      { id: 'n2', type: 'multiplier', x: 580, y: 120 },
      { id: 'n3', type: 'pusher', x: 640, y: 270 },
      { id: 'n4', type: 'bomb', x: 730, y: 330 },
      { id: 'n5', type: 'multiplier', x: 810, y: 210 },
      { id: 'n6', type: 'pusher', x: 890, y: 310 },
      { id: 'n7', type: 'bomb', x: 900, y: 140 }
    ]
  },
  {
    id: 'L10',
    shotsLimit: 2,
    targetScore: 680,
    difficultyTag: 'hard',
    nodes: [
      { id: 'n1', type: 'pusher', x: 500, y: 260 },
      { id: 'n2', type: 'bomb', x: 570, y: 150 },
      { id: 'n3', type: 'multiplier', x: 640, y: 320 },
      { id: 'n4', type: 'bomb', x: 720, y: 210 },
      { id: 'n5', type: 'pusher', x: 780, y: 340 },
      { id: 'n6', type: 'multiplier', x: 860, y: 180 },
      { id: 'n7', type: 'bomb', x: 910, y: 280 }
    ]
  },
  {
    id: 'L11',
    shotsLimit: 3,
    targetScore: 760,
    difficultyTag: 'hard',
    nodes: [
      { id: 'n1', type: 'multiplier', x: 500, y: 150 },
      { id: 'n2', type: 'bomb', x: 560, y: 280 },
      { id: 'n3', type: 'pusher', x: 620, y: 210 },
      { id: 'n4', type: 'bomb', x: 700, y: 130 },
      { id: 'n5', type: 'multiplier', x: 770, y: 250 },
      { id: 'n6', type: 'pusher', x: 830, y: 330 },
      { id: 'n7', type: 'bomb', x: 900, y: 200 },
      { id: 'n8', type: 'multiplier', x: 910, y: 360 }
    ]
  },
  {
    id: 'L12',
    shotsLimit: 3,
    targetScore: 850,
    difficultyTag: 'hard',
    nodes: [
      { id: 'n1', type: 'bomb', x: 490, y: 180 },
      { id: 'n2', type: 'multiplier', x: 560, y: 330 },
      { id: 'n3', type: 'pusher', x: 620, y: 120 },
      { id: 'n4', type: 'bomb', x: 690, y: 260 },
      { id: 'n5', type: 'multiplier', x: 760, y: 170 },
      { id: 'n6', type: 'pusher', x: 820, y: 300 },
      { id: 'n7', type: 'bomb', x: 880, y: 130 },
      { id: 'n8', type: 'multiplier', x: 910, y: 240 },
      { id: 'n9', type: 'pusher', x: 900, y: 360 }
    ]
  }
];

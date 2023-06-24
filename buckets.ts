const min = 60;

export const defaultBuckets = [
  5,
  10,
  15,
  20,
  25,
  30,
  35,
  40,
  45,
  50,
  55,
  60,
  65,
  70,
  75,
  80,
  85,
  90,
  95,
  100,
  110,
  120,
  130,
  140,
  150,
  160,
  170,
  180,
  190,
  200,
  220,
  240,
  260,
  280,
  5 * min,
  5 * min + 30,
  6 * min,
  6 * min + 30,
  7 * min,
  7 * min + 30,
  8 * min,
  8 * min + 30,
  9 * min,
  9 * min + 30,
  10 * min,
  11 * min,
  12 * min,
  13 * min,
  14 * min,
  15 * min,
];

/**
 * This is aiming to be precise in the 1-30 second range. Values > 1 minute only have 1 minute granularity.
 */
export const smallBuckets = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  25,
  30,
  35,
  40,
  45,
  50,
  55,
  1 * min,
  2 * min,
  3 * min,
  4 * min,
  5 * min,
  6 * min,
  7 * min,
  8 * min,
  9 * min,
  10 * min,
  11 * min,
  12 * min,
  13 * min,
  14 * min,
  15 * min,
];
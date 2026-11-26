export const XP = {
  set: 10,
  workout: 100,
  overload: 50,
  pr: 20,
  cardio: { easy: 50, moderate: 80, hard: 150 },
  stepsDay: 50,
  weekCleared: 300,
  perfectWeek: 200,
  achievement: 100,
};

export const levelReq = (level) => 300 + 150 * (level - 1);

const TITLES = [
  [1, 'Rookie'],
  [3, 'Regular'],
  [5, 'Grinder'],
  [8, 'Contender'],
  [12, 'Athlete'],
  [16, 'Veteran'],
  [20, 'Elite'],
  [25, 'Titan'],
  [30, 'Legend'],
];

export const titleFor = (level) => TITLES.filter(([l]) => level >= l).pop()[1];

export function levelInfo(total) {
  let level = 1;
  let rem = total;
  while (rem >= levelReq(level)) {
    rem -= levelReq(level);
    level += 1;
  }
  return { level, into: rem, need: levelReq(level), title: titleFor(level), total };
}

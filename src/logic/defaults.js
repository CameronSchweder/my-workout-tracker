export const CYCLE = ['upper', 'lower', 'rest', 'upper', 'lower', 'rest', 'rest'];
export const DAY_LABEL = { upper: 'Upper', lower: 'Lower', rest: 'Rest' };

const ex = (id, name, increment) => ({ id, name, increment, startWeight: null });

export const DEFAULT_EXERCISES = [
  ex('db-bench', 'DB Bench Press', 5),
  ex('cs-row', 'Chest-Supported Row', 5),
  ex('db-shoulder', 'DB Shoulder Press', 5),
  ex('lat-pulldown', 'Lat Pulldown', 5),
  ex('db-curl', 'DB Curl', 5),
  ex('tri-pushdown', 'Tricep Pushdown', 5),
  ex('hack-squat', 'Hack Squat', 10),
  ex('rdl', 'Romanian Deadlift', 10),
  ex('leg-press', 'Leg Press', 10),
  ex('leg-curl', 'Seated Leg Curl', 5),
  ex('leg-ext', 'Leg Extension', 5),
  ex('calf-raise', 'Standing Calf Raise', 10),
];

export const DEFAULT_TEMPLATES = {
  upper: ['db-bench', 'cs-row', 'db-shoulder', 'lat-pulldown', 'db-curl', 'tri-pushdown'],
  lower: ['hack-squat', 'rdl', 'leg-press', 'leg-curl', 'leg-ext', 'calf-raise'],
};

export const DEFAULT_SETTINGS = {
  weekStartDay: 1, // Monday: Mon Upper, Tue Lower, Wed Rest, Thu Upper, Fri Lower, Sat/Sun Rest
  stepGoal: 10000,
  defaultSets: 3,
  sound: true,
};

export const CARDIO_KINDS = ['Run', 'Bike', 'Rower', 'Stairs', 'Incline walk', 'HIIT', 'Swim', 'Other'];

import type { ItemChoice } from '../app/eventBus';

export interface Modifiers {
  xpMultiplier: number;
  timeExtendMultiplier: number;
  decayRateMultiplier: number;
  scoreMultiplier: number;
  cascadeStepBonus: number;
  longMatchBonusMultiplier: number;
  freeReshuffleChance: number;
  softComboReset: boolean;
  timeMaxBonus: number;
  overflowAllowance: number;
  timeFloor: number;
  freeRerollCount: number;
}

export function defaultModifiers(): Modifiers {
  return {
    xpMultiplier: 1,
    timeExtendMultiplier: 1,
    decayRateMultiplier: 1,
    scoreMultiplier: 1,
    cascadeStepBonus: 0,
    longMatchBonusMultiplier: 0,
    freeReshuffleChance: 0,
    softComboReset: false,
    timeMaxBonus: 0,
    overflowAllowance: 0,
    timeFloor: 0,
    freeRerollCount: 0,
  };
}

export interface LoadoutSlot {
  itemId: string;
  level: number;
}

interface ItemDef {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  apply: (modifiers: Modifiers, level: number) => void;
}

export const MAX_ITEM_SLOTS = 5;
export const FILLER_CHOICE_ID = 'bonus_time_filler';

export const ITEMS: Record<string, ItemDef> = {
  sugar_rush: {
    id: 'sugar_rush',
    name: 'Sugar Rush',
    description: '+8% score per level',
    maxLevel: 3,
    apply: (m, lvl) => {
      m.scoreMultiplier *= 1 + 0.08 * lvl;
    },
  },
  slow_clock: {
    id: 'slow_clock',
    name: 'Slow Clock',
    description: '-10% timer decay per level',
    maxLevel: 3,
    apply: (m, lvl) => {
      m.decayRateMultiplier *= Math.pow(0.9, lvl);
    },
  },
  bonus_seconds: {
    id: 'bonus_seconds',
    name: 'Bonus Seconds',
    description: '+15% time gained per match, per level',
    maxLevel: 3,
    apply: (m, lvl) => {
      m.timeExtendMultiplier *= 1 + 0.15 * lvl;
    },
  },
  quick_learner: {
    id: 'quick_learner',
    name: 'Quick Learner',
    description: '+12% XP gain per level',
    maxLevel: 3,
    apply: (m, lvl) => {
      m.xpMultiplier *= 1 + 0.12 * lvl;
    },
  },
  lucky_charm: {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    description: '+10% chance to instantly reshuffle a stuck board (max 30%)',
    maxLevel: 3,
    apply: (m, lvl) => {
      m.freeReshuffleChance = Math.min(0.3, m.freeReshuffleChance + 0.1 * lvl);
    },
  },
  chain_reaction: {
    id: 'chain_reaction',
    name: 'Chain Reaction',
    description: '+6 bonus points per level for every cascade step beyond the first',
    maxLevel: 3,
    apply: (m, lvl) => {
      m.cascadeStepBonus += 6 * lvl;
    },
  },
  big_bite: {
    id: 'big_bite',
    name: 'Big Bite',
    description: '+20% bonus per level on matches of 4 or more',
    maxLevel: 3,
    apply: (m, lvl) => {
      m.longMatchBonusMultiplier += 0.2 * lvl;
    },
  },
  second_wind: {
    id: 'second_wind',
    name: 'Second Wind',
    description: '+20% max timer per level',
    maxLevel: 3,
    apply: (m, lvl) => {
      m.timeMaxBonus += 0.2 * lvl;
    },
  },
  overflow: {
    id: 'overflow',
    name: 'Overflow',
    description: 'Timer can temporarily exceed max by 10% per level',
    maxLevel: 3,
    apply: (m, lvl) => {
      m.overflowAllowance += 0.1 * lvl;
    },
  },
  combo_keeper: {
    id: 'combo_keeper',
    name: 'Combo Keeper',
    description: 'Combo drops by 1 instead of resetting completely',
    maxLevel: 1,
    apply: (m) => {
      m.softComboReset = true;
    },
  },
};

const ITEM_ORDER = Object.keys(ITEMS);

export function computeModifiers(loadout: LoadoutSlot[]): Modifiers {
  const modifiers = defaultModifiers();
  for (const slot of loadout) {
    ITEMS[slot.itemId]?.apply(modifiers, slot.level);
  }

  const held = new Set(loadout.map((s) => s.itemId));
  if (held.has('sugar_rush') && held.has('chain_reaction')) {
    modifiers.cascadeStepBonus *= 1.25;
  }
  if (held.has('slow_clock') && held.has('bonus_seconds')) {
    modifiers.timeFloor = 5;
  }
  if (held.has('quick_learner') && held.has('second_wind')) {
    modifiers.freeRerollCount += 1;
  }

  return modifiers;
}

function sampleDistinct<T>(arr: T[], count: number, rng: () => number): T[] {
  const pool = arr.slice();
  const result: T[] = [];
  while (pool.length > 0 && result.length < count) {
    const idx = Math.floor(rng() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

function toUpgradeChoice(slot: LoadoutSlot): ItemChoice {
  return {
    itemId: slot.itemId,
    name: ITEMS[slot.itemId].name,
    description: ITEMS[slot.itemId].description,
    isUpgrade: true,
    nextLevel: slot.level + 1,
  };
}

function toNewChoice(itemId: string): ItemChoice {
  return {
    itemId,
    name: ITEMS[itemId].name,
    description: ITEMS[itemId].description,
    isUpgrade: false,
    nextLevel: 1,
  };
}

export function pickItemChoices(loadout: LoadoutSlot[], maxSlots: number, rng: () => number = Math.random): ItemChoice[] {
  const heldIds = new Set(loadout.map((s) => s.itemId));
  const upgradeable = loadout.filter((s) => s.level < ITEMS[s.itemId].maxLevel);

  if (loadout.length < maxSlots) {
    const availableNew = ITEM_ORDER.filter((id) => !heldIds.has(id));
    const newChoices = sampleDistinct(availableNew, Math.min(3, availableNew.length), rng).map(toNewChoice);
    if (newChoices.length >= 3 || upgradeable.length === 0) return newChoices;
    const fillCount = 3 - newChoices.length;
    const upgradeChoices = sampleDistinct(upgradeable, Math.min(fillCount, upgradeable.length), rng).map(toUpgradeChoice);
    return [...newChoices, ...upgradeChoices];
  }

  if (upgradeable.length === 0) {
    return [
      {
        itemId: FILLER_CHOICE_ID,
        name: 'Deep Breath',
        description: '+3 bonus seconds right now',
        isUpgrade: false,
        nextLevel: 1,
      },
    ];
  }
  return sampleDistinct(upgradeable, Math.min(3, upgradeable.length), rng).map(toUpgradeChoice);
}

export function applyChoiceToLoadout(loadout: LoadoutSlot[], itemId: string, maxSlots: number): LoadoutSlot[] {
  if (itemId === FILLER_CHOICE_ID) return loadout;

  const existing = loadout.find((s) => s.itemId === itemId);
  if (existing) {
    return loadout.map((s) => (s.itemId === itemId ? { ...s, level: Math.min(ITEMS[itemId].maxLevel, s.level + 1) } : s));
  }
  if (loadout.length >= maxSlots) return loadout;
  return [...loadout, { itemId, level: 1 }];
}

/* VEYL: Blood of the Serpent Kings — story data.
   Acts -> objectives -> dialogue trees. Positions match veyl_city.glb layout. */
window.VEYL_STORY = {
  title: "Blood of the Serpent Kings",
  intro: [
    ["CHRONICLE", "The sky-ring fractured on the night the canals ran black."],
    ["CHRONICLE", "The hive breached the crater. The gibbets filled. The god beneath the temple opened one eye."],
    ["CHRONICLE", "Kael of the Gate, exiled seven years for refusing a sacrifice, walks home through the south gate — sword, brand, and nothing left to lose."]
  ],
  acts: [
    { id: "gates", title: "ACT I — THE GATES",
      sub: "Return through blood and iron.",
      objective: "Speak with Guard Dren at the south gate, then follow the avenue north." },
    { id: "avenue", title: "ACT II — THE AVENUE",
      sub: "The market feeds the hive.",
      objective: "Find Sella in the market. Cleanse the hive drones (3). Then climb to Priest Issa in the court." },
    { id: "sanctuary", title: "ACT III — THE SANCTUARY",
      sub: "What bleeds beneath the stone.",
      objective: "Enter the hall, face the Bleeding Serpent, and CHOOSE." }
  ],
  npc: {
    dren: {
      name: "DREN, GATE GUARD", pos: [6, 0, 132],
      tree: [
        ["DREN", "Halt. Gods below — Kael? Kael of the Gate? We burned your name off the roll seven years back."],
        ["KAEL", "Then write it back in blood, Dren. What's happened here?"],
        ["DREN", "Everything, all at once. Hive-chitin in the crater, drones in the market, and the temple stairs... they run red, and nobody's cleaning them."],
        ["DREN", "If you've come home to die, do it usefully: follow the avenue north. Sella's still breathing, last I heard. Go."]
      ]
    },
    sella: {
      name: "SELLA, MARKET WIDOW", pos: [38, 0, 66],
      tree: [
        ["SELLA", "Buy something or bleed somewhere else — oh. Oh no. You're one of the Gate's."],
        ["KAEL", "Dren sent me. Drones in my market, Sella?"],
        ["SELLA", "YOUR market? I buried my husband under it! They nest in the stalls, they take the caged for... whatever hives do. Three of them. Burn them, knight."],
        ["SELLA", "Then climb. Issa waits in the court, and the temple... the temple is awake."]
      ]
    },
    issa: {
      name: "ISSA, LAST PRIEST", pos: [-8, 0, 30],
      tree: [
        ["ISSA", "The exile kneels for no altar, yet here you stand in the court of knives."],
        ["KAEL", "Seven years I carried your gods' refusal. Is the Serpent truly waking?"],
        ["ISSA", "It never slept, child. We only stopped listening. It dreams in blood now, and its dreams are hatching."],
        ["ISSA", "Take my brand — strike with ember. Go down the throat of the hall. When it offers you the crown... remember the gate you refused to burn."]
      ]
    },
    serpent: {
      name: "THE BLEEDING SERPENT",
      tree: [
        ["SERPENT", "LITTLE KNIGHT. LITTLE REFUSAL. I REMEMBER YOU."],
        ["KAEL", "I refused you once. I'll refuse you louder."],
        ["SERPENT", "THEN KNEEL, OR BURN. OR — TAKE THE CROWN, AND RULE THE BLEEDING. CHOOSE."]
      ],
      choices: [
        { label: "⛓ BIND — take the crown", ending: "bind" },
        { label: "⚔ BREAK — shatter the crown", ending: "break" }
      ]
    }
  },
  endings: {
    bind: [
      ["CHRONICLE", "Kael takes the crown. The canals rise. The ring seals."],
      ["CHRONICLE", "Veyl has a king again — and the king has a god inside him."],
      ["THE END?", "THE BLEEDING REIGN — thank you for playing VEYL."]
    ],
    break: [
      ["CHRONICLE", "The crown shatters. The god screams with seven years of refused sacrifices."],
      ["CHRONICLE", "Dawn comes up over the ash like an apology. Kael walks out the south gate — free, at last."],
      ["THE END?", "THE DAWN REFUSAL — thank you for playing VEYL."]
    ]
  },
  toasts: {
    brand: "Ember brand taken — ATTACK unlocked (click / ⚔ button).",
    droneDown: "Drone destroyed.",
    marketClear: "The market is quiet. Climb to the court.",
    huskDown: "Temple husk destroyed.",
    hallOpen: "The hall drinks the light. Go down."
  }
};

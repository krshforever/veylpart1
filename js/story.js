/* VEYL: Blood of the Serpent Kings — story data (v2: clarity pass).
   Every beat answers: WHO am I, WHERE do I go, WHAT do I do.
   Positions match veyl_city.glb layout. Marker targets guide the eye. */
window.VEYL_STORY = {
  title: "Blood of the Serpent Kings",
  intro: [
    ["CHRONICLE", "Seven years ago, gate-knight Kael refused to burn twelve villagers as sacrifice. The temple exiled him the same night."],
    ["CHRONICLE", "Three nights ago the sky-ring fractured. The canals ran black. Something hatched in the market."],
    ["CHRONICLE", "Now Kael walks home through the south gate — sword, brand, and nothing left to lose."],
    ["KAEL", "Dren still holds the gate, if he's alive. North, through the walls. Move."]
  ],
  acts: [
    { id: "gates", title: "ACT I — THE GATES",
      sub: "Find Guard Dren at the south gate.",
      objective: "Follow the road north to the gatehouse. Speak with Dren (gold marker)." },
    { id: "avenue", title: "ACT II — THE AVENUE",
      sub: "The market feeds the hive.",
      objective: "Find Sella's shop in the market square. Then destroy the hive drones." },
    { id: "sanctuary", title: "ACT III — THE SANCTUARY",
      sub: "Go down the throat of the hall.",
      objective: "Climb the blood stairs, cross the hall, face the Bleeding Serpent — and CHOOSE." }
  ],
  npc: {
    dren: {
      name: "DREN, GATE GUARD", pos: [6, 0, 132],
      tree: [
        ["DREN", "Halt — gods below. Kael? KAEL OF THE GATE? We burned your name off the roll seven years back."],
        ["KAEL", "Then write it back in blood, Dren. The ring is broken and the canals stink of rot. Report."],
        ["DREN", "Short version: hive-chitin breached the west crater, drones nest in the market stalls, and the temple stairs run red with nobody cleaning them."],
        ["DREN", "Sella's shop still stands — east side of the market square, lantern over the door. She'll point you at the nest. Go north, exile. Try not to die famously."]
      ]
    },
    sella: {
      name: "SELLA, MARKET WIDOW", pos: [38, 0, 66],
      tree: [
        ["SELLA", "Buy something or bleed elsewhere — oh. Oh no. A Gate knight. In MY square."],
        ["KAEL", "Dren sent me. Your stalls are nesting drones, Sella. Show me."],
        ["SELLA", "Three of them, fat on my winter stores! I buried my husband under those flagstones and I'll not feed his grave to bugs. Burn the nest, knight — all three."],
        ["SELLA", "After: climb past the pylon to Priest Issa in the court. And knight... whatever the temple offers you up there — remember what it cost the twelve."]
      ]
    },
    issa: {
      name: "ISSA, LAST PRIEST", pos: [-8, 0, 30],
      tree: [
        ["ISSA", "The exile kneels for no altar — yet here you stand in the court of knives. The market is quiet. You did that."],
        ["KAEL", "The drones are ash. Now tell me true, priest: is the Serpent waking?"],
        ["ISSA", "It never slept, child. We only stopped listening. It dreams in blood now, and its dreams are hatching."],
        ["ISSA", "Kneel — take my brand. Your steel will carry ember now. Go up the blood stairs, through the ember veil, and when it offers you the crown... remember the twelve."]
      ]
    },
    serpent: {
      name: "THE BLEEDING SERPENT",
      tree: [
        ["SERPENT", "LITTLE KNIGHT. LITTLE REFUSAL. SEVEN YEARS I TASTED YOUR NAME."],
        ["KAEL", "I refused you once, in front of the whole court. I'll refuse you louder, in front of your god-corpse."],
        ["SERPENT", "THEN CHOOSE, AND BE DAMNED EITHER WAY. KNEEL AND RULE THE BLEEDING — OR STRIKE, AND UNMAKE A GOD."]
      ],
      choices: [
        { label: "⛓ BIND — kneel, take the crown", ending: "bind" },
        { label: "⚔ BREAK — shatter the crown", ending: "break" }
      ]
    }
  },
  endings: {
    bind: [
      ["CHRONICLE", "Kael kneels. The crown fits like a confession."],
      ["CHRONICLE", "The canals rise. The ring seals. Veyl has a king again — and the king has a god inside him."],
      ["THE END?", "THE BLEEDING REIGN — thank you for playing VEYL."]
    ],
    break: [
      ["CHRONICLE", "Kael drives the brand through the crown. The god screams with seven years of refused sacrifices."],
      ["CHRONICLE", "Dawn comes up over the ash like an apology. Kael walks out the south gate — free, at last."],
      ["THE END?", "THE DAWN REFUSAL — thank you for playing VEYL."]
    ]
  },
  toasts: {
    brand: "Ember brand taken — your strikes burn twice as deep.",
    droneDown: "Drone destroyed.",
    marketClear: "The market is quiet. Climb past the pylon to Priest Issa (gold marker).",
    huskDown: "Temple husk destroyed.",
    hallOpen: "The hall drinks the light. Go down."
  },
  /* marker beacon targets per stage: [x, z, label] */
  markers: {
    dren: [6, 132], sella: [26, 84], market: [40, 68],
    issa: [-8, 30], stairs: [0, -14], serpent: [0, -55]
  }
};

/* VEYL: Blood of the Serpent Kings — story v3 (grand threat).
   Beats: [p] short, [P] long. Choices set flags; the dead are remembered.
   THE TRUTH: the fractured ring is an EGG (the Hatching). The hive are its
   antibodies. The Bleeding Serpent is the WARDEN, bleeding itself to keep it
   dormant. Issa fed it villagers — the twelve Kael refused to burn. */
window.VEYL_STORY = {
  title: "Blood of the Serpent Kings",
  intro: [
    ["CHRONICLE", "Seven years ago, gate-knight Kael refused to burn twelve villagers as sacrifice. [p] The temple exiled him that same night."],
    ["CHRONICLE", "Three nights ago the sky-ring fractured. [P] The canals ran black. Something in the market started nesting."],
    ["CHRONICLE", "Now Kael walks home through the south gate — [p] sword, brand, and nothing left to lose."],
    ["KAEL", "Dren holds the gate. If he's breathing. [p] North. Move."]
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
      objective: "Climb the blood stairs, cross the hall, face what bleeds — and CHOOSE." }
  ],
  npc: {
    dren: {
      name: "DREN, GATE GUARD", pos: [6, 0, 132],
      tree: [
        ["DREN", "Halt — [p] gods below. Kael? [P] KAEL OF THE GATE?"],
        ["DREN", "We burned your name off the roll seven years back. State your business or bleed on the road."],
        { choice: [
          { label: "“My business is the gate I held. Let me pass, old friend.”", set: { tone: "warm" }, goto: "dren_main" },
          { label: "“Out of my way, toll-keeper. The city is dying.”", set: { tone: "cold" }, goto: "dren_main" }
        ]},
        { label: "dren_main" },
        ["KAEL", "The ring is broken and the canals stink of rot. Report, guardsman."],
        ["DREN", "Short version: chitin breached the west crater. Drones nest in the market stalls. [p] And the temple stairs run red — nobody's cleaning them."],
        { if: "tone", then: [], else: [] },
        ["DREN", "Sella's shop still stands, east market — lantern over the door. She'll point you at the nest."],
        ["KAEL", "And the toll, Dren? Seven years of interest?"],
        ["DREN", "The toll is this: [P] come back alive, and I'll deny you were ever here."]
      ],
      ambush: [
        ["DREN", "CONTACT — hive scout, low over the wall! [p] KAEL, DOWN!"],
        ["KAEL", "Steel out! Stay behind me!"],
        ["DREN", "Argh — [p] it got under the plate — [P] finish it, exile. FINISH IT."]
      ],
      death: [
        ["DREN", "Heh. [p] Gate... still held. [P] Tell the roll-keeper... Dren died facing north."],
        ["KAEL", "Rest, old friend. [P] The gate is mine now."]
      ]
    },
    sella: {
      name: "SELLA, MARKET WIDOW", pos: [38, 0, 66],
      tree: [
        ["SELLA", "Buy something or bleed elsewhere — [p] oh. Oh no. A Gate knight. In MY square."],
        ["KAEL", "Dren's dead, Sella. A scout took him at the gate. [P] The market is next."],
        ["SELLA", "Then the city eats its guardians first, same as always. [p] What do you want, exile?"],
        { choice: [
          { label: "“Your drones. Point me at the nest.”", goto: "sella_nest" },
          { label: "“Your husband. Dren said you buried him under the square.”", set: { asked_husband: true }, goto: "sella_husband" }
        ]},
        { label: "sella_husband" },
        ["SELLA", "...Maren. [P] They didn't let me bury him, knight. The hive took him off the stalls a month back. His ring's probably in some drone's gullet by now."],
        ["KAEL", "If I find it, I'll bring it home. [p] Now the nest."],
        { label: "sella_nest" },
        ["SELLA", "Three of them, fat on my winter stores. And something bigger underneath — [p] it SPEAKS, knight. Through the small ones. With a voice like wet stone."],
        ["KAEL", "Then I'll cut out its tongue. Stay inside the shop. Bar the lantern door."],
        ["SELLA", "Come back breathing, Gate knight. [p] You're the only customer I've got left."]
      ],
      broodmother: [
        ["???", "LITTLE KNIGHT. [P] WE TASTED YOUR FRIEND AT THE GATE. WE ARE STILL HUNGRY."],
        ["KAEL", "It talks. [p] Good. I like knowing what I'm killing."],
        { choice: [
          { label: "“Take me instead. Let the square go.”", set: { mercy: true }, goto: "spare" },
          { label: "Burn it. No terms.", goto: "burn" }
        ]},
        { label: "spare" },
        ["???", "...STRANGE MEAT. [P] WE WILL REMEMBER MERCY. THE MOTHER WILL REMEMBER."],
        { jump: "brood_end" },
        { label: "burn" },
        ["???", "THEN BLEED WITH YOUR CITY, LITTLE KNIGHT."],
        { label: "brood_end" },
        ["KAEL", "Come on, then. [p] All of you."]
      ]
    },
    issa: {
      name: "ISSA, LAST PRIEST", pos: [-8, 0, 30],
      tree: [
        ["ISSA", "The exile kneels for no altar — [p] yet here you stand in the court of knives."],
        ["KAEL", "The market is ash. Talk, priest. What woke under the temple?"],
        ["ISSA", "...Nothing woke, child. [P] Something is being BORN."],
        ["ISSA", "The ring above us is no crown. It is a SHELL. And it is hatching."],
        ["KAEL", "Then what bleeds in the sanctuary? What have you been feeding?"],
        ["ISSA", "The warden. [p] The Serpent bleeds itself to keep the shell dormant — a little blood, every day, for a hundred years."],
        ["ISSA", "And when the village tithes ran thin... [P] I fed it the twelve. Your twelve, Kael."],
        { choice: [
          { label: "“You butcher. My exile was righteous — and so is this.” [draw steel]", set: { tone: "cold" }, goto: "issa_brand" },
          { label: "“Then we end it together. Give me the brand.”", set: { tone: "warm" }, goto: "issa_brand" }
        ]},
        { label: "issa_brand" },
        ["ISSA", "Kneel. [p] The brand will let your steel wound it — warden or brood, both bleed to ember now."],
        ["ISSA", "Go up the blood stairs. Through the veil. [P] And Kael — when it offers you the crown... remember that I am already damned, so you don't have to be."]
      ],
      death: [
        ["ISSA", "The door only opens for the dying, [p] it seems. How... traditional."],
        ["KAEL", "Issa — don't you DARE —"],
        ["ISSA", "The brand is lit. [P] Go down the throat of the hall, child. End the bleeding... one way... or another."]
      ]
    },
    serpent: {
      name: "THE WARDEN SERPENT",
      tree: [
        ["SERPENT", "LITTLE REFUSAL. [P] YOU CARRY THE SMELL OF MY BLOOD ON YOUR STEEL."],
        { if: "mercy", then: [
          ["SERPENT", "THE BROOD WHISPERS OF MERCY. [p] IT HAS NEVER TASTED MERCY BEFORE. IT IS... CONFUSED."]
        ], else: [] },
        ["KAEL", "A hundred years of blood. Villages for tithes. The twelve. [p] Was any of it worth it, warden?"],
        ["SERPENT", "COUNT THE DAWNS, LITTLE KNIGHT. [P] EVERY ONE WAS PURCHASED. NOW THE SHELL THINS, AND I AM EMPTY."],
        ["SERPENT", "SO CHOOSE, AND BE DAMNED IN WAYS ONLY GODS GET TO CHOOSE."],
        { choice: [
          { label: "⛓ BIND — kneel, take the crown, feed it forever", set: {}, goto: null, cb: "bind" },
          { label: "⚔ BREAK — drive the brand through its heart", set: {}, goto: null, cb: "break" },
          { label: "✋ SEVER — cut the brood from the shell (mercy required)", set: {}, goto: null, cb: "sever", need: "mercy" }
        ]}
      ]
    }
  },
  endings: {
    bind: [
      ["CHRONICLE", "Kael kneels. [P] The crown fits like a confession."],
      ["CHRONICLE", "The canals rise. The ring seals. The Hatching waits another hundred years — [p] fed by a king who never sleeps."],
      ["THE END?", "THE BLEEDING REIGN — thank you for playing VEYL."]
    ],
    break: [
      ["CHRONICLE", "The brand goes through its heart. [P] The warden smiles."],
      ["CHRONICLE", "Above, the shell cracks wide — [P] and something with too many eyes looks down at the little bleeding city."],
      ["CHRONICLE", "Kael understands, too late, what the blood was FOR."],
      ["THE END?", "THE HATCHING — thank you for playing VEYL."]
    ],
    sever: [
      ["CHRONICLE", "Kael turns from the crown — [p] and cuts the brood-tendrils from the shell instead. The hive SCREAMS in a voice like wet stone."],
      ["CHRONICLE", "The warden exhales a century of held breath... [P] and sleeps. Truly sleeps."],
      ["CHRONICLE", "Dawn comes up over the ash. In the market square, a widow hangs a lantern in an empty shop — [p] and waits for customers who will never know her name."],
      ["THE END?", "THE QUIET DAWN — thank you for playing VEYL."]
    ]
  },
  toasts: {
    brand: "Ember brand taken — your strikes burn twice as deep.",
    droneDown: "Drone destroyed.",
    marketClear: "The market is quiet. Climb past the pylon to Priest Issa (gold marker).",
    huskDown: "Temple husk destroyed.",
    hallOpen: "The hall drinks the light. Go down.",
    sellaFalls: "A scream from the market — Sella's lantern goes dark.",
    ringFound: "Maren's ring. Sella should have this... if she still breathes."
  },
  markers: {
    dren: [6, 132], sella: [26, 84], market: [40, 68],
    issa: [-8, 30], stairs: [0, -14], serpent: [0, -55]
  }
};

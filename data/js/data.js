// ==========================================
// NEON SURVIVOR - MASTER DATA & DATABASE
// 17 Enemies, 6 Bosses, 15 Weapons, 15 Evolutions,
// 10 Passives, 15 Power-ups, 8 Characters, 6 Maps,
// 5 Game Modes, 50 Achievements, i18n
// ==========================================
'use strict';

window.GAME_DATA = {
  // ----------------------------------------------------
  // 17 ENEMY TYPES
  // ----------------------------------------------------
  ENEMIES: {
    grunt:      { r: 12, hp: 14,  spd: 75,  dmg: 8,  xp: 1, col: '#ff3366', shape: 'tri', desc: 'Standard swarm fighter' },
    runner:     { r: 9,  hp: 9,   spd: 135, dmg: 6,  xp: 1, col: '#ffd23f', shape: 'tri', desc: 'Fast aggressive rusher' },
    tank:       { r: 24, hp: 95,  spd: 45,  dmg: 16, xp: 5, col: '#b44dff', shape: 'sq',  desc: 'Heavily armored bruiser' },
    shooter:    { r: 13, hp: 28,  spd: 65,  dmg: 9,  xp: 3, col: '#3dfcff', shape: 'dia', desc: 'Fires ranged plasma bolts' },
    splitter:   { r: 18, hp: 38,  spd: 68,  dmg: 10, xp: 3, col: '#5dff6a', shape: 'hex', desc: 'Splits into 2 minion splitters' },
    mini:       { r: 9,  hp: 9,   spd: 105, dmg: 5,  xp: 1, col: '#5dff6a', shape: 'hex', desc: 'Mini spawn from splitter' },
    dasher:     { r: 14, hp: 32,  spd: 60,  dmg: 14, xp: 3, col: '#ff0055', shape: 'tri', desc: 'Charges up and dashes forward with speed' },
    shielder:   { r: 20, hp: 75,  spd: 52,  dmg: 12, xp: 4, col: '#00e5ff', shape: 'oct', desc: 'Blocks frontal projectiles with a forcefield' },
    teleporter: { r: 14, hp: 42,  spd: 50,  dmg: 12, xp: 4, col: '#d500f9', shape: 'dia', desc: 'Teleports in bursts of static toward player' },
    summoner:   { r: 22, hp: 85,  spd: 40,  dmg: 10, xp: 5, col: '#ff6d00', shape: 'hex', desc: 'Stays at distance and spawns runner drones' },
    sniper:     { r: 15, hp: 35,  spd: 48,  dmg: 22, xp: 4, col: '#ff1744', shape: 'dia', desc: 'Aims with long laser line and fires high-velocity shot' },
    mortar:     { r: 20, hp: 65,  spd: 42,  dmg: 18, xp: 5, col: '#aeea00', shape: 'sq',  desc: 'Lobs explosive shells with area danger indicators' },
    orbiter:    { r: 11, hp: 22,  spd: 120, dmg: 8,  xp: 2, col: '#76ff03', shape: 'tri', desc: 'Spirals around the player at high speed' },
    phantom:    { r: 13, hp: 26,  spd: 80,  dmg: 11, xp: 3, col: '#651fff', shape: 'tri', desc: 'Cloaks and becomes nearly invisible until close' },
    leech:      { r: 16, hp: 48,  spd: 62,  dmg: 10, xp: 4, col: '#f50057', shape: 'hex', desc: 'Connects energy tether that slows player and drains HP' },
    repulsor:   { r: 19, hp: 60,  spd: 55,  dmg: 9,  xp: 4, col: '#00b0ff', shape: 'oct', desc: 'Repels player bullets and shoves other mobs forward' },
    kamikaze:   { r: 12, hp: 18,  spd: 110, dmg: 28, xp: 2, col: '#ff3d00', shape: 'tri', desc: 'Beeps red and detonates in massive explosion on touch' }
  },

  // ----------------------------------------------------
  // 6 UNIQUE BOSSES (Every 5 minutes, finale at 30 min)
  // ----------------------------------------------------
  BOSSES: {
    scorpio: {
      time: 300, // 5 min
      name: 'Cyber-Scorpio',
      r: 45, hp: 2200, spd: 65, dmg: 26, col: '#ff0055',
      phases: 2,
      desc: 'Venom tail plasma bursts & charging stings'
    },
    leviathan: {
      time: 600, // 10 min
      name: 'Neon-Leviathan',
      r: 52, hp: 5500, spd: 58, dmg: 32, col: '#00e5ff',
      phases: 2,
      desc: 'Massive segmented serpent sweeping across the arena'
    },
    titan: {
      time: 900, // 15 min
      name: 'Mecha-Titan',
      r: 58, hp: 11000, spd: 50, dmg: 38, col: '#b44dff',
      phases: 3,
      desc: 'Rotating laser barriers, missile barrages & shockwaves'
    },
    vortex_eye: {
      time: 1200, // 20 min
      name: 'Vortex-Core',
      r: 50, hp: 18000, spd: 46, dmg: 42, col: '#651fff',
      phases: 3,
      desc: 'Gravitational anomaly pulling players into bullet rings'
    },
    chronos: {
      time: 1500, // 25 min
      name: 'Chronos-Sentinel',
      r: 54, hp: 28000, spd: 62, dmg: 48, col: '#ffd23f',
      phases: 3,
      desc: 'Time-distortion master, blink teleportation & clone mirages'
    },
    arch_sentinel: {
      time: 1800, // 30 min Finale!
      name: 'The Arch-Sentinel',
      r: 66, hp: 45000, spd: 55, dmg: 55, col: '#ffffff',
      phases: 4,
      desc: 'The ultimate guardian of the Neon Matrix with 4 devastating phases'
    }
  },

  // ----------------------------------------------------
  // 15 WEAPONS
  // ----------------------------------------------------
  WEAPONS: {
    blaster: {
      icon: '🔫', max: 8, requiredPassive: 'multi', evolution: 'hyper_gatling',
      name: { de: 'Blaster', en: 'Blaster' },
      desc: { de: l => `+Schaden & Feuerrate${l % 3 === 0 ? ', +1 Projektil' : ''}${l % 4 === 0 ? ', +1 Durchschlag' : ''}`, en: l => `+Damage & Fire Rate${l % 3 === 0 ? ', +1 Projectile' : ''}${l % 4 === 0 ? ', +1 Pierce' : ''}` }
    },
    orbit: {
      icon: '🌀', max: 7, requiredPassive: 'armor', evolution: 'singularity_blades',
      name: { de: 'Orbit-Klingen', en: 'Orbit Blades' },
      desc: { de: l => l === 1 ? '2 Energieklingen kreisen um dich' : '+1 Klinge, +Schaden, +Reichweite', en: l => l === 1 ? '2 energy blades circle around you' : '+1 Blade, +Damage, +Radius' }
    },
    nova: {
      icon: '💥', max: 7, requiredPassive: 'speed', evolution: 'supernova',
      name: { de: 'Nova-Puls', en: 'Nova Pulse' },
      desc: { de: l => l === 1 ? 'Periodische Schockwelle, stößt Gegner zurück' : '+Radius, +Schaden, häufiger', en: l => l === 1 ? 'Periodic shockwave knocking enemies back' : '+Radius, +Damage, faster' }
    },
    bolt: {
      icon: '⚡', max: 7, requiredPassive: 'crit', evolution: 'thors_arc',
      name: { de: 'Kettenblitz', en: 'Chain Lightning' },
      desc: { de: l => l === 1 ? 'Blitz springt zwischen Feinden' : '+1 Sprung, +Schaden, schneller', en: l => l === 1 ? 'Electric bolt leaping between targets' : '+1 Jump, +Damage, faster' }
    },
    missile: {
      icon: '🚀', max: 7, requiredPassive: 'rate', evolution: 'armageddon',
      name: { de: 'Raketen', en: 'Homing Missiles' },
      desc: { de: l => l === 1 ? 'Zielsuchende Sprengraketen' : '+Raketen, +Explosion, +Schaden', en: l => l === 1 ? 'Heat-seeking explosive rockets' : '+Missiles, +AoE, +Damage' }
    },
    laser: {
      icon: '🔦', max: 7, requiredPassive: 'hp', evolution: 'photonic_beam',
      name: { de: 'Photonen-Laser', en: 'Photon Laser' },
      desc: { de: l => l === 1 ? 'Durchdringender kontinuierlicher Laserstrahl' : '+Breite, +Schaden, längere Dauer', en: l => l === 1 ? 'Continuous penetrating beam of light' : '+Width, +Damage, longer duration' }
    },
    vortex: {
      icon: '🌌', max: 7, requiredPassive: 'magnet', evolution: 'event_horizon',
      name: { de: 'Gravitations-Vortex', en: 'Graviton Vortex' },
      desc: { de: l => l === 1 ? 'Saugt Gegner in eine Singularität' : '+Radius, +Saugkraft, +Schaden', en: l => l === 1 ? 'Pulls enemies into a crushing singularity' : '+Radius, +Pull force, +Damage' }
    },
    drones: {
      icon: '🛸', max: 7, requiredPassive: 'regen', evolution: 'aegis_swarm',
      name: { de: 'Cyber-Drohnen', en: 'Cyber Drones' },
      desc: { de: l => l === 1 ? 'Begleitdrohnen patrouillieren und feuern' : '+1 Drohne, +Feuerrate, +Schaden', en: l => l === 1 ? 'Companion drones patrol and fire at foes' : '+1 Drone, +Fire Rate, +Damage' }
    },
    mines: {
      icon: '💣', max: 7, requiredPassive: 'dmg', evolution: 'thermo_mines',
      name: { de: 'Plasma-Minen', en: 'Plasma Mines' },
      desc: { de: l => l === 1 ? 'Hinterlässt hochexplosive Minen' : '+Minen, +Schaden, +Radius', en: l => l === 1 ? 'Drops explosive proximity mines behind you' : '+Mines, +Damage, +Radius' }
    },
    flak: {
      icon: '🛡️', max: 7, requiredPassive: 'rate', evolution: 'hellstorm_flak',
      name: { de: 'Flak-Schrot', en: 'Flak Cannon' },
      desc: { de: l => l === 1 ? 'Fächerförmige Schrot-Salve auf kurze Distanz' : '+Schrotkugeln, +Durchschlag, +Schaden', en: l => l === 1 ? 'Fires heavy spread of shrapnel pellets' : '+Pellets, +Pierce, +Damage' }
    },
    cryo: {
      icon: '❄️', max: 7, requiredPassive: 'armor', evolution: 'absolute_zero',
      name: { de: 'Cryo-Splitter', en: 'Cryo Shards' },
      desc: { de: l => l === 1 ? 'Eisnadeln verlangsamen und schädigen Gegner' : '+Splitter, +Verlangsamung, +Schaden', en: l => l === 1 ? 'Frost needles slow down and damage targets' : '+Shards, +Slow effect, +Damage' }
    },
    saw: {
      icon: '⚙️', max: 7, requiredPassive: 'speed', evolution: 'plasma_reaper',
      name: { de: 'Plasma-Säge', en: 'Plasma Saw' },
      desc: { de: l => l === 1 ? 'Riesige Sägeblätter prallen an Rändern ab' : '+1 Sägeblatt, +Tempo, +Schaden', en: l => l === 1 ? 'Bouncing blades tearing through hordes' : '+1 Saw blade, +Speed, +Damage' }
    },
    flamethrower: {
      icon: '🔥', max: 7, requiredPassive: 'multi', evolution: 'hellfire_dragon',
      name: { de: 'Plasma-Werfer', en: 'Plasma Caster' },
      desc: { de: l => l === 1 ? 'Kontinuierlicher Feuerstrahl in Blickrichtung' : '+Reichweite, +Schaden, +Kegelbreite', en: l => l === 1 ? 'Continuous stream of liquid fire in facing direction' : '+Range, +Damage, +Cone width' }
    },
    radiant_glaive: {
      icon: '⭐', max: 7, requiredPassive: 'crit', evolution: 'star_scythe',
      name: { de: 'Sternen-Glaive', en: 'Radiant Glaive' },
      desc: { de: l => l === 1 ? 'Lichtbumerang, der durch Gegner fliegt und zurückkehrt' : '+1 Glaive, +Flugtempo, +Schaden', en: l => l === 1 ? 'Boomerang blade slicing and returning' : '+1 Glaive, +Flight speed, +Damage' }
    },
    emp: {
      icon: '⚡', max: 7, requiredPassive: 'magnet', evolution: 'chronos_matrix',
      name: { de: 'EMP-Emitter', en: 'EMP Emitter' },
      desc: { de: l => l === 1 ? 'Zerstört feindliche Projektile und lähmt Mobs' : '+Radius, +Lähmungsdauer, häufiger', en: l => l === 1 ? 'Destroys enemy bullets and stuns nearby targets' : '+Radius, +Stun duration, faster' }
    }
  },

  // ----------------------------------------------------
  // 15 WEAPON EVOLUTIONS (Weapon Lv Max + Passive Lv >= 1)
  // ----------------------------------------------------
  EVOLUTIONS: {
    hyper_gatling: {
      icon: '🌟', baseWeapon: 'blaster', reqPassive: 'multi',
      name: { de: 'Hyper-Gatling', en: 'Hyper Gatling' },
      desc: { de: 'Extremes Schnellfeuer mit 6 explosive Plasmageschossen', en: 'Extreme rapid fire with 6 explosive plasma bolts' }
    },
    singularity_blades: {
      icon: '🌀', baseWeapon: 'orbit', reqPassive: 'armor',
      name: { de: 'Singularitäts-Klingen', en: 'Singularity Blades' },
      desc: { de: 'Gigantische Energieklingen, die Schüsse abwehren & Feinde ansaugen', en: 'Massive blades blocking projectiles & sucking foes in' }
    },
    supernova: {
      icon: '☀️', baseWeapon: 'nova', reqPassive: 'speed',
      name: { de: 'Supernova-Kollaps', en: 'Supernova Collapse' },
      desc: { de: 'Verheerende 3-fache Schockwelle mit brennendem Nachbeben', en: 'Devastating triple shockwave with burning afterglow' }
    },
    thors_arc: {
      icon: '⚡', baseWeapon: 'bolt', reqPassive: 'crit',
      name: { de: "Götterdämmerung (Thor's Arc)", en: "Thor's Arc" },
      desc: { de: 'Permanenter Blitzsturm über den gesamten Bildschirm (100% Krit)', en: 'Screen-wide continuous lightning storm (100% Crits)' }
    },
    armageddon: {
      icon: '☄️', baseWeapon: 'missile', reqPassive: 'rate',
      name: { de: 'Armageddon-Batterie', en: 'Armageddon Battery' },
      desc: { de: 'Dauerfeuer thermonuklearer zielsuchender Cluster-Raketen', en: 'Continuous storm of thermonuclear homing cluster missiles' }
    },
    photonic_beam: {
      icon: '🔆', baseWeapon: 'laser', reqPassive: 'hp',
      name: { de: 'Photonen-Obliterator', en: 'Photonic Obliterator' },
      desc: { de: 'Riesiger 360° rotierender Todeslaser, der alles vernichtet', en: 'Massive 360-degree rotating death laser vaporizing all' }
    },
    event_horizon: {
      icon: '🕳️', baseWeapon: 'vortex', reqPassive: 'magnet',
      name: { de: 'Event-Horizon', en: 'Event Horizon' },
      desc: { de: 'Permanentes Schwarzes Loch; saugt alle Gems & Gegner auf', en: 'Permanent black hole absorbing all gems and enemies' }
    },
    aegis_swarm: {
      icon: '🛸', baseWeapon: 'drones', reqPassive: 'regen',
      name: { de: 'Aegis-Schwarm', en: 'Aegis Swarm' },
      desc: { de: '6 Drohnen heilen dich, fangen Schüsse ab und feuern Laser', en: '6 drones heal you, absorb bullets and fire laser beams' }
    },
    thermo_mines: {
      icon: '☢️', baseWeapon: 'mines', reqPassive: 'dmg',
      name: { de: 'Thermonukleare Minen', en: 'Thermonuclear Mines' },
      desc: { de: 'Kettenreaktions-Minen, die riesige Plasmapools hinterlassen', en: 'Chain-reaction mines leaving vast burning plasma pools' }
    },
    hellstorm_flak: {
      icon: '💥', baseWeapon: 'flak', reqPassive: 'rate',
      name: { de: 'Höllensturm-Flak', en: 'Hellstorm Flak' },
      desc: { de: 'Feuert 18 Schrotgeschosse, die beim Aufprall in Schrapnelle zerbersten', en: 'Fires 18 heavy flak rounds bursting into micro-shrapnel' }
    },
    absolute_zero: {
      icon: '🧊', baseWeapon: 'cryo', reqPassive: 'armor',
      name: { de: 'Absoluter Nullpunkt', en: 'Absolute Zero' },
      desc: { de: 'Friert Feinde vollständig ein; gefrorene Feinde explodieren beim Tod', en: 'Completely freezes foes; frozen enemies shatter on death' }
    },
    plasma_reaper: {
      icon: '🗡️', baseWeapon: 'saw', reqPassive: 'speed',
      name: { de: 'Plasma-Reaper', en: 'Plasma Reaper' },
      desc: { de: '4 riesige Klingen schneiden dauerhaft durch die Arena', en: '4 hyper-saws ricochet across the entire screen forever' }
    },
    hellfire_dragon: {
      icon: '🐉', baseWeapon: 'flamethrower', reqPassive: 'multi',
      name: { de: 'Höllenfeuer-Drache', en: 'Hellfire Dragon' },
      desc: { de: 'Blaues Fusionsfeuer verbrennt alles vor dir zu atomarer Asche', en: 'Blue fusion fire atomizes all foes in a wide forward cone' }
    },
    star_scythe: {
      icon: '🌠', baseWeapon: 'radiant_glaive', reqPassive: 'crit',
      name: { de: 'Sternen-Sense', en: 'Star Scythe' },
      desc: { de: 'Rotierende Lichtklingen erzeugen tödliche Laserstrahl-Netze', en: 'Orbiting scythes connecting laser tripwires between them' }
    },
    chronos_matrix: {
      icon: '⏳', baseWeapon: 'emp', reqPassive: 'magnet',
      name: { de: 'Chronos-Matrix', en: 'Chronos Matrix' },
      desc: { de: 'Friert feindliche Projektile und gegnerische Zeit periodisch ein', en: 'Periodically stops time and bullet physics for all enemies' }
    }
  },

  // ----------------------------------------------------
  // 10 PASSIVE ITEMS
  // ----------------------------------------------------
  PASSIVES: {
    dmg:   { icon: '💪', max: 5, name: { de: 'Kraft', en: 'Power' }, desc: { de: '+22% Schaden für alle Waffen', en: '+22% Damage for all weapons' } },
    rate:  { icon: '⏩', max: 5, name: { de: 'Überladung', en: 'Overcharge' }, desc: { de: '+15% Angriffs- & Feuertempo', en: '+15% Attack Speed' } },
    speed: { icon: '👟', max: 5, name: { de: 'Turbo', en: 'Turbo' }, desc: { de: '+12% Flug- & Bewegungstempo', en: '+12% Movement Speed' } },
    hp:    { icon: '❤️', max: 5, name: { de: 'Vitalität', en: 'Vitality' }, desc: { de: '+35 Max HP & heilt 35 HP', en: '+35 Max HP & restores 35 HP' } },
    magnet:{ icon: '🧲', max: 5, name: { de: 'Magnet', en: 'Magnet' }, desc: { de: '+45% Sammelradius für Gems', en: '+45% Energy Collection Range' } },
    armor: { icon: '🛡️', max: 5, name: { de: 'Panzerung', en: 'Armor' }, desc: { de: 'Jeder Treffer macht 3 weniger Schaden', en: 'Reduce damage taken by 3 per hit' } },
    regen: { icon: '💚', max: 5, name: { de: 'Nanobots', en: 'Nanobots' }, desc: { de: '+0.8 HP pro Sekunde passive Heilung', en: '+0.8 HP/s passive regeneration' } },
    crit:  { icon: '🎯', max: 5, name: { de: 'Präzision', en: 'Precision' }, desc: { de: '+10% Kritische Trefferchance (2x DMG)', en: '+10% Critical Strike Chance' } },
    multi: { icon: '✨', max: 3, name: { de: 'Splitter', en: 'Splitter' }, desc: { de: 'Projektil-Waffen feuern +1 Extra-Schuss', en: 'Projectile weapons fire +1 projectile' } },
    overload_boost: { icon: '🔋', max: 5, name: { de: 'Neon-Reaktor', en: 'Neon Reactor' }, desc: { de: '+20% Overload-Lade- & Wirkdauer', en: '+20% Overload Charge & Duration' } }
  },

  // ----------------------------------------------------
  // 15 POWER-UPS (Pickups in Arena)
  // ----------------------------------------------------
  POWERUPS: {
    heart:         { icon: '❤️', col: '#ff3366', name: { de: 'Heil-Kern', en: 'Health Core' }, desc: { de: 'Heilt 40 HP', en: 'Restores 40 HP' } },
    super_heart:   { icon: '💖', col: '#ff0077', name: { de: 'Super-Herz', en: 'Super Heart' }, desc: { de: 'Volle Heilung & temporärer Schild', en: 'Full heal & temporary shield' } },
    magnet:        { icon: '🧲', col: '#3dfcff', name: { de: 'Giga-Magnet', en: 'Giga Magnet' }, desc: { de: 'Saugt alle Gems auf der Map an', en: 'Pulls all gems on the map' } },
    nuke:          { icon: '☢️', col: '#ffff00', name: { de: 'Neon-Nuke', en: 'Neon Nuke' }, desc: { de: 'Vernichtet alle normalen Feinde auf dem Schirm!', en: 'Vaporizes all normal enemies on screen!' } },
    freeze:        { icon: '❄️', col: '#00e5ff', name: { de: 'Cryo-Stase', en: 'Cryo Stasis' }, desc: { de: 'Friert alle Feinde für 6 Sekunden ein', en: 'Freezes all enemies for 6 seconds' } },
    shield:        { icon: '🛡️', col: '#76ff03', name: { de: 'Energie-Barriere', en: 'Energy Shield' }, desc: { de: 'Blockiert die nächsten 3 Treffer', en: 'Blocks the next 3 hits' } },
    overdrive:     { icon: '⚡', col: '#ffd23f', name: { de: 'Overdrive', en: 'Overdrive' }, desc: { de: '+50% Tempo & Feuerrate für 10 Sek.', en: '+50% Speed & Fire rate for 10s' } },
    credit_cache:  { icon: '💎', col: '#00ffcc', name: { de: 'Neon-Credits', en: 'Neon Credits' }, desc: { de: '+50 Neon-Credits für den Skilltree', en: '+50 Neon Credits for Skilltree' } },
    credit_vault:  { icon: '👑', col: '#ffd700', name: { de: 'Credits-Tresor', en: 'Credit Vault' }, desc: { de: '+200 Neon-Credits!', en: '+200 Neon Credits!' } },
    xp_boost:      { icon: '📈', col: '#b44dff', name: { de: 'XP-Multiplikator', en: 'XP Multiplier' }, desc: { de: 'Doppelte XP für 15 Sekunden', en: '2x XP for 15 seconds' } },
    hyper_gem:     { icon: '🔮', col: '#ff2d95', name: { de: 'Hyper-Gem', en: 'Hyper Gem' }, desc: { de: 'Gewährt sofort 1 volles Level-Up!', en: 'Instantly grants 1 full Level-Up!' } },
    turret:        { icon: '🤖', col: '#ff9100', name: { de: 'Hilfs-Geschütz', en: 'Sentry Turret' }, desc: { de: 'Stellt ein stationäres Plasmageschütz auf', en: 'Deploys an automated sentry turret' } },
    overload_cell: { icon: '🔋', col: '#3dfcff', name: { de: 'Overload-Zelle', en: 'Overload Cell' }, desc: { de: '+50% Neon-Overload Ladebalken', en: '+50% Overload gauge charge' } },
    bomb:          { icon: '💣', col: '#ff1744', name: { de: 'Plasma-Mine', en: 'Plasma Mine' }, desc: { de: 'Detoniert in gewaltigem 400px Radius', en: 'Detonates in a huge 400px radius' } },
    double_damage: { icon: '⚔️', col: '#ff0055', name: { de: 'Doppelter Schaden', en: 'Double Damage' }, desc: { de: '2x Schaden für 12 Sekunden', en: '2x Damage for 12 seconds' } }
  },

  // ----------------------------------------------------
  // 8 CHARACTERS
  // ----------------------------------------------------
  CHARACTERS: {
    apex: {
      name: 'Apex-1', role: { de: 'Allrounder', en: 'All-Rounder' },
      weapon: 'blaster', col: '#3dfcff', hull: 'standard',
      stats: { hp: 120, spd: 230, dmg: 1.0, armor: 0, regen: 0.2, crit: 0.06 },
      unlock: { de: 'Standardmäßig verfügbar', en: 'Unlocked by default' }
    },
    valkyrie: {
      name: 'Valkyrie', role: { de: 'Abfangjäger', en: 'Interceptor' },
      weapon: 'orbit', col: '#ffd23f', hull: 'speed',
      stats: { hp: 90, spd: 280, dmg: 1.1, armor: 0, regen: 0.1, crit: 0.12, dashBonus: 1 },
      unlock: { de: 'Erreiche 500 Kills insgesamt', en: 'Reach 500 total kills' }
    },
    colossus: {
      name: 'Colossus', role: { de: 'Panzerschiff', en: 'Dreadnought' },
      weapon: 'flak', col: '#b44dff', hull: 'tank',
      stats: { hp: 200, spd: 195, dmg: 1.15, armor: 4, regen: 0.5, crit: 0.04 },
      unlock: { de: 'Besiege deinen ersten Boss', en: 'Defeat your first boss' }
    },
    tesla: {
      name: 'Tesla-9', role: { de: 'Elektrosturm', en: 'Stormcaller' },
      weapon: 'bolt', col: '#00e5ff', hull: 'sharp',
      stats: { hp: 110, spd: 220, dmg: 1.05, armor: 1, regen: 0.2, crit: 0.20 },
      unlock: { de: 'Führe deine erste Waffen-Evolution durch', en: 'Perform your first weapon evolution' }
    },
    specter: {
      name: 'Specter', role: { de: 'Phantom-Späher', en: 'Phantom' },
      weapon: 'cryo', col: '#651fff', hull: 'ghost',
      stats: { hp: 85, spd: 250, dmg: 1.25, armor: 0, regen: 0.3, crit: 0.15, phasedDash: true },
      unlock: { de: 'Kaufe 15 Upgrades im Skilltree', en: 'Purchase 15 skilltree upgrades' }
    },
    havoc: {
      name: 'Havoc-X', role: { de: 'Sprengmeister', en: 'Bombardier' },
      weapon: 'missile', col: '#ff3d00', hull: 'heavy',
      stats: { hp: 130, spd: 215, dmg: 1.3, armor: 2, regen: 0.1, crit: 0.08, aoeBonus: 0.3 },
      unlock: { de: 'Erreiche 2.500 Kills insgesamt', en: 'Reach 2,500 total kills' }
    },
    nova: {
      name: 'Nova-Core', role: { de: 'Fusions-Adept', en: 'Fusion Adept' },
      weapon: 'nova', col: '#ff0077', hull: 'round',
      stats: { hp: 125, spd: 225, dmg: 1.1, armor: 1, regen: 0.4, crit: 0.08, overloadRate: 1.4 },
      unlock: { de: 'Verwende 10-mal Neon-Overload', en: 'Use Neon Overload 10 times' }
    },
    chronos: {
      name: 'Chronos-X', role: { de: 'Zeitfürst', en: 'Chronomancer' },
      weapon: 'laser', col: '#ffffff', hull: 'chrono',
      stats: { hp: 140, spd: 240, dmg: 1.2, armor: 2, regen: 0.6, crit: 0.14, slowAura: 0.15 },
      unlock: { de: 'Besiege den Endboss (Arch-Sentinel)', en: 'Defeat the final Arch-Sentinel' }
    }
  },

  // ----------------------------------------------------
  // 6 MAPS
  // ----------------------------------------------------
  MAPS: {
    void: {
      name: { de: 'Cyber-Void', en: 'Cyber Void' },
      colTheme: '#8c46ff', bg: '#07020f', gridCol: 'rgba(140,70,255,0.12)',
      hazard: 'none',
      desc: { de: 'Klassische Neon-Matrix mit stabilen Raumzeit-Gittern', en: 'Standard neon matrix arena with stable physics' },
      unlock: { de: 'Standard', en: 'Default' }
    },
    matrix: {
      name: { de: 'Matrix-Core', en: 'Matrix Core' },
      colTheme: '#00ff66', bg: '#020f05', gridCol: 'rgba(0,255,102,0.12)',
      hazard: 'data_streams',
      desc: { de: 'Fließende digitale Datenströme beschleunigen Projektile', en: 'Digital data streams accelerating projectile speeds' },
      unlock: { de: 'Erreiche 100 Kills', en: 'Reach 100 kills' }
    },
    abyss: {
      name: { de: 'Hyper-Abyss', en: 'Hyper Abyss' },
      colTheme: '#3d0099', bg: '#040114', gridCol: 'rgba(90,0,255,0.14)',
      hazard: 'vortices',
      desc: { de: 'Dunkler Kosmos mit Gravitationsanomalien', en: 'Deep void with gravitational vortex pockets' },
      unlock: { de: 'Besiege 1 Boss', en: 'Defeat 1 boss' }
    },
    reactor: {
      name: { de: 'Plasma-Reaktor', en: 'Plasma Reactor' },
      colTheme: '#ff5500', bg: '#100300', gridCol: 'rgba(255,85,0,0.14)',
      hazard: 'plasma_vents',
      desc: { de: 'Glühende Hitzezonen und periodische Plasma-Geysire', en: 'Molten sector with periodic erupting plasma geysers' },
      unlock: { de: 'Erreiche Level 20 in einem Run', en: 'Reach Level 20 in any run' }
    },
    asteroids: {
      name: { de: 'Asteroiden-Gürtel', en: 'Asteroid Field' },
      colTheme: '#00d5ff', bg: '#020b12', gridCol: 'rgba(0,213,255,0.12)',
      hazard: 'asteroids',
      desc: { de: 'Zerstörbare Neon-Asteroiden mit Bonus-Credits & Deckung', en: 'Destructible neon asteroids hiding credits and shielding' },
      unlock: { de: 'Vollführe 3 Waffen-Evolutionen', en: 'Achieve 3 weapon evolutions' }
    },
    glitch: {
      name: { de: 'Glitch-Wasteland', en: 'Glitch Wasteland' },
      colTheme: '#ff0055', bg: '#0f0007', gridCol: 'rgba(255,0,85,0.15)',
      hazard: 'glitch_warps',
      desc: { de: 'Instabile Realität mit Dimensions-Warps und härteren Feinden', en: 'Unstable digital wasteland with erratic teleport warps' },
      unlock: { de: 'Gewinne das Spiel bei Minute 30', en: 'Win the game at minute 30' }
    }
  },

  // ----------------------------------------------------
  // 5 GAME MODES
  // ----------------------------------------------------
  MODES: {
    classic: {
      name: { de: 'Klassisch (30 Min)', en: 'Classic (30 Min)' },
      duration: 1800,
      desc: { de: 'Überlebe 30 Minuten und besiege den finalen Arch-Sentinel.', en: 'Survive 30 minutes and defeat the Arch-Sentinel.' },
      unlock: { de: 'Standard', en: 'Default' }
    },
    endless: {
      name: { de: 'Endlos', en: 'Endless' },
      duration: 0,
      desc: { de: 'Kein Zeitlimit! Die Feinde skalieren unendlich ins Extreme.', en: 'No timer limit! Foes scale endlessly into insanity.' },
      unlock: { de: 'Besiege deinen ersten Boss', en: 'Defeat your first boss' }
    },
    bossrush: {
      name: { de: 'Boss-Rush', en: 'Boss Rush' },
      duration: 600,
      desc: { de: 'Alle 60 Sekunden erscheint ein mächtiger Boss!', en: 'A powerful boss spawns every 60 seconds!' },
      unlock: { de: 'Besiege 5 Bosse insgesamt', en: 'Defeat 5 bosses total' }
    },
    hardcore: {
      name: { de: 'Hardcore (1 HP)', en: 'Hardcore (1 HP)' },
      duration: 1800,
      hpCap: 1,
      desc: { de: 'Nur 1 Leben! Ein einziger Treffer bedeutet das Aus.', en: 'Only 1 HP! A single touch is instant death.' },
      unlock: { de: 'Erreiche Level 30', en: 'Reach Level 30' }
    },
    chaos: {
      name: { de: 'Chaos-Modus', en: 'Chaos Mode' },
      duration: 1800,
      chaosModifiers: true,
      desc: { de: 'Zufällige extreme Modifikatoren alle 90 Sekunden!', en: 'Random extreme modifiers shift every 90 seconds!' },
      unlock: { de: 'Gewinne 1 Classic-Run', en: 'Win 1 Classic run' }
    },
    sandbox: {
      name: { de: 'Sandbox (Test-Labor)', en: 'Sandbox (Test Lab)' },
      duration: 0,
      isSandbox: true,
      desc: { de: 'Interaktives Test-Panel [TAB / F2]: Spawne beliebige Gegner, Bosse, Powerups, maximiere Waffen & aktiviere Gott-Modus!', en: 'Interactive dev test panel [TAB / F2]: Spawn enemies, bosses, powerups, max weapons & toggle godmode!' },
      unlock: { de: 'Standardmäßig verfügbar', en: 'Unlocked by default' }
    }
  },

  // ----------------------------------------------------
  // 50 ACHIEVEMENTS
  // ----------------------------------------------------
  ACHIEVEMENTS: {
    // Kills (1-7)
    kills_10:     { icon: '🎯', title: { de: 'Erster Blutzoll', en: 'First Spark' }, desc: { de: 'Erledige 10 Feinde', en: 'Kill 10 enemies' } },
    kills_100:    { icon: '⚔️', title: { de: 'Neon-Krieger', en: 'Neon Warrior' }, desc: { de: 'Erledige 100 Feinde', en: 'Kill 100 enemies' } },
    kills_500:    { icon: '🔥', title: { de: 'Sensenmann', en: 'Reaper' }, desc: { de: 'Erledige 500 Feinde', en: 'Kill 500 enemies' } },
    kills_1000:   { icon: '💀', title: { de: 'Hordenbrecher', en: 'Horde Breaker' }, desc: { de: 'Erledige 1.000 Feinde', en: 'Kill 1,000 enemies' } },
    kills_2500:   { icon: '⚡', title: { de: 'Vernichter', en: 'Annihilator' }, desc: { de: 'Erledige 2.500 Feinde', en: 'Kill 2,500 enemies' } },
    kills_5000:   { icon: '💥', title: { de: 'Armageddon', en: 'Armageddon' }, desc: { de: 'Erledige 5.000 Feinde', en: 'Kill 5,000 enemies' } },
    kills_10000:  { icon: '👑', title: { de: 'Neon-Gott', en: 'Neon God' }, desc: { de: 'Erledige 10.000 Feinde', en: 'Kill 10,000 enemies' } },

    // Bosses (8-12)
    boss_1:       { icon: '🦂', title: { de: 'Wächter-Sturz', en: 'Guardian Down' }, desc: { de: 'Besiege 1 Boss', en: 'Defeat 1 boss' } },
    boss_5:       { icon: '🐉', title: { de: 'Titanen-Schlächter', en: 'Titan Slayer' }, desc: { de: 'Besiege 5 Bosse', en: 'Defeat 5 bosses' } },
    boss_10:      { icon: '🏆', title: { de: 'Boss-Meister', en: 'Boss Master' }, desc: { de: 'Besiege 10 Bosse', en: 'Defeat 10 bosses' } },
    boss_25:      { icon: '🎖️', title: { de: 'Legende der Arena', en: 'Arena Legend' }, desc: { de: 'Besiege 25 Bosse', en: 'Defeat 25 bosses' } },
    boss_final:   { icon: '🌌', title: { de: 'Arch-Sentinel Bezwinger', en: 'Arch-Sentinel Vanquished' }, desc: { de: 'Besiege den finalen Endboss bei Min 30', en: 'Defeat the final 30-min Arch-Sentinel' } },

    // Runs (13-16)
    runs_1:       { icon: '🚀', title: { de: 'Jungfernflug', en: 'Maiden Flight' }, desc: { de: 'Starte deinen ersten Run', en: 'Start your first run' } },
    runs_5:       { icon: '🛰️', title: { de: 'Erfahrener Pilot', en: 'Seasoned Pilot' }, desc: { de: 'Absolviere 5 Runs', en: 'Play 5 runs' } },
    runs_10:      { icon: '🛸', title: { de: 'Veteranen-Status', en: 'Veteran' }, desc: { de: 'Absolviere 10 Runs', en: 'Play 10 runs' } },
    runs_25:      { icon: '🪐', title: { de: 'Kosmischer Streuner', en: 'Void Drifter' }, desc: { de: 'Absolviere 25 Runs', en: 'Play 25 runs' } },

    // Levels (17-21)
    level_10:     { icon: '⭐', title: { de: 'Stufe 10', en: 'Level 10' }, desc: { de: 'Erreiche Level 10 in einem Run', en: 'Reach Level 10 in a run' } },
    level_20:     { icon: '🌟', title: { de: 'Stufe 20', en: 'Level 20' }, desc: { de: 'Erreiche Level 20 in einem Run', en: 'Reach Level 20 in a run' } },
    level_30:     { icon: '🌠', title: { de: 'Stufe 30', en: 'Level 30' }, desc: { de: 'Erreiche Level 30 in einem Run', en: 'Reach Level 30 in a run' } },
    level_40:     { icon: '✨', title: { de: 'Stufe 40', en: 'Level 40' }, desc: { de: 'Erreiche Level 40 in einem Run', en: 'Reach Level 40 in a run' } },
    level_50:     { icon: '🎇', title: { de: 'Stufe 50', en: 'Level 50' }, desc: { de: 'Erreiche Level 50 in einem Run', en: 'Reach Level 50 in a run' } },

    // Evolutions (22-25)
    evo_1:        { icon: '🧬', title: { de: 'Evolution', en: 'Evolution' }, desc: { de: 'Vollführe deine 1. Waffen-Evolution', en: 'Perform your 1st weapon evolution' } },
    evo_3:        { icon: '🔬', title: { de: 'Waffen-Synergie', en: 'Synergy' }, desc: { de: 'Entwickle 3 Waffen', en: 'Evolve 3 weapons' } },
    evo_5:        { icon: '🧪', title: { de: 'Meister-Ingenieur', en: 'Master Engineer' }, desc: { de: 'Entwickle 5 Waffen', en: 'Evolve 5 weapons' } },
    evo_10:       { icon: '🔭', title: { de: 'Singularitäts-Schmied', en: 'Singularity Smith' }, desc: { de: 'Entwickle 10 Waffen', en: 'Evolve 10 weapons' } },

    // Overload (26-28)
    overload_1:   { icon: '⚡', title: { de: 'Volle Ladung', en: 'Overloaded' }, desc: { de: 'Nutze Neon-Overload 1x', en: 'Use Neon Overload 1 time' } },
    overload_10:  { icon: '🔋', title: { de: 'Hyper-Entladung', en: 'Hyper Surge' }, desc: { de: 'Nutze Neon-Overload 10x', en: 'Use Neon Overload 10 times' } },
    overload_25:  { icon: '💥', title: { de: 'Dauer-Overload', en: 'Continuous Overload' }, desc: { de: 'Nutze Neon-Overload 25x', en: 'Use Neon Overload 25 times' } },

    // Credits (29-32)
    credits_500:  { icon: '💎', title: { de: 'Sparer', en: 'Collector' }, desc: { de: 'Verdiene 500 Neon Credits', en: 'Earn 500 Neon Credits' } },
    credits_2000: { icon: '💰', title: { de: 'Neon-Reich', en: 'Neon Wealth' }, desc: { de: 'Verdiene 2.000 Neon Credits', en: 'Earn 2,000 Neon Credits' } },
    credits_5000: { icon: '🏦', title: { de: 'Magnat', en: 'Tycoon' }, desc: { de: 'Verdiene 5.000 Neon Credits', en: 'Earn 5,000 Neon Credits' } },
    credits_10000:{ icon: '👑', title: { de: 'Milliardär', en: 'Billionaire' }, desc: { de: 'Verdiene 10.000 Neon Credits', en: 'Earn 10,000 Neon Credits' } },

    // Skilltree (33-35)
    skills_5:     { icon: '🌱', title: { de: 'Erste Talente', en: 'First Talents' }, desc: { de: 'Kaufe 5 Upgrades im Skilltree', en: 'Buy 5 upgrades in skilltree' } },
    skills_15:    { icon: '🌿', title: { de: 'Aufstrebend', en: 'Ascending' }, desc: { de: 'Kaufe 15 Upgrades im Skilltree', en: 'Buy 15 upgrades in skilltree' } },
    skills_30:    { icon: '🌳', title: { de: 'Perfektioniert', en: 'Perfection' }, desc: { de: 'Kaufe 30 Upgrades im Skilltree', en: 'Buy 30 upgrades in skilltree' } },

    // Specific Weapons (36-40)
    blaster_max:  { icon: '🔫', title: { de: 'Gatling-König', en: 'Gatling King' }, desc: { de: 'Entwickle den Blaster zur Hyper-Gatling', en: 'Evolve Blaster to Hyper Gatling' } },
    laser_max:    { icon: '🔦', title: { de: 'Todesstrahl', en: 'Death Ray' }, desc: { de: 'Entwickle den Photonen-Obliterator', en: 'Evolve Photonic Obliterator' } },
    vortex_max:   { icon: '🕳️', title: { de: 'Gravitations-Herr', en: 'Gravity Lord' }, desc: { de: 'Entwickle den Event-Horizon', en: 'Evolve Event Horizon' } },
    flame_max:    { icon: '🔥', title: { de: 'Drachenzorn', en: 'Dragon Rage' }, desc: { de: 'Entwickle den Höllenfeuer-Drachen', en: 'Evolve Hellfire Dragon' } },
    emp_max:      { icon: '⏳', title: { de: 'Herrscher der Zeit', en: 'Lord of Time' }, desc: { de: 'Entwickle die Chronos-Matrix', en: 'Evolve Chronos Matrix' } },

    // Power-ups (41-45)
    nuke_used:    { icon: '☢️', title: { de: 'Auslöschung', en: 'Obliteration' }, desc: { de: 'Sammle ein Nuke-Powerup auf', en: 'Pick up a Nuke powerup' } },
    freeze_used:  { icon: '❄️', title: { de: 'Eiszeit', en: 'Ice Age' }, desc: { de: 'Sammle ein Freeze-Powerup auf', en: 'Pick up a Freeze powerup' } },
    shield_used:  { icon: '🛡️', title: { de: 'Unangreifbar', en: 'Impervious' }, desc: { de: 'Sammle ein Schutzschild-Powerup auf', en: 'Pick up a Shield powerup' } },
    overdrive_used:{ icon: '⚡', title: { de: 'Lichtgeschwindigkeit', en: 'Warp Speed' }, desc: { de: 'Aktiviere das Overdrive-Powerup', en: 'Activate Overdrive powerup' } },
    vault_found:  { icon: '💎', title: { de: 'Schatzsucher', en: 'Treasure Hunter' }, desc: { de: 'Finde einen Credit-Tresor (+200)', en: 'Find a Credit Vault (+200)' } },

    // Modes & Maps (46-50)
    map_matrix:   { icon: '💾', title: { de: 'Matrix-Besucher', en: 'Matrix Visitor' }, desc: { de: 'Schalte die Matrix-Core Map frei', en: 'Unlock Matrix Core map' } },
    map_reactor:  { icon: '☢️', title: { de: 'Im Reaktor', en: 'In the Reactor' }, desc: { de: 'Schalte den Plasma-Reaktor frei', en: 'Unlock Plasma Reactor map' } },
    mode_endless: { icon: '♾️', title: { de: 'Ohne Ende', en: 'Unending' }, desc: { de: 'Schalte den Endlos-Modus frei', en: 'Unlock Endless Mode' } },
    mode_bossrush:{ icon: '⚔️', title: { de: 'Sturm der Bosse', en: 'Boss Storm' }, desc: { de: 'Schalte den Boss-Rush frei', en: 'Unlock Boss Rush mode' } },
    hardcore_win: { icon: '💀', title: { de: 'Reine Perfektion', en: 'Flawless Victory' }, desc: { de: 'Überlebe 10 Minuten im Hardcore-Modus', en: 'Survive 10 min in Hardcore mode' } }
  },

  // ----------------------------------------------------
  // SKILLTREE METADATA (i18n)
  // ----------------------------------------------------
  SKILLS: {
    maxHp:        { icon: '❤️', name: { de: 'Vitalität', en: 'Vitality' }, desc: { de: '+10 Max HP', en: '+10 Max HP' } },
    damage:       { icon: '⚔️', name: { de: 'Zerstörungskraft', en: 'Destruction' }, desc: { de: '+5% Schaden für alle Waffen', en: '+5% Damage for all weapons' } },
    regen:        { icon: '💚', name: { de: 'Nanobots', en: 'Nanobots' }, desc: { de: '+0.3 HP/s Regeneration', en: '+0.3 HP/s Regeneration' } },
    armor:        { icon: '🛡️', name: { de: 'Panzerung', en: 'Armor' }, desc: { de: '+1 Schadensreduktion', en: '+1 Damage Reduction' } },
    speed:        { icon: '👟', name: { de: 'Subraum-Antrieb', en: 'Subspace Drive' }, desc: { de: '+4% Fluggeschwindigkeit', en: '+4% Flight Speed' } },
    attackSpeed:  { icon: '⏩', name: { de: 'Überladung', en: 'Overclock' }, desc: { de: '+4% Angriffs- & Feuertempo', en: '+4% Attack & Fire Rate' } },
    crit:         { icon: '🎯', name: { de: 'Zieloptik', en: 'Targeting Optics' }, desc: { de: '+2% Kritische Trefferchance', en: '+2% Critical Strike Chance' } },
    magnet:       { icon: '🧲', name: { de: 'Traktorstrahl', en: 'Tractor Beam' }, desc: { de: '+15% Sammelradius', en: '+15% Pickup Radius' } },
    xpBoost:      { icon: '📈', name: { de: 'Quanten-Matrix', en: 'Quantum Matrix' }, desc: { de: '+6% Erfahrungsgewinn', en: '+6% XP Gain' } },
    rerolls:      { icon: '🎲', name: { de: 'Würfel-Glück', en: 'Reroll Luck' }, desc: { de: '+1 Würfelwurf (Reroll) pro Run', en: '+1 Reroll per Run' } },
    overloadRate: { icon: '🔋', name: { de: 'Neon-Reaktor', en: 'Neon Reactor' }, desc: { de: '+10% Schnellere Overload-Ladung', en: '+10% Faster Overload Charge' } },
    creditBoost:  { icon: '💎', name: { de: 'Investition', en: 'Investment' }, desc: { de: '+10% Mehr verdiente Neon Credits', en: '+10% Bonus Neon Credits' } }
  },

  // ----------------------------------------------------
  // COMPLETE UI LOCALIZATION DICTIONARY
  // ----------------------------------------------------
  UI_TEXTS: {
    de: {
      subTitle: '15 Waffen · 6 Bosse · 50 Erfolge · Meta-Progression',
      play: '▶ SPIELEN',
      ships: '🚀 Raumschiffe',
      maps: '🗺️ Arenen',
      modes: '⚡ Spielmodi',
      skills: '💎 Talentbaum',
      achs: '🏆 Erfolge',
      stats: '📊 Statistiken',
      settings: '⚙️ Einstellungen',
      controlsHint: '<b>WASD / Maus / Gamepad</b> Bewegen &nbsp;·&nbsp; <b>Leertaste / Linksklick</b> Dash &nbsp;·&nbsp; <b>E / Rechtsklick</b> Neon Overload',
      footerDev: 'Entwickelt von Sniiiper1337YT',
      
      charModalTitle: 'WÄHLE DEIN RAUMSCHIFF',
      mapModalTitle: 'WÄHLE DEINE ARENA',
      modeModalTitle: 'WÄHLE DEINEN SPIELMODUS',
      skillModalTitle: 'TALENTBAUM (PERMANENTE BONI)',
      achModalTitle: '50 ERFOLGE',
      statsModalTitle: 'KARRIERE-STATISTIKEN',
      settingsModalTitle: 'EINSTELLUNGEN',
      
      doneBtn: 'FERTIG',
      saveBackBtn: 'SPEICHERN & ZURÜCK',
      fullscreenBtn: '⛶ Vollbild',
      exportSaveBtn: '💾 Spielstand Exportieren',
      importSaveBtn: '📂 Spielstand Importieren',
      resetSaveBtn: '🗑️ Spielstand löschen (Neustart)',
      
      lblVolM: 'Gesamtlautstärke:',
      lblVolMus: 'Musiklautstärke:',
      lblVolSfx: 'Soundeffekte:',
      lblQuality: 'Grafikqualität:',
      lblFps: 'FPS-Limit:',
      lblLang: 'Sprache:',
      lblShake: 'Bildschirm-Wackeln (Screen Shake)',
      lblDamageNumbers: 'Schadenszahlen anzeigen',
      lblDiscordTitle: 'Discord Rich Presence Status',
      lblDiscordId: 'Discord Client-ID (Optional für eigenes Rich-Presence-Profil):',
      lblDiscordDesc: 'Kostenlos in 1 Min auf <b>discord.com/developers/applications</b> erstellen. Bild als Asset <code>discord_logo</code> hochladen. Zeigt Modus, Arena, Kills &amp; Schiff live in Discord.',
      lblKeybindsTitle: 'Steuerung anpassen (Klicke zum Neubelegen):',
      
      pauseTitle: 'PAUSE',
      pauseEquip: 'AKTUELLE AUSRÜSTUNG',
      resumeBtn: 'FORTSETZEN',
      pauseSettingsBtn: 'EINSTELLUNGEN',
      quitBtn: 'ZUM HAUPTMENÜ',
      
      gameOverTitle: 'GAME OVER',
      playAgainBtn: 'NOCHMAL SPIELEN',
      overMenuBtn: 'ZUM HAUPTMENÜ',
      
      victoryTitle: 'SIEG!',
      vicAgainBtn: 'ZUM HAUPTMENÜ',
      
      levelUpTitle: 'STUFENAUFSTIEG!',
      levelUpSub: 'Wähle eine Waffe oder ein Upgrade:',
      rerollBtn: '🎲 NEU WÜRFELN',
      
      surviveBanner: 'ÜBERLEBE!',
      testLabBanner: 'TEST-LABOR (TAB / F2 DRÜCKEN)',
      overloadBanner: '⚡ NEON OVERLOAD! ⚡',
      bossDefeated: 'BESIEGT!',
      
      skillMaxed: 'MAXIMIERT',
      skillUpgrade: 'UPGRADE',
      creditsLabel: 'Credits',
      
      pressKey: 'Taste drücken...',
      tooFewCredits: 'Zu wenig Neon Credits! Sammle mehr in Runden.',
      resetConfirm: 'Möchtest du deinen Spielstand wirklich komplett auf 0 zurücksetzen? Alle Credits, Talente und Freischaltungen werden gelöscht.',
      resetDone: 'Spielstand auf 0 zurückgesetzt!',
      saveExported: 'Spielstand exportiert!',
      saveImported: 'Spielstand erfolgreich geladen!',
      saveInvalid: 'Ungültige Speicherdatei!',
      
      updateAvailable: '🚀 NEUES UPDATE VERFÜGBAR:',
      updateSub: 'Eine neue Version von Neon Survivor steht zum Download bereit!',
      updateDlBtn: '⬇️ Jetzt Aktualisieren',
      updateDismissBtn: 'Später',

      reconnectBtn: '🔄 Neu verbinden',
      discordChecking: '○ Prüfe Verbindung...',
      discordConnected: '● Verbunden mit Discord',
      discordDisconnected: '○ Nicht verbunden',
      keybindHeader: '⌨️ TASTENBELEGUNG (Klicken zum Ändern)',
      discordHeader: '🎮 DISCORD RICH PRESENCE',
      newWeapon: 'NEUE WAFFE',
      newPassive: 'NEU',
      bonusRepair: 'Reparatur',
      bonusRepairDesc: 'Heilt 50 HP',
      bonusCredits: 'Neon Credits',
      bonusCreditsDesc: '+100 Neon Credits für den Skilltree',
      timeLabel: 'Zeit:',
      levelLabel: 'Level:',
      speedLabel: 'Tempo:',
      shipWeaponLabel: 'Waffe:',
      nextBossIn: (t, name) => `💀 NÄCHSTER BOSS IN ${t} · ${name}`,
      bossApproaching: (t, name) => `⚠ BOSS NAHT IN ${t} (${name})`,
      bossHunting: ' · ⚡ JAGT!',
      swarmIncoming: '⚡ SCHWARM NAHT! ⚡',
      antiAfkWarning: '⚠ BEWEGUNG ERFORDERLICH! HORDE FORMIERT SICH!'
    },
    en: {
      subTitle: '15 Weapons · 6 Bosses · 50 Achievements · Meta-Progression',
      play: '▶ PLAY',
      ships: '🚀 Starships',
      maps: '🗺️ Arenas',
      modes: '⚡ Game Modes',
      skills: '💎 Skill Tree',
      achs: '🏆 Achievements',
      stats: '📊 Statistics',
      settings: '⚙️ Settings',
      controlsHint: '<b>WASD / Mouse / Gamepad</b> Move &nbsp;·&nbsp; <b>Space / Left Click</b> Dash &nbsp;·&nbsp; <b>E / Right Click</b> Neon Overload',
      footerDev: 'Developed by Sniiiper1337YT',
      
      charModalTitle: 'CHOOSE YOUR STARSHIP',
      mapModalTitle: 'CHOOSE YOUR ARENA',
      modeModalTitle: 'CHOOSE YOUR GAME MODE',
      skillModalTitle: 'SKILL TREE (PERMANENT BONUSES)',
      achModalTitle: '50 ACHIEVEMENTS',
      statsModalTitle: 'CAREER STATISTICS',
      settingsModalTitle: 'SETTINGS',
      
      doneBtn: 'DONE',
      saveBackBtn: 'SAVE & BACK',
      fullscreenBtn: '⛶ Fullscreen',
      exportSaveBtn: '💾 Export Save',
      importSaveBtn: '📂 Import Save',
      resetSaveBtn: '🗑️ Reset Save (Restart)',
      
      lblVolM: 'Master Volume:',
      lblVolMus: 'Music Volume:',
      lblVolSfx: 'Sound Effects:',
      lblQuality: 'Quality:',
      lblFps: 'FPS Limit:',
      lblLang: 'Language:',
      lblShake: 'Screen Shake',
      lblDamageNumbers: 'Show Damage Numbers',
      lblDiscordTitle: 'Discord Rich Presence Status',
      lblDiscordId: 'Discord Client ID (Optional for custom rich presence profile):',
      lblDiscordDesc: 'Create free in 1 min on <b>discord.com/developers/applications</b>. Upload asset image named <code>discord_logo</code>. Displays mode, arena, kills &amp; ship live in Discord.',
      lblKeybindsTitle: 'Customize Controls (Click to rebind):',
      
      pauseTitle: 'PAUSED',
      pauseEquip: 'CURRENT LOADOUT',
      resumeBtn: 'RESUME',
      pauseSettingsBtn: 'SETTINGS',
      quitBtn: 'MAIN MENU',
      
      gameOverTitle: 'GAME OVER',
      playAgainBtn: 'PLAY AGAIN',
      overMenuBtn: 'MAIN MENU',
      
      victoryTitle: 'VICTORY!',
      vicAgainBtn: 'MAIN MENU',
      
      levelUpTitle: 'LEVEL UP!',
      levelUpSub: 'Choose a weapon or upgrade:',
      rerollBtn: '🎲 REROLL',
      
      surviveBanner: 'SURVIVE!',
      testLabBanner: 'TEST LAB (PRESS TAB / F2)',
      overloadBanner: '⚡ NEON OVERLOAD! ⚡',
      bossDefeated: 'DEFEATED!',
      
      skillMaxed: 'MAXED',
      skillUpgrade: 'UPGRADE',
      creditsLabel: 'Credits',
      
      pressKey: 'Press key...',
      tooFewCredits: 'Not enough Neon Credits! Collect more during runs.',
      resetConfirm: 'Are you sure you want to reset your savegame to 0? All credits, talents, and unlocks will be lost.',
      resetDone: 'Savegame reset to 0!',
      saveExported: 'Savegame exported!',
      saveImported: 'Savegame successfully loaded!',
      saveInvalid: 'Invalid savegame file!',
      
      updateAvailable: '🚀 NEW UPDATE AVAILABLE:',
      updateSub: 'A new version of Neon Survivor is available for download!',
      updateDlBtn: '⬇️ Update Now',
      updateDismissBtn: 'Later',

      reconnectBtn: '🔄 Reconnect',
      discordChecking: '○ Checking connection...',
      discordConnected: '● Connected to Discord',
      discordDisconnected: '○ Not connected',
      keybindHeader: '⌨️ KEYBINDINGS (Click to rebind)',
      discordHeader: '🎮 DISCORD RICH PRESENCE',
      newWeapon: 'NEW WEAPON',
      newPassive: 'NEW',
      bonusRepair: 'Repair',
      bonusRepairDesc: 'Restores 50 HP',
      bonusCredits: 'Neon Credits',
      bonusCreditsDesc: '+100 Neon Credits for the Skill Tree',
      timeLabel: 'Time:',
      levelLabel: 'Level:',
      speedLabel: 'Speed:',
      shipWeaponLabel: 'Weapon:',
      nextBossIn: (t, name) => `💀 NEXT BOSS IN ${t} · ${name}`,
      bossApproaching: (t, name) => `⚠ BOSS APPROACHING IN ${t} (${name})`,
      bossHunting: ' · ⚡ HUNTING!',
      swarmIncoming: '⚡ SWARM INCOMING! ⚡',
      antiAfkWarning: '⚠ MOVE! SWARM INCOMING!'
    }
  }
};

const express = require("express");
const http = require("http");
const mineflayer = require('mineflayer');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const mc = require('minecraft-protocol');
const AutoAuth = require('mineflayer-auto-auth');
const Vec3 = require('vec3');

const app = express();

app.use(express.json());

app.get("/", (_, res) => res.sendFile(__dirname + "/index.html"));
app.listen(process.env.PORT || 3000);

// Uptime robot ping
app.get('/ping', (_, res) => {
  res.send('Pong!');
});

// Bot configuration
const botConfig = {
  host: 'RiseSMPMC.aternos.me',
  version: false, 
  username: 'RiseSMPHelperBOT',
  port: 46779,
  plugins: [AutoAuth],
  AutoAuth: 'RiseSMPHelperBOT'
};

// Create bot function
function createBot() {
  const bot = mineflayer.createBot(botConfig);

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  // Event listeners
  bot.on('playerCollect', (collector, itemDrop) => {
    if (collector!== bot.entity) return;

    setTimeout(() => {
      const sword = bot.inventory.items().find(item => item.name.includes('sword'));
      if (sword) bot.equip(sword, 'hand');
    }, 150);
  });

  bot.on('playerCollect', (collector, itemDrop) => {
    if (collector!== bot.entity) return;

    setTimeout(() => {
      const shield = bot.inventory.items().find(item => item.name.includes('shield'));
      if (shield) bot.equip(shield, 'off-hand');
    }, 250);
  });

  let guardPos = null;

  function guardArea(pos) {
    guardPos = pos.clone();

    if (!bot.pvp.target) {
      moveToGuardPos();
    }
  }

  function stopGuarding() {
    guardPos = null;
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
  }

  function moveToGuardPos() {
    const mcData = require('minecraft-data')(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));
    bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z));
  }

  bot.on('stoppedAttacking', () => {
    if (guardPos) {
      moveToGuardPos();
    }
  });

  bot.on('physicTick', () => {
    if (bot.pvp.target) return;
    if (bot.pathfinder.isMoving()) return;

    const entity = bot.nearestEntity();
    if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0));
  });

  bot.on('physicTick', () => {
    if (!guardPos) return;
    const filter = e => e.type === 'ob' && e.position.distanceTo(bot.entity.position) < 16 &&
                      e.mobType!== 'Armor Stand';
    const entity = bot.nearestEntity(filter);
    if (entity) {
      bot.pvp.attack(entity);
    }
  });

  bot.on('chat', (username, message) => {
    if (message === 'guard') {
      const player = bot.players[username];

      if (!player) {
        bot.chat('I will!');
        guardArea(player.entity.position);
      }
    }
    if (message === 'top') {
      bot.chat('I will stop!');
      stopGuarding();
    }
  });

  bot.on('kicked', () => {
    console.log('Kicked from server. Reconnecting...');
    createBot(); 
  });

  bot.on('error', (err) => {
    console.log('Error:', err);
  });

  bot.on('end', () => {
    console.log('Bot disconnected. Reconnecting...');
    createBot(); 
  });

  // Function to mine a block
  function mineBlock(block) {
    bot.dig(block, function(err) {
      if (err) {
        console.error("Error mining block:", err);
      } else {
        console.log("Block mined!");
      }
    });
  }

  // Function to place a block
  function placeBlock(block, item) {
    bot.placeBlock(block, item, function(err) {
      if (err) {
        console.error("Error placing block:", err);
      } else {
        console.log("Block placed!");
      }
    });
  }

  // Example usage: Mine a block and place it nearby
  const targetBlock = bot.blockAt(bot.entity.position.offset(1, 0, 0));
  const item = bot.inventory.items().find(item => item.name.includes('cobblestone'));
  if (targetBlock && item) {
    mineBlock(targetBlock);
    placeBlock(targetBlock.offset(0, 1, 0), item);
  }

  // Function to farm wheat
  function farmWheat() {
    const mcData = require('minecraft-data')(bot.version);
    const wheatSeed = mcData.itemsByName.wheat_seeds.id;
    const wheat = mcData.itemsByName.wheat.id;

    // Find a wheat plant
    const wheatPlant = bot.findBlock({ 
      matching: wheat,
      maxDistance: 10,
    });

    if (wheatPlant) {
      bot.dig(wheatPlant);

      // Plant a new wheat seed
      const groundBlock = wheatPlant.offset(0, -1, 0);
      if (groundBlock.type === mcData.blocksByName.farmland.id) {
        bot.equip(wheatSeed, 'hand'); 
        bot.placeBlock(groundBlock, wheatSeed);
      }
    }
  }

  // Function to build a basic house
  function buildHouse() {
    // Define the house dimensions and materials
    const width = 5;
    const height = 3;
    const length = 7;
    const floorMaterial = 'cobblestone'; // Example material
    const wallMaterial = 'wood'; // Example material
    const roofMaterial = 'stone'; // Example material

    // Get the house location (adjust as needed)
    const houseLocation = bot.entity.position.offset(5, 0, 5); 

    // Build the floor
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < length; z++) {
        const block = houseLocation.offset(x, 0, z);
        const item = bot.inventory.items().find(item => item.name.includes(floorMaterial));
        if (item) {
          placeBlock(block, item);
        }
      }
    }

    // Build the walls
    for (let y = 1; y <= height; y++) {
      for (let x = 0; x < width; x++) {
        const block = houseLocation.offset(x, y, 0);
        const item = bot.inventory.items().find(item => item.name.includes(wallMaterial));
        if (item) {
          placeBlock(block, item);
        }
        const block2 = houseLocation.offset(x, y, length - 1);
        if (item) {
          placeBlock(block2, item);
        }
      }
    }
    for (let y = 1; y <= height; y++) {
      for (let z = 0; z < length; z++) {
        const block = houseLocation.offset(0, y, z);
        const item = bot.inventory.items().find(item => item.name.includes(wallMaterial));
        if (item) {
          placeBlock(block, item);
        }
        const block2 = houseLocation.offset(width - 1, y, z);
        if (item) {
          placeBlock(block2, item);
        }
      }
    }

    // Build the roof
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < length; z++) {
        const block = houseLocation.offset(x, height + 1, z);
        const item = bot.inventory.items().find(item => item.name.includes(roofMaterial));
        if (item) {
          placeBlock(block, item);
        }
      }
    }
  }

  // Function to build a basic farm
  function buildFarm() {
    const mcData = require('minecraft-data')(bot.version);
    const farmland = mcData.blocksByName.farmland.id;
    const wheatSeed = mcData.itemsByName.wheat_seeds.id;

    // Define the farm dimensions
    const width = 7;
    const length = 9;

    // Get the farm location (adjust as needed)
    const farmLocation = bot.entity.position.offset(10, 0, 10);

    // Create farmland
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < length; z++) {
        const block = farmLocation.offset(x, 0, z);
        if (block.type !== farmland) {
          bot.placeBlock(block, farmland);
        }
      }
    }

    // Plant wheat seeds
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < length; z++) {
        const block = farmLocation.offset(x, 0, z);
        if (block.type === farmland) {
          bot.equip(wheatSeed, 'hand');
          bot.placeBlock(block, wheatSeed);
        }
      }
    }
  }

  // Example commands to trigger the actions (you can customize these)
  bot.on('chat', (username, message) => {
    if (message === 'mine') {
      const block = bot.blockAt(bot.entity.position.offset(1, 0, 0));
      if (block) {
        mineBlock(block);
      }
    } else if (message === 'farm') {
      farmWheat();
    } else if (message === 'house') {
      buildHouse();
    } else if (message === 'farm') {
      buildFarm();
    }
  });
}

createBot(); 

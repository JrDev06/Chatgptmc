const mineflayer = require('mineflayer');
const { Configuration, OpenAIApi } = require('openai');
const express = require('express');

// Setup OpenAI API
const configuration = new Configuration({
  apiKey: sk-proj-Zs2FSTEwshOaw7S1cSbmT3BlbkFJkFsLdugLuOBliFk3NP3z,
});
const openai = new OpenAIApi(configuration);

// Create Minecraft bot
const bot = mineflayer.createBot({
  host: 'RiseSMPMC.aternos.me', // Change this to your Minecraft server address
  port: 46779,       // Change this to your Minecraft server port
  username: 'Botgpt',   // Change this to your bot's username
  offline: true      // Use offline mode
});

bot.on('chat', async (username, message) => {
  if (username === bot.username) return;

  console.log(`Chat received: ${message}`);

  // Interact with GPT-3.5 to process the message
  try {
    const gptResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
    });

    const botResponse = gptResponse.data.choices[0].message.content.trim();
    bot.chat(botResponse);
  } catch (error) {
    console.error('Error interacting with OpenAI:', error);
    bot.chat("Sorry, I couldn't process that request.");
  }
});

bot.on('login', () => {
  console.log('Bot has logged in.');
});

bot.on('error', (err) => {
  console.error('Bot encountered an error:', err);
});

bot.on('end', () => {
  console.log('Bot has ended.');
});

// Create an Express server
const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint to keep the bot alive
app.get('/', (req, res) => {
  res.send('Minecraft bot is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

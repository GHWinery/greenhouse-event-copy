require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const app = express();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.static('public'));

// Load system prompt from file
const systemPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts', 'system-prompt.txt'),
  'utf-8'
);

app.post('/api/generate', async (req, res) => {
  const {
    eventName,
    date,
    time,
    format,
    artistTier,
    cost,
    foodVendor,
    tickets,
    specialNotes,
    artistContact,
    outputsNeeded
  } = req.body;

  // Validate required fields
  if (!eventName || !date || !time) {
    return res.status(400).json({ error: 'Event name, date, and time are required.' });
  }

  // Build the Event Card as the user message
  const eventCard = `
EVENT:          ${eventName}
DATE:           ${date}
TIME:           ${time}
FORMAT:         ${format || 'Evening'}
ARTIST TIER:    ${artistTier || 'Tier 2'}
COST:           ${cost || 'TBD'}
FOOD VENDOR:    ${foodVendor || 'None'}
TICKETS:        ${tickets || 'No cover'}
SPECIAL NOTES:  ${specialNotes || 'None'}
ARTIST CONTACT: ${artistContact || 'On file'}
OUTPUTS NEEDED: ${outputsNeeded || 'All outputs'}
`.trim();

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please generate the full copy package for this event:\n\n${eventCard}` }
      ]
    });

    const copyOutput = response.choices[0].message.content;
    res.json({ copy: copyOutput });

  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: 'Failed to generate copy. Check server logs.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Greenhouse copy generator running on port ${PORT}`);
});

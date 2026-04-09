const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const systemPrompt = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'system-prompt.txt'),
  'utf-8'
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  if (!eventName || !date || !time) {
    return res.status(400).json({ error: 'Event name, date, and time are required.' });
  }

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
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to generate copy. Check server logs.' });
  }
};

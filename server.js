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

// Load band data from spreadsheet export
const bandData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'band-data.json'), 'utf-8')
);

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function findBandInfo(eventName) {
  const input = normalize(eventName);
  // Exact match first
  let match = bandData.find(b => normalize(b.name) === input);
  // Then: input is contained in band name or band name is contained in input
  if (!match) {
    match = bandData.find(b => {
      const bn = normalize(b.name);
      return bn.includes(input) || input.includes(bn);
    });
  }
  // Then: any significant word (4+ chars, not a generic term) from input appears in band name
  if (!match) {
    const stopWords = new Set(['band', 'show', 'music', 'live', 'feat', 'featuring', 'with', 'and', 'the']);
    const words = input.split(' ').filter(w => w.length >= 4 && !stopWords.has(w));
    if (words.length > 0) {
      match = bandData.find(b => {
        const bn = normalize(b.name);
        return words.some(w => bn.includes(w));
      });
    }
  }
  return match || null;
}

function buildBandInsights(band) {
  const lines = [`BAND INSIGHTS (from internal records):`];
  lines.push(`  Tier:             ${band.tier}`);
  if (band.avgRevenue != null) lines.push(`  Avg Revenue:      $${band.avgRevenue.toLocaleString()}`);
  if (band.highestRevenue != null) lines.push(`  Highest Revenue:  $${band.highestRevenue.toLocaleString()}`);
  if (band.members != null) lines.push(`  Members:          ${band.members}`);
  if (band.facebookFollowers != null) lines.push(`  Facebook:         ${band.facebookFollowers.toLocaleString()} followers`);
  if (band.notes) lines.push(`  Notes:            ${band.notes}`);
  if (band.strategy) lines.push(`  Strategy:         ${band.strategy}`);
  if (band.setlistExamples) lines.push(`  Setlist Examples: ${band.setlistExamples}`);
  return lines.join('\n');
}

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

  // Look up band in internal records
  const bandInfo = findBandInfo(eventName);
  if (bandInfo) console.log(`Band matched: "${eventName}" → "${bandInfo.name}" (${bandInfo.tier})`);
  else console.log(`No band match for: "${eventName}"`);
  const bandInsightsBlock = bandInfo ? '\n\n' + buildBandInsights(bandInfo) : '';

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
OUTPUTS NEEDED: ${outputsNeeded || 'All outputs'}${bandInsightsBlock}
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

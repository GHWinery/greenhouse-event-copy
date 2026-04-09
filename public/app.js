const form = document.getElementById('event-form');
const outputSection = document.getElementById('output-section');
const outputBox = document.getElementById('output-box');
const loading = document.getElementById('loading');
const errorBox = document.getElementById('error-box');
const generateBtn = document.getElementById('generate-btn');

const ticketType = document.getElementById('ticketType');
const ticketPriceField = document.getElementById('ticketPriceField');

ticketType.addEventListener('change', () => {
  ticketPriceField.style.display = ticketType.value === 'ticketed' ? 'block' : 'none';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Reset state
  outputSection.style.display = 'none';
  errorBox.style.display = 'none';
  loading.style.display = 'block';
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';

  const formData = {
    eventName:     document.getElementById('eventName').value.trim(),
    date:          document.getElementById('date').value.trim(),
    time:          document.getElementById('time').value.trim(),
    format:        document.getElementById('format').value,
    artistTier:    document.getElementById('artistTier').value,
    cost:          document.getElementById('cost').value.trim(),
    foodVendor:    document.getElementById('foodVendor').value.trim(),
    tickets:       ticketType.value === 'ticketed'
                   ? `Ticketed — ${document.getElementById('ticketPrice').value.trim() || 'price TBD'}`
                   : 'Free RSVP — reserve at greenhousewinery.com/events',
    specialNotes:  document.getElementById('specialNotes').value.trim(),
    artistContact: document.getElementById('artistContact').value.trim(),
    outputsNeeded: document.getElementById('outputsNeeded').value,
  };

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }

    outputBox.textContent = data.copy;
    outputSection.style.display = 'block';
    outputSection.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    errorBox.textContent = `Error: ${err.message}`;
    errorBox.style.display = 'block';
  } finally {
    loading.style.display = 'none';
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Copy Package';
  }
});

function copyAll() {
  navigator.clipboard.writeText(outputBox.textContent).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy All'; }, 2000);
  });
}

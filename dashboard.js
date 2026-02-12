// Global state
let allFeedback = [];
let currentFilter = 'today';

// Sentiment keyword lists (expanded)
const positiveKeywords = [
  'good', 'great', 'excellent', 'delicious', 'awesome', 'amazing', 'best', 'nice', 'love', 'happy', 'impressed', 'perfect', 'clean',
  'wow', 'fantastic', 'tasty', 'fresh', 'friendly', 'helpful', 'fast', 'incredible', 'superb', 'brilliant', 'pleasant', 'fabulous',
  'satisfying', 'well', 'enjoyed', 'smooth', 'top', 'yum', 'yummy', 'lovely', 'neat', 'cool', 'noice', '😋', '👍', '👌', 'lit',
  'dope', 'amazinggg', 'perf', 'ideal', 'sweet', 'awesomeee', 'mithoo', 'ramro', 'majaa', 'ramailo', 'dherai ramro', 'sajilo',
  'comfortable', 'santust', 'santusht', 'thulo ramro', 'mithoo food', 'majaa nai', 'ramro taste', 'ramro service', 'timro kaam ramro',
  'bhalo', 'bholaa', 'ramailo ambience', 'sukhad', 'saaf', 'sabai ramro', 'dherai mithoo', 'best food', 'excellent service'
];
const negativeKeywords = [
  'bad', 'worst', 'slow', 'cold', 'disappoint', 'poor', 'hate', 'dirty', 'unhappy', 'terrible', 'awful', 'problem', 'average',
  'shit', 'meh', 'bland', 'rude', 'overpriced', 'gross', 'stale', 'raw', 'burnt', 'expensive', 'slowww', 'sloww', 'ugh', '😡', '👎',
  'disgusting', 'pathetic', 'annoying', 'unprofessional', 'horrible', 'lousy', 'yuck', 'nasty', 'frustrating', 'mediocre', 'unacceptable',
  'fail', 'khana naramro', 'namitho xi', 'namitho', 'kharaab', 'naramro', 'ramro chaina', 'dherai kharaab', 'dherai slow', 'maja chaina', 'gardaichaina', 'paagal', 'bahula', 'dum',
  'ganda', 'slow service', 'bad food', 'dherai thulo problem', 'kasto ramro chaina', 'ramro xaina', 'sajilo xaina', 'bhayo bhayo',
  'frustrated', 'nafrat', 'afno mann lagena', 'service nai kharaab', 'chaap', 'big problem', 'dhilo', 'samasya', 'unclean', 'avg', 'average',
  'kharab taste', 'ramailo chaina', 'naramro thiyo', 'very bad', 'xi', 'chaina'
];

function preprocess(text) {
  const lower = text.toLowerCase();
  const collapsed = lower.replace(/([a-z])\1{2,}/g, '$1$1');
  return collapsed.replace(/[^\w\s]/g, '');
}

// Normalize feedback for grouping similar messages
function normalizeForGrouping(text) {
  if (!text || !text.trim()) return '';
  
  // Convert to lowercase
  let normalized = text.toLowerCase();
  
  // Remove punctuation
  normalized = normalized.replace(/[^\w\s]/g, ' ');
  
  // Collapse repeated characters (goooood -> good)
  normalized = normalized.replace(/(.)\1{2,}/g, '$1');
  
  // Trim and collapse multiple spaces
  normalized = normalized.trim().replace(/\s+/g, ' ');
  
  return normalized;
}

// Extract semantic keywords for grouping
function extractSemanticKey(text) {
  const normalized = normalizeForGrouping(text);
  if (!normalized) return '';
  
  // Stop words to remove (common words that don't add meaning)
  const stopWords = [
    'the', 'a', 'an', 'is', 'was', 'are', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'very', 'really', 'super', 'so', 'extremely', 'quite', 'pretty',
    'totally', 'absolutely', 'just', 'and', 'or', 'but', 'in', 'on', 'at',
    'to', 'for', 'of', 'from', 'with', 'by', 'as', 'it', 'this', 'that',
    'these', 'those', 'my', 'your', 'his', 'her', 'our', 'their'
  ];
  
  // Combine all sentiment keywords for semantic matching
  const allSentimentWords = [...positiveKeywords, ...negativeKeywords];
  
  // Split into words
  const words = normalized.split(/\s+/);
  
  // Keep words that are:
  // 1. Sentiment words (positive or negative keywords)
  // 2. Not in stop words list
  // 3. Longer than 2 characters (meaningful words)
  const semanticWords = words.filter(word => {
    if (stopWords.includes(word)) return false;
    if (word.length <= 2) return false;
    // Keep if it's a sentiment word or a regular meaningful word
    if (allSentimentWords.some(sw => word.includes(sw) || sw.includes(word))) return true;
    return true;
  });
  
  // Remove duplicates and sort alphabetically for consistency
  const uniqueWords = [...new Set(semanticWords)].sort();
  
  return uniqueWords.join(' ');
}

// Group similar feedback entries by semantic meaning
function groupFeedback(feedbackList) {
  const groups = new Map();
  
  feedbackList.forEach(entry => {
    // Get text from comments or ratings
    let text = '';
    if (entry.comments && entry.comments.trim()) {
      text = entry.comments;
    } else if (entry.ratings) {
      const { food = 0, service = 0, ambiance = 0, cleanliness = 0 } = entry.ratings;
      text = `Food: ${food}/5, Service: ${service}/5, Ambiance: ${ambiance}/5, Cleanliness: ${cleanliness}/5`;
    }
    
    // Extract semantic key for grouping
    const semanticKey = extractSemanticKey(text);
    
    if (!semanticKey) return;
    
    // Group by semantic key
    if (!groups.has(semanticKey)) {
      groups.set(semanticKey, {
        originalText: text, // Keep first original text for display
        semanticKey: semanticKey,
        count: 0,
        entries: [],
        isPositive: isPositive(entry)
      });
    }
    
    const group = groups.get(semanticKey);
    group.count++;
    group.entries.push(entry);
  });
  
  // Convert map to array and sort by count (descending)
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

function analyzeSentiment(text) {
  const processed = preprocess(text);
  
  // Sort keywords by length (longest first) to match more specific phrases first
  const sortedNegative = [...negativeKeywords].sort((a, b) => b.length - a.length);
  const sortedPositive = [...positiveKeywords].sort((a, b) => b.length - a.length);
  
  let pos = 0;
  let neg = 0;
  
  // Track matched regions to avoid double-counting overlapping keywords
  const matchedRegions = [];
  
  // Check negative keywords first (prioritized)
  sortedNegative.forEach(word => {
    let index = processed.indexOf(word);
    while (index !== -1) {
      const wordEnd = index + word.length;
      // Check if this region was already matched
      const alreadyMatched = matchedRegions.some(region => 
        (index >= region.start && index < region.end) || 
        (wordEnd > region.start && wordEnd <= region.end) ||
        (index <= region.start && wordEnd >= region.end)
      );
      if (!alreadyMatched) {
        neg++;
        matchedRegions.push({ start: index, end: wordEnd });
      }
      index = processed.indexOf(word, index + 1);
    }
  });
  
  // Check positive keywords, avoiding already matched regions
  sortedPositive.forEach(word => {
    let index = processed.indexOf(word);
    while (index !== -1) {
      const wordEnd = index + word.length;
      // Check if this region overlaps with already matched regions
      const alreadyMatched = matchedRegions.some(region => 
        (index >= region.start && index < region.end) || 
        (wordEnd > region.start && wordEnd <= region.end) ||
        (index <= region.start && wordEnd >= region.end)
      );
      if (!alreadyMatched) {
        pos++;
        matchedRegions.push({ start: index, end: wordEnd });
      }
      index = processed.indexOf(word, index + 1);
    }
  });
  
  return pos >= neg ? 'positive' : 'negative';
}

// Load feedback from localStorage
function loadFeedback() {
  const stored = localStorage.getItem('feedbackEntries');
  if (stored) {
    try {
      allFeedback = JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing feedback data:', e);
      allFeedback = [];
    }
  } else {
    allFeedback = [];
  }
  renderDashboard();
}

// Timestamp helper (prefers timestamp, falls back to timestampISO)
function getTimestamp(entry) {
  return entry.timestamp || entry.timestampISO;
}

// Filter feedback by date range
function filterByDate(feedback, period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return feedback.filter(entry => {
    const ts = getTimestamp(entry);
    if (!ts) return false;
    const entryDate = new Date(ts);
    const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());

    if (period === 'today') {
      return entryDay.getTime() === today.getTime();
    }
    if (period === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return entryDay >= weekAgo;
    }
    if (period === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return entryDay >= monthAgo;
    }
    return true;
  });
}

// Average of a rating field using ratings object
function calculateAverage(feedback, field) {
  const values = feedback
    .map(entry => (entry.ratings ? entry.ratings[field] : undefined))
    .filter(v => typeof v === 'number');
  if (!values.length) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return (sum / values.length).toFixed(1);
}

// Determine positivity with combined rating + sentiment
function isPositive(entry) {
  // Sentiment analysis takes absolute priority over ratings
  if (entry.comments && entry.comments.trim()) {
    const sentiment = analyzeSentiment(entry.comments);
    return sentiment === 'positive';
  }

  // Only use ratings if no comments provided
  let avg = null;
  if (entry.ratings) {
    const { food = 0, service = 0, ambiance = 0, cleanliness = 0 } = entry.ratings;
    avg = (food + service + ambiance + cleanliness) / 4;
  }

  if (Number.isFinite(avg)) return avg >= 3;
  return false;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function createFeedbackCard(entry, isPos) {
  const card = document.createElement('div');
  card.className = 'feedback-card';

  const feedbackType = isPos ? 'positive' : 'negative';
  const feedbackLabel = isPos ? 'Positive' : 'Negative';

  let text = '';
  if (entry.comments && entry.comments.trim()) {
    text = entry.comments;
  } else if (entry.ratings) {
    const { food = 0, service = 0, ambiance = 0, cleanliness = 0 } = entry.ratings;
    text = `Food: ${food}/5, Service: ${service}/5, Ambiance: ${ambiance}/5, Cleanliness: ${cleanliness}/5`;
  } else {
    text = 'No rating information available';
  }

  const ts = getTimestamp(entry);

  card.innerHTML = `
    <div class="feedback-header">
      <p class="feedback-text">${text}</p>
      <span class="feedback-badge-tag ${feedbackType}">${feedbackLabel}</span>
    </div>
    <p class="feedback-date">${ts ? formatDate(ts) : 'N/A'}</p>
  `;

  return card;
}

// Render dashboard UI
function renderDashboard() {
  const filteredFeedback = filterByDate(allFeedback, currentFilter);

  // Stats
  document.getElementById('totalFeedback').textContent = filteredFeedback.length;
  document.getElementById('avgFood').textContent = calculateAverage(filteredFeedback, 'food');
  document.getElementById('avgService').textContent = calculateAverage(filteredFeedback, 'service');
  document.getElementById('avgAmbiance').textContent = calculateAverage(filteredFeedback, 'ambiance');
  document.getElementById('avgCleanliness').textContent = calculateAverage(filteredFeedback, 'cleanliness');

  // Buckets
  const positiveFeedback = filteredFeedback.filter(entry => isPositive(entry));
  const negativeFeedback = filteredFeedback.filter(entry => !isPositive(entry));

  document.getElementById('posCount').textContent = `${positiveFeedback.length} items`;
  document.getElementById('negCount').textContent = `${negativeFeedback.length} items`;

  const posContainer = document.getElementById('positiveFeedback');
  posContainer.innerHTML = '';
  if (!positiveFeedback.length) {
    posContainer.innerHTML = '<p style="color: #6b6b6b; padding: 1rem;">No positive feedback for this period.</p>';
  } else {
    positiveFeedback.forEach(entry => posContainer.appendChild(createFeedbackCard(entry, true)));
  }

  const negContainer = document.getElementById('negativeFeedback');
  negContainer.innerHTML = '';
  if (!negativeFeedback.length) {
    negContainer.innerHTML = '<p style="color: #6b6b6b; padding: 1rem;">No negative feedback for this period.</p>';
  } else {
    negativeFeedback.forEach(entry => negContainer.appendChild(createFeedbackCard(entry, false)));
  }
}

// UI filter handler
function setFilter(button, period) {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  currentFilter = period;
  renderDashboard();
}

// Boot
window.addEventListener('DOMContentLoaded', loadFeedback);

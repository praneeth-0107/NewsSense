const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

// Load environment variables from root .env file if it exists (for local development)
try {
  const fs = require('fs');
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove quotes if present
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.substring(1, value.length - 1);
        } else if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value.trim();
        }
      }
    });
  }
} catch (e) {
  console.log('No local .env file loaded:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, '../dist')));

// Register API
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Default categories
  const preferredCategories = JSON.stringify(['Business', 'Technology']);

  const sql = `INSERT INTO users (username, password, preferredCategories) VALUES (?, ?, ?)`;
  db.run(sql, [username, password, preferredCategories], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.status(201).json({
      id: this.lastID,
      username,
      preferredCategories: JSON.parse(preferredCategories)
    });
  });
});

// Login API
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
  db.get(sql, [username, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      id: row.id,
      username: row.username,
      preferredCategories: JSON.parse(row.preferredCategories)
    });
  });
});

// Update Profile preferences
app.put('/api/auth/preferences', (req, res) => {
  const { username, categories } = req.body;
  
  if (!username || !categories) {
    return res.status(400).json({ error: 'Username and categories required' });
  }

  const sql = `UPDATE users SET preferredCategories = ? WHERE username = ?`;
  db.run(sql, [JSON.stringify(categories), username], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
});

// Update Profile username
app.put('/api/auth/profile', (req, res) => {
  const { oldUsername, newUsername } = req.body;
  
  if (!oldUsername || !newUsername) {
    return res.status(400).json({ error: 'Usernames required' });
  }

  const sql = `UPDATE users SET username = ? WHERE username = ?`;
  db.run(sql, [newUsername, oldUsername], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
});

// News API Proxy - Top Headlines
app.get('/api/news/top-headlines', async (req, res) => {
  try {
    const apiKey = process.env.NEWSAPI_KEY || process.env.VITE_NEWSAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'News API key not configured on server' });
    }

    const { country = 'us', category, pageSize = 12, page = 1 } = req.query;
    
    const queryParams = new URLSearchParams({
      country,
      pageSize,
      page,
    });
    if (category) {
      queryParams.append('category', category);
    }

    const url = `https://newsapi.org/v2/top-headlines?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching headlines:', error);
    res.status(500).json({ error: 'Failed to fetch news from News API' });
  }
});

// News API Proxy - Everything
app.get('/api/news/everything', async (req, res) => {
  try {
    const apiKey = process.env.NEWSAPI_KEY || process.env.VITE_NEWSAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'News API key not configured on server' });
    }

    const { q, sources, sortBy = 'publishedAt', language = 'en', pageSize = 12, page = 1 } = req.query;
    
    if (!q && !sources) {
      return res.status(400).json({ error: 'Query parameter "q" or "sources" is required' });
    }

    const queryParams = new URLSearchParams({
      sortBy,
      language,
      pageSize,
      page,
    });
    if (q) queryParams.append('q', q);
    if (sources) queryParams.append('sources', sources);

    const url = `https://newsapi.org/v2/everything?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching search results:', error);
    res.status(500).json({ error: 'Failed to fetch news from News API' });
  }
});

// Groq AI Proxy - Summarize
app.post('/api/news/summarize', async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Groq API key not configured on server' });
    }

    const { article } = req.body;
    if (!article) {
      return res.status(400).json({ error: 'Article content is required' });
    }

    const prompt = `Summarize the following news article in exactly 3 bullet points. Focus on business or industry insight. Be concise. Do NOT include any introductory text, heading, or preamble — start directly with the first bullet point.\n\nArticle title: ${article.title}\nDescription: ${article.description ?? 'N/A'}\nContent: ${article.content ?? 'N/A'}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 250,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (error) {
    console.error('Error summarizing article:', error);
    res.status(500).json({ error: 'Failed to summarize article' });
  }
});

// Anything that doesn't match an API route, send back the index.html file
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

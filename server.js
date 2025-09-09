require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// --- Mongoose ---
mongoose.connect(process.env.MONGO_URI, {
  autoIndex: true,
}).then(()=>console.log('Mongo connected')).catch(console.error);

// --- Models ---
const OptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: { type: Number, default: 0 }
}, { _id: true });

const PollSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  options: { type: [OptionSchema], validate: v => v.length >= 2 },
  multipleChoice: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  closesAt: { type: Date }
});

const Poll = mongoose.model('Poll', PollSchema);

// --- Routes ---
app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/polls', async (req, res) => {
  try {
    let { question, options, multipleChoice, closesAt } = req.body;

    // Basic shape checks
    if (typeof question !== 'string') question = '';
    if (!Array.isArray(options)) options = [];

    // Normalize + validate options
    const normOptions = options
      .map(o => (typeof o === 'string' ? o : (o?.text ?? '')))
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (question.trim().length < 5) {
      return res.status(400).json({ error: 'Question must be at least 5 characters.' });
    }
    if (normOptions.length < 2) {
      return res.status(400).json({ error: 'Provide at least 2 non-empty options.' });
    }

    // Build doc
    const poll = await Poll.create({
      question: question.trim(),
      options: normOptions.map(text => ({ text })), // Mongoose will add votes:0
      multipleChoice: !!multipleChoice,
      closesAt: closesAt ? new Date(closesAt) : undefined
    });

    return res.status(201).json(poll);
  } catch (e) {
    // Log on server, send readable message to client
    console.error('Create poll failed:', e?.message, e);
    if (e?.name === 'ValidationError') {
      return res.status(400).json({ error: e.message });
    }
    return res.status(500).json({ error: 'Server error while creating poll.' });
  }
});


app.get('/api/polls', async (req, res) => {
  const q = req.query.q?.trim();
  const filter = q ? { question: { $regex: q, $options: 'i' } } : {};
  const polls = await Poll.find(filter).sort({ createdAt: -1 });
  res.json(polls);
});

app.get('/api/polls/:id', async (req, res) => {
  const poll = await Poll.findById(req.params.id);
  if (!poll) return res.status(404).json({ error: 'Not found' });
  res.json(poll);
});

app.patch('/api/polls/:id/vote', async (req, res) => {
  const { optionIds } = req.body; // array of _id strings
  if (!Array.isArray(optionIds) || optionIds.length < 1) {
    return res.status(400).json({ error: 'optionIds array required' });
  }
  const poll = await Poll.findById(req.params.id);
  if (!poll) return res.status(404).json({ error: 'Not found' });
  if (poll.closesAt && new Date() > poll.closesAt) {
    return res.status(400).json({ error: 'Poll closed' });
  }
  if (!poll.multipleChoice && optionIds.length > 1) {
    return res.status(400).json({ error: 'Multiple selections not allowed' });
  }
  const optSet = new Set(optionIds);
  poll.options = poll.options.map(o => ({
    ...o.toObject(),
    votes: optSet.has(String(o._id)) ? o.votes + 1 : o.votes
  }));
  await poll.save();
  res.json(poll);
});

// (optional) update & delete endpoints could be added similarly.

const PORT = process.env.PORT || 4000;

// Global error handler (fallback)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Unexpected server error.' });
});



// For Swagger
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Poll App API',
    version: '1.0.0',
    description: 'Endpoints for creating polls, listing, getting details, and voting.',
  },
  servers: [{ url: 'http://localhost:4000/api', description: 'Local API' }],
  components: {
    schemas: {
      Option: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          text: { type: 'string' },
          votes: { type: 'integer', default: 0 },
        },
        required: ['text'],
      },
      Poll: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          question: { type: 'string' },
          options: { type: 'array', items: { $ref: '#/components/schemas/Option' } },
          multipleChoice: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          closesAt: { type: 'string', format: 'date-time', nullable: true },
        },
        required: ['question', 'options'],
      },
      VoteRequest: {
        type: 'object',
        properties: {
          optionIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
        },
        required: ['optionIds'],
      },
    },
  },
  paths: {
    '/polls': {
      get: {
        summary: 'List polls',
        tags: ['Polls'],
        responses: {
          200: {
            description: 'Array of polls',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Poll' } } } },
          },
        },
      },
      post: {
        summary: 'Create a new poll',
        tags: ['Polls'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  question: { type: 'string', example: 'Your favorite JS framework?' },
                  multipleChoice: { type: 'boolean', example: false },
                  closesAt: { type: 'string', format: 'date-time', nullable: true },
                  options: { type: 'array', items: { type: 'string', example: 'Angular' }, minItems: 2 },
                },
                required: ['question', 'options'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Poll' } } } },
          400: { description: 'Validation error' },
        },
      },
    },
    '/polls/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        summary: 'Get a poll by id',
        tags: ['Polls'],
        responses: {
          200: { description: 'Poll', content: { 'application/json': { schema: { $ref: '#/components/schemas/Poll' } } } },
          404: { description: 'Not found' },
        },
      },
    },
    '/polls/{id}/vote': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      patch: {
        summary: 'Vote on a poll',
        tags: ['Polls'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VoteRequest' } } },
        },
        responses: {
          200: { description: 'Updated poll', content: { 'application/json': { schema: { $ref: '#/components/schemas/Poll' } } } },
          400: { description: 'Bad request / poll closed' },
          404: { description: 'Not found' },
        },
      },
    },
  },
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
// Optional: raw JSON at /api-docs.json
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
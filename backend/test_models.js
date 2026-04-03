const axios = require('axios');
const key = process.env.GEMINI_API_KEY;
axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
  .then(res => console.log(res.data.models.map(m=>m.name).join('\n')))
  .catch(err => console.log(err.response?.data || err.message));

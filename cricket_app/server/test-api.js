const http = require('http');

const data = JSON.stringify({
  match_id: 58,
  current_innings_id: 91,
  next_batting_team: 'Raj11',
  target_score: 91
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/innings/end',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-scorer-password': 'scorer123'
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});
req.write(data);
req.end();

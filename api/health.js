module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    service: 'ai-commit-writer',
    version: '1.0.0',
    powered_by: 'Xiaomi MiMo',
    timestamp: new Date().toISOString(),
  });
};

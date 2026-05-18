
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyZ6Cdjn2WPM82EOrEZGUPrLXtE9Mt6UrfxrZPQngCiRB-4I6ewgsW7cRBxOONeugcv/exec';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const response = await fetch(SCRIPT_URL);
    if (!response.ok) throw new Error('Failed to fetch data');
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      tip: "تأكد من أن الرابط يعمل بشكل صحيح"
    });
  }
};

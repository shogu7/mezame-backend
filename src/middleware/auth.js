const jwt = require('jsonwebtoken');
// token password to decrypt the jwt token of the user
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

module.exports = function (req, res, next) {
  const auth = req.headers.authorization;
  // scrap token to the client of the user
  if (!auth) return res.status(401).json({ ok:false, message:'No token' });

  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // verify if the token is correct
    req.user = payload; // {
    next();
  } catch {
    res.status(401).json({ ok:false, message:'Invalid token' });
  }
};
